/**
 * 🌱 PlantCare Design System
 * Estilo Duolingo/Pokémon para niños
 * 
 * Sistema de diseño completo con paleta de colores, tipografía,
 * espaciado, animaciones y estados de plantas.
 */

import { ViewStyle } from 'react-native';

// ============================================
// PALETA DE COLORES
// ============================================
export const Colors = {
  // Primarios
  primary: '#4CAF50',        // Verde principal
  primaryLight: '#81C784',  // Verde claro
  primaryDark: '#388E3C',   // Verde oscuro
  
  // Fondos
  background: '#1A2634',     // Fondo principal oscuro
  backgroundLight: '#243447', // Cards y superficies
  backgroundLighter: '#2D4258', // Elementos elevados
  
  // Acentos
  accent: '#FFB74D',         // Naranja cálido (recompensas)
  accentLight: '#FFCC80',    // Naranja claro
  secondary: '#64B5F6',      // Azul agua
  
  // Estados de planta
  healthy: '#4CAF50',        // Saludable
  warning: '#FFB74D',        // Necesita atención
  critical: '#EF5350',       // Crítico
  
  // UI
  text: '#FFFFFF',
  textSecondary: '#B0BEC5',
  textMuted: '#78909C',
  
  // Feedback
  success: '#66BB6A',
  error: '#EF5350',
  xp: '#FFD700',             // Dorado para XP/puntos
  
  // Extras
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// ============================================
// GRADIENTES
// ============================================
export const Gradients = {
  primary: ['#4CAF50', '#81C784'] as const,
  sunset: ['#FFB74D', '#FF8A65'] as const,
  ocean: ['#64B5F6', '#4FC3F7'] as const,
  card: ['#243447', '#2D4258'] as const,
  xp: ['#FFD700', '#FFA726'] as const,
  healthy: ['#4CAF50', '#66BB6A'] as const,
  warning: ['#FFB74D', '#FFA726'] as const,
  critical: ['#EF5350', '#E57373'] as const,
};

// ============================================
// TIPOGRAFÍA
// ============================================
export const Typography = {
  // Tamaños
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    giant: 36,
  },
  
  // Pesos
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
  // Estilos predefinidos
  styles: {
    h1: {
      fontSize: 36,
      fontWeight: '800' as const,
      lineHeight: 44,
    },
    h2: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 36,
    },
    h3: {
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    bodyBold: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    caption: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    small: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
  },
};

// ============================================
// ESPACIADO (Sistema de 8px)
// ============================================
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ============================================
// BORDES Y SOMBRAS
// ============================================
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color: string): ViewStyle => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  }),
};

// ============================================
// ANIMACIONES
// ============================================
export const Animations = {
  // Duraciones (en ms)
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
    bounce: 600,
  },
  
  // Springs para react-native-reanimated
  spring: {
    gentle: { damping: 15, stiffness: 100 },
    bouncy: { damping: 10, stiffness: 150 },
    snappy: { damping: 20, stiffness: 200 },
  },
  
  // Easing functions
  easing: {
    easeIn: 'ease-in' as const,
    easeOut: 'ease-out' as const,
    easeInOut: 'ease-in-out' as const,
  },
};

// ============================================
// ESTADOS DE ÁNIMO DE PLANTAS
// ============================================
export type PlantMoodType = 'happy' | 'thirsty' | 'sick' | 'sleeping' | 'excited' | 'loved';

export interface PlantMood {
  emoji: string;
  color: string;
  message: string;
  animation: 'bounce' | 'shake' | 'wobble' | 'pulse' | 'jump' | 'hearts';
}

export const PlantMoods: Record<PlantMoodType, PlantMood> = {
  happy: {
    emoji: '😊',
    color: '#4CAF50',
    message: '¡Estoy feliz!',
    animation: 'bounce',
  },
  thirsty: {
    emoji: '😰',
    color: '#FFB74D',
    message: '¡Tengo sed!',
    animation: 'shake',
  },
  sick: {
    emoji: '🤒',
    color: '#EF5350',
    message: 'No me siento bien...',
    animation: 'wobble',
  },
  sleeping: {
    emoji: '😴',
    color: '#64B5F6',
    message: 'Zzz...',
    animation: 'pulse',
  },
  excited: {
    emoji: '🤩',
    color: '#FFD700',
    message: '¡Increíble!',
    animation: 'jump',
  },
  loved: {
    emoji: '🥰',
    color: '#E91E63',
    message: '¡Me cuidas tan bien!',
    animation: 'hearts',
  },
};

// ============================================
// ESTADOS DE SALUD
// ============================================
export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface HealthStatusConfig {
  label: string;
  color: string;
  emoji: string;
}

export const HealthStatuses: Record<HealthStatus, HealthStatusConfig> = {
  healthy: {
    label: 'Saludable',
    color: Colors.healthy,
    emoji: '✅',
  },
  warning: {
    label: 'Atención',
    color: Colors.warning,
    emoji: '⚠️',
  },
  critical: {
    label: 'Crítico',
    color: Colors.critical,
    emoji: '🚨',
  },
};

// ============================================
// EXPORT DEFAULT
// ============================================
export default {
  Colors,
  Gradients,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Animations,
  PlantMoods,
  HealthStatuses,
};
