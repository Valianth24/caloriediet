import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, ThemeName } from '../constants/Themes';

interface ThemeContextType {
  currentTheme: ThemeName;
  colors: typeof themes.default;
  setTheme: (theme: ThemeName) => void;
  isPremium: boolean;
  setIsPremium: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('default');
  const [isPremium, setIsPremiumState] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [savedTheme, savedPremium] = await Promise.all([
          AsyncStorage.getItem('app_theme'),
          AsyncStorage.getItem('is_premium'),
        ]);

        if (savedTheme && themes[savedTheme as ThemeName]) {
          setCurrentTheme(savedTheme as ThemeName);
        }
        if (savedPremium === 'true') {
          setIsPremiumState(true);
        }
      } catch (error) {
        console.error('Theme load error:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  const setIsPremium = useCallback((val: boolean) => {
    setIsPremiumState(val);
    AsyncStorage.setItem('is_premium', val ? 'true' : 'false').catch(console.error);
  }, []);

  const setTheme = useCallback((theme: ThemeName) => {
    if (!themes[theme]) return;
    setCurrentTheme(theme);
    AsyncStorage.setItem('app_theme', theme).catch(console.error);
  }, []);

  const colors = useMemo(() => themes[currentTheme], [currentTheme]);

  const contextValue = useMemo(() => ({
    currentTheme,
    colors,
    setTheme,
    isPremium,
    setIsPremium,
  }), [currentTheme, colors, setTheme, isPremium, setIsPremium]);

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
