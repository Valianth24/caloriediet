import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend URL configuration with fallbacks
const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
  || process.env.EXPO_PUBLIC_BACKEND_URL 
  || '';

const API_URL = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

// Callback for handling auth failures (set by AuthContext)
let onAuthFailure: (() => void) | null = null;

export const setOnAuthFailure = (callback: () => void) => {
  onAuthFailure = callback;
};

// Debug: Log API configuration on load
if (__DEV__) {
  console.log('[API] Backend URL:', BACKEND_URL || '(using relative /api)');
  console.log('[API] Full API URL:', API_URL);
  
  // Warning if no backend URL configured in development
  if (!BACKEND_URL) {
    console.warn('[API] ⚠️ No EXPO_PUBLIC_BACKEND_URL configured. API calls may fail on mobile devices.');
    console.warn('[API] Set EXPO_PUBLIC_BACKEND_URL in your .env file or app.config.js');
  }
}

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (__DEV__) {
    console.log('[API] Auth token set:', token ? `${token.substring(0, 20)}...` : 'null');
  }
};

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

// Enhanced fetch wrapper with detailed logging
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const startTime = Date.now();
  
  // Default headers
  const headers = {
    ...getHeaders(),
    ...options.headers,
  };
  
  const config: RequestInit = {
    ...options,
    headers,
  };

  if (__DEV__) {
    console.log(`[API] ${options.method || 'GET'} ${endpoint}`);
  }

  try {
    const response = await fetch(url, config);
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      // Try to get error details
      let errorBody = '';
      try {
        const errorData = await response.text();
        errorBody = errorData.substring(0, 2048); // Max 2KB
      } catch {
        errorBody = 'Could not read error body';
      }
      
      console.error(`[API ERROR] ${options.method || 'GET'} ${endpoint}`);
      console.error(`  Status: ${response.status} ${response.statusText}`);
      console.error(`  Duration: ${duration}ms`);
      console.error(`  Body: ${errorBody}`);
      
      // Specific error messages
      if (response.status === 401) {
        // Clear local token on 401
        console.log('[API] 401 - Clearing auth token and triggering logout');
        authToken = null;
        AsyncStorage.removeItem('session_token').catch(() => {});
        if (onAuthFailure) {
          onAuthFailure();
        }
        throw new Error('Session expired - please login again');
      } else if (response.status === 403) {
        throw new Error('Access denied');
      } else if (response.status === 404) {
        throw new Error(`Endpoint not found: ${endpoint}`);
      } else if (response.status >= 500) {
        throw new Error(`Server error (${response.status})`);
      }
      
      // Try to parse JSON error
      try {
        const errorJson = JSON.parse(errorBody);
        throw new Error(errorJson.detail || errorJson.message || `Request failed: ${response.status}`);
      } catch (parseError) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    
    if (__DEV__) {
      console.log(`[API] ✓ ${endpoint} (${duration}ms)`);
    }
    
    return data;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Network error
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error(`[API NETWORK ERROR] ${endpoint}`);
      console.error(`  Duration: ${duration}ms`);
      console.error(`  Message: ${error.message}`);
      throw new Error('Network error - check your connection');
    }
    
    // Re-throw if already processed
    if (error.message && !error.message.includes('fetch')) {
      throw error;
    }
    
    console.error(`[API ERROR] ${endpoint}:`, error);
    throw error;
  }
}

// Auth
export const exchangeSession = async (sessionId: string) => {
  const response = await fetch(`${API_URL}/auth/session`, {
    method: 'POST',
    headers: {
      'X-Session-ID': sessionId,
    },
  });
  if (!response.ok) {
    const error = await response.text();
    console.error('[API] exchangeSession failed:', error);
    throw new Error('Failed to exchange session');
  }
  return response.json();
};

export const getMe = async () => {
  return apiRequest('/auth/me');
};

export const logout = async () => {
  return apiRequest('/auth/logout', { method: 'POST' });
};

export const registerUser = async (email: string, password: string, name: string) => {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
};

export const loginUser = async (email: string, password: string) => {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const guestLogin = async () => {
  return apiRequest('/auth/guest', { method: 'POST' });
};

export const updateProfile = async (profileData: any) => {
  return apiRequest('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

export const updateGoals = async (goals: any) => {
  return apiRequest('/user/goals', {
    method: 'PUT',
    body: JSON.stringify(goals),
  });
};

// Food
export const analyzeFood = async (imageBase64: string) => {
  return apiRequest('/food/analyze', {
    method: 'POST',
    body: JSON.stringify({ image_base64: imageBase64 }),
  });
};

export const addMeal = async (mealData: any) => {
  return apiRequest('/food/add-meal', {
    method: 'POST',
    body: JSON.stringify(mealData),
  });
};

export const getTodayMeals = async () => {
  return apiRequest('/food/today');
};

export const getDailySummary = async () => {
  return apiRequest('/food/daily-summary');
};

export const getFoodDatabase = async (lang: string = 'tr') => {
  return apiRequest(`/food/database?lang=${lang}`);
};

// Water
export const addWater = async (amount: number) => {
  return apiRequest('/water/add', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
};

export const getTodayWater = async () => {
  return apiRequest('/water/today');
};

export const getWeeklyWater = async () => {
  return apiRequest('/water/weekly');
};

// Steps
export const syncSteps = async (steps: number, source: string) => {
  return apiRequest('/steps/sync', {
    method: 'POST',
    body: JSON.stringify({ steps, source }),
  });
};

export const getTodaySteps = async () => {
  return apiRequest('/steps/today');
};

export const addManualSteps = async (steps: number) => {
  return apiRequest('/steps/manual', {
    method: 'POST',
    body: JSON.stringify({ steps }),
  });
};

// Vitamins
export const getVitaminTemplates = async () => {
  return apiRequest('/vitamins/templates');
};

export const getUserVitamins = async () => {
  return apiRequest('/vitamins/user');
};

export const addVitamin = async (name: string, time: string) => {
  return apiRequest('/vitamins/add', {
    method: 'POST',
    body: JSON.stringify({ name, time }),
  });
};

export const toggleVitamin = async (vitaminId: string) => {
  return apiRequest('/vitamins/toggle', {
    method: 'PUT',
    body: JSON.stringify({ vitamin_id: vitaminId }),
  });
};

export const deleteVitamin = async (vitaminId: string) => {
  return apiRequest(`/vitamins/${vitaminId}`, {
    method: 'DELETE',
  });
};

export const getTodayVitamins = async () => {
  return apiRequest('/vitamins/today');
};

// Premium
export const activatePremium = async () => {
  return apiRequest('/premium/activate', { method: 'POST' });
};

export const getPremiumStatus = async () => {
  return apiRequest('/premium/status');
};

// Ads
export const watchAd = async (adCount: number = 1) => {
  return apiRequest('/ads/watch', {
    method: 'POST',
    body: JSON.stringify({ ad_count: adCount }),
  });
};
