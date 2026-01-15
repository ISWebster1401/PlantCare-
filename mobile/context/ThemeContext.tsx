/**
 * Context de tema (Dark/Light mode) para PlantCare Mobile
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'dark' | 'light' | 'system';

interface Colors {
  // Backgrounds
  background: string;
  surface: string;
  surfaceSecondary: string;
  
  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // Borders
  border: string;
  borderLight: string;
  
  // Accents
  primary: string;
  primaryDark: string;
  error: string;
  warning: string;
  
  // Icons
  icon: string;
  iconSecondary: string;
}

interface Theme {
  mode: 'dark' | 'light';
  colors: Colors;
}

const darkColors: Colors = {
  background: '#0a1929',
  surface: '#1e293b',
  surfaceSecondary: '#334155',
  
  text: '#ffffff',
  textSecondary: '#cbd5e1',
  textTertiary: '#94a3b8',
  
  border: '#334155',
  borderLight: '#475569',
  
  primary: '#4caf50',
  primaryDark: '#388e3c',
  error: '#f44336',
  warning: '#ff9800',
  
  icon: '#ffffff',
  iconSecondary: '#64748b',
};

const lightColors: Colors = {
  background: '#ffffff',
  surface: '#f8fafc',
  surfaceSecondary: '#e2e8f0',
  
  text: '#0f172a',
  textSecondary: '#334155',
  textTertiary: '#64748b',
  
  border: '#e2e8f0',
  borderLight: '#cbd5e1',
  
  primary: '#4caf50',
  primaryDark: '#388e3c',
  error: '#f44336',
  warning: '#ff9800',
  
  icon: '#0f172a',
  iconSecondary: '#64748b',
};

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = 'theme_mode';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [isLoading, setIsLoading] = useState(true);

  // Determinar el tema actual basado en el modo
  const getCurrentTheme = (): 'dark' | 'light' => {
    if (themeMode === 'system') {
      return systemColorScheme === 'light' ? 'light' : 'dark';
    }
    return themeMode;
  };

  const currentThemeMode = getCurrentTheme();
  const theme: Theme = {
    mode: currentThemeMode,
    colors: currentThemeMode === 'light' ? lightColors : darkColors,
  };

  // Cargar tema guardado al iniciar
  useEffect(() => {
    loadTheme();
  }, []);

  // Actualizar tema cuando cambia el sistema
  useEffect(() => {
    if (themeMode === 'system') {
      // Forzar re-render cuando cambia el sistema
      setThemeModeState('system');
    }
  }, [systemColorScheme]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system')) {
        setThemeModeState(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.error('Error cargando tema:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Error guardando tema:', error);
    }
  };

  const toggleTheme = async () => {
    const newMode = currentThemeMode === 'dark' ? 'light' : 'dark';
    await setThemeMode(newMode);
  };

  // No renderizar hasta cargar el tema
  if (isLoading) {
    return null;
  }

  const value: ThemeContextType = {
    theme,
    themeMode,
    setThemeMode,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
