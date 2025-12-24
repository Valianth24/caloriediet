import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { exchangeSession, getMe, logout as apiLogout, setAuthToken, guestLogin } from '../utils/api';
import { useStore } from '../store/useStore';

// CRITICAL: This must be called at module level for OAuth redirect to work
// It checks if the current URL is an OAuth callback and completes the session
WebBrowser.maybeCompleteAuthSession();

// Warm up browser for faster OAuth (Android optimization)
if (Platform.OS === 'android') {
  WebBrowser.warmUpAsync();
}

// Configuration from environment
const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

// OAuth configuration - use our own backend for OAuth
// This points to /auth/v1/env/oauth/redirect endpoint on our backend
const OAUTH_REDIRECT_URL = `${BACKEND_URL}/auth/v1/env/oauth/redirect`;
const APP_SCHEME = 'caloriediet';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  login: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  needsOnboarding: boolean;
  setUser: (user: any) => void;
  setNeedsOnboarding: (needs: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  login: async () => {},
  loginAsGuest: async () => {},
  logout: async () => {},
  needsOnboarding: false,
  setUser: () => {},
  setNeedsOnboarding: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const { user, setUser, resetStore } = useStore();

  // Check existing session on mount
  const checkExistingSession = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (token) {
        setAuthToken(token);
        const userData = await getMe() as any;
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
          
          // Check if needs onboarding
          if (!userData.height || !userData.weight || !userData.age || !userData.gender) {
            setNeedsOnboarding(true);
          } else {
            setNeedsOnboarding(false);
          }
        }
      }
      // No token = show login screen (don't auto guest login)
    } catch (error) {
      console.error('Error checking session:', error);
      await AsyncStorage.removeItem('session_token');
      setAuthToken(null);
      // Show login screen on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkExistingSession();
    
    // Handle deep links (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleAuthRedirect(url);
      }
    });
    
    // Handle deep links (hot link)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleAuthRedirect(url);
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  const handleAuthRedirect = async (url: string) => {
    try {
      console.log('[Auth] Handling redirect URL:', url);
      
      // Check for error first
      if (url.includes('error=') || url.includes('detail')) {
        console.log('[Auth] Auth error detected in URL');
        const errorMatch = url.match(/error=([^&]*)/);
        if (errorMatch) {
          Alert.alert('Giriş Hatası', decodeURIComponent(errorMatch[1]));
        }
        return;
      }
      
      // Parse session_id from URL - check multiple formats
      let sessionId = null;
      
      // Try hash first (#session_id=...)
      if (url.includes('#session_id=')) {
        sessionId = url.split('#session_id=')[1].split('&')[0];
      }
      // Try query param (?session_id=...)
      else if (url.includes('session_id=')) {
        const match = url.match(/session_id=([^&\#]*)/);
        if (match) {
          sessionId = match[1];
        }
      }
      
      console.log('[Auth] Extracted session_id:', sessionId ? sessionId.substring(0, 10) + '...' : 'null');
      
      if (sessionId) {
        // Skip if already authenticated (avoid duplicate processing)
        if (isAuthenticated) {
          console.log('[Auth] Already authenticated, skipping duplicate redirect');
          return;
        }
        
        setIsLoading(true);
        
        try {
          // Exchange session_id for session_token
          console.log('[Auth] Exchanging session_id for token...');
          const response = await exchangeSession(sessionId) as any;
          const token = response?.session_token;
          
          if (!token) {
            throw new Error('No session token received');
          }
          
          console.log('[Auth] Token received, storing...');
          
          // Store token
          await AsyncStorage.setItem('session_token', token);
          setAuthToken(token);
          
          // Get user data
          console.log('[Auth] Fetching user data...');
          const userData = await getMe() as any;
          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
            
            console.log('[Auth] Login successful for:', userData.email || 'unknown');
            
            // Check onboarding
            if (!userData.height || !userData.weight || !userData.age || !userData.gender) {
              setNeedsOnboarding(true);
              console.log('[Auth] User needs onboarding');
            } else {
              setNeedsOnboarding(false);
              console.log('[Auth] User onboarding complete');
            }
          }
        } catch (exchangeError: any) {
          console.error('[Auth] Session exchange failed:', exchangeError);
          // Don't show error if we're already authenticated (duplicate callback)
          if (!isAuthenticated) {
            // Silent fail - user might still be logged in from previous attempt
            console.log('[Auth] Exchange failed but may have succeeded earlier');
          }
        }
        
        setIsLoading(false);
      } else {
        console.log('[Auth] No session_id found in URL');
      }
    } catch (error) {
      console.error('[Auth] Error handling auth redirect:', error);
      setIsLoading(false);
    }
  };

  // Google Login using expo-auth-session for proper redirect handling
  const login = async () => {
    try {
      // Create redirect URL using AuthSession for proper deep linking
      let redirectUrl: string;
      
      if (Platform.OS === 'web') {
        // For web, use current origin
        redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth` : '';
      } else {
        // For mobile (Android/iOS), use AuthSession.makeRedirectUri
        // This generates the correct URL format for the platform
        redirectUrl = AuthSession.makeRedirectUri({
          scheme: APP_SCHEME,
          path: 'auth',
        });
        
        // Fallback to manual construction if AuthSession fails
        if (!redirectUrl || redirectUrl.includes('localhost')) {
          redirectUrl = `${APP_SCHEME}://auth`;
        }
      }
      
      console.log('[Auth] Platform:', Platform.OS);
      console.log('[Auth] Redirect URL:', redirectUrl);
      
      // Build auth URL with redirect_uri parameter
      const authUrl = `${OAUTH_REDIRECT_URL}?redirect_url=${encodeURIComponent(redirectUrl)}`;
      
      console.log('[Auth] Full Auth URL:', authUrl);
      
      if (Platform.OS === 'web') {
        // For web, simple redirect
        window.location.href = authUrl;
      } else {
        // For Android and iOS - use openAuthSessionAsync
        console.log('[Auth] Opening browser for OAuth...');
        
        // Dismiss any existing browser session first
        try {
          await WebBrowser.dismissBrowser();
        } catch (e) {
          // Ignore errors from dismissBrowser
        }
        
        const result = await WebBrowser.openAuthSessionAsync(
          authUrl,
          redirectUrl,
          {
            // Show in recents so user can switch back if needed
            showInRecents: true,
            // Don't use ephemeral session - allows Google to remember the user
            preferEphemeralSession: false,
          }
        );
        
        console.log('[Auth] Browser result type:', result.type);
        
        if (result.type === 'success' && result.url) {
          console.log('[Auth] Success URL received:', result.url);
          await handleAuthRedirect(result.url);
        } else if (result.type === 'cancel') {
          console.log('[Auth] User cancelled login');
        } else if (result.type === 'dismiss') {
          console.log('[Auth] Browser dismissed without completing');
        }
      }
    } catch (error: any) {
      console.error('[Auth] Error during login:', error);
      Alert.alert(
        'Giriş Hatası', 
        `Giriş yapılırken bir hata oluştu: ${error?.message || 'Bilinmeyen hata'}. Lütfen tekrar deneyin.`
      );
    }
  };

  // Guest Login
  const loginAsGuest = async () => {
    try {
      setIsLoading(true);
      const response = await guestLogin() as any;
      
      if (response && response.session_token) {
        await AsyncStorage.setItem('session_token', response.session_token);
        setAuthToken(response.session_token);
        
        // Set user data
        setUser({
          user_id: response.user_id || '',
          email: response.email || '',
          name: response.name || '',
          picture: response.picture || null,
        });
        
        setIsAuthenticated(true);
        setNeedsOnboarding(true); // Guests should go through onboarding
      }
    } catch (error) {
      console.error('Error during guest login:', error);
      Alert.alert('Hata', 'Misafir girişi yapılamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    console.log('[Auth] Logout initiated');
    try {
      // Call backend logout (don't wait for it)
      apiLogout().catch((err) => console.log('[Auth] Backend logout error (ignored):', err));
    } catch (error) {
      console.error('[Auth] Error during logout API call:', error);
    }
    
    // Always clear local session immediately
    try {
      await AsyncStorage.multiRemove([
        'session_token',
        'app_theme',
        'is_premium',
        'user_data',
        'first_launch'
      ]);
      console.log('[Auth] AsyncStorage cleared');
    } catch (storageError) {
      console.error('[Auth] AsyncStorage clear error:', storageError);
    }
    
    // Clear auth token
    setAuthToken(null);
    
    // Reset entire Zustand store
    resetStore();
    
    // Update state - This will trigger navigation to login
    setIsAuthenticated(false);
    setNeedsOnboarding(false);
    
    console.log('[Auth] Logout complete, isAuthenticated:', false);
    
    // Force reload on web to ensure clean state
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const handleSetUser = (userData: any) => {
    setUser(userData);
    if (userData) {
      setIsAuthenticated(true);
      if (!userData.height || !userData.weight || !userData.age || !userData.gender) {
        setNeedsOnboarding(true);
      } else {
        setNeedsOnboarding(false);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        loginAsGuest,
        logout,
        needsOnboarding,
        setUser: handleSetUser,
        setNeedsOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
