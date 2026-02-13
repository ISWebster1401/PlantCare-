/**
 * Context de tema (Dark/Light/System) para PlantCare Mobile
 * Integrado con DesignSystem (LightColors, DarkColors, Gradients)
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import type { ThemeColors, ThemeGradients } from '../constants/DesignSystem';
import { LightColors, DarkColors, Gradients, DarkGradients } from '../constants/DesignSystem';

export type ThemeMode = 'dark' | 'light' | 'system';

export interface Theme {
  mode: 'dark' | 'light';
  colors: ThemeColors;
  gradients: ThemeGradients;
}

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

/** Hook para obtener colores del tema actual (Design System completo) */
export const useThemeColors = (): ThemeColors => {
  const { theme } = useTheme();
  return theme.colors;
};

/** Hook para obtener gradientes del tema actual */
export const useThemeGradients = (): ThemeGradients => {
  const { theme } = useTheme();
  return theme.gradients;
};

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = 'theme_mode';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  const getCurrentTheme = (): 'dark' | 'light' => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  };

  const currentThemeMode = getCurrentTheme();
  const theme: Theme = {
    mode: currentThemeMode,
    colors: currentThemeMode === 'light' ? LightColors : DarkColors,
    gradients: currentThemeMode === 'light' ? Gradients : DarkGradients,
  };

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    if (themeMode === 'system') {
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

  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
