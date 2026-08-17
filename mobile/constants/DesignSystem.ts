/**
 * 🌱 PlantCare Design System
 * Soporta modo claro y oscuro (Light / Dark)
 */

import { ViewStyle } from 'react-native';

// ============================================
// TIPO DE PALETA (para tema)
// ============================================
export interface ThemeColors {
  background: string;
  backgroundLight: string;
  backgroundLighter: string;
  backgroundAlt: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryPastel: string;
  accent: string;
  accentBright: string;
  accentLight: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  pink: string;
  purple: string;
  yellow: string;
  coral: string;
  mint: string;
  healthy: string;
  success: string;
  warning: string;
  critical: string;
  error: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDark: string;
  white: string;
  black: string;
  overlay: string;
  transparent: string;
  xp: string;
  scanner: string;
  scannerGlow: string;
}

// ============================================
// PALETA CLARA (Light) - verde suave, casi sin blanco puro
// ============================================
export const LightColors: ThemeColors = {
  // Fondos: papel crema de lamina botanica, cards en blanco
  background: '#FBF7EC',
  backgroundLight: '#FFFFFF',
  backgroundLighter: '#F3EDDD',
  backgroundAlt: '#F7F2E4',
  primary: '#5A7355',
  primaryLight: '#8FA889',
  primaryDark: '#42563E',
  primaryPastel: '#E6EDE2',
  accent: '#A0503C',
  accentBright: '#B85C44',
  accentLight: '#D9A292',
  secondary: '#7C9CA8',
  secondaryLight: '#A6BEC7',
  secondaryDark: '#5A7883',
  pink: '#B07C8A',
  purple: '#8B7CA0',
  yellow: '#C9A227',
  coral: '#C9765E',
  mint: '#8FA889',
  healthy: '#5A7355',
  success: '#4A6146',
  warning: '#B8802E',
  critical: '#A0503C',
  error: '#A0503C',
  text: '#2E3328',
  textSecondary: '#82806D',
  textMuted: '#A9A594',
  textDark: '#2E3328',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(46,51,40,0.35)',
  transparent: 'transparent',
  xp: '#C9A227',
  scanner: '#5A7355',
  scannerGlow: '#8FA889',
};

// ============================================
// PALETA OSCURA (Dark)
// ============================================
export const DarkColors: ThemeColors = {
  background: '#1A1D17',
  backgroundLight: '#23271F',
  backgroundLighter: '#2B3025',
  backgroundAlt: '#20241B',
  primary: '#8FA889',
  primaryLight: '#A8BFA1',
  primaryDark: '#6B8266',
  primaryPastel: '#26301F',
  accent: '#C9765E',
  accentBright: '#DB8A70',
  accentLight: '#E0A18C',
  secondary: '#93B3BF',
  secondaryLight: '#B0C9D2',
  secondaryDark: '#6D8E9B',
  pink: '#C99AA6',
  purple: '#A395B8',
  yellow: '#D9B84A',
  coral: '#C9765E',
  mint: '#A8BFA1',
  healthy: '#8FA889',
  success: '#A8BFA1',
  warning: '#D9A45C',
  critical: '#C9765E',
  error: '#C9765E',
  text: '#EDE9DC',
  textSecondary: '#9B9887',
  textMuted: '#7C7A6B',
  textDark: '#EDE9DC',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.55)',
  transparent: 'transparent',
  xp: '#D9B84A',
  scanner: '#8FA889',
  scannerGlow: '#A8BFA1',
};

/** @deprecated Usar useThemeColors() o LightColors/DarkColors según tema */
export const Colors = LightColors;

// ============================================
// GRADIENTES (Light)
// ============================================
export const Gradients = {
  sky: ['#EDF2F4', '#DCE6EA', '#C5D6DD'] as const,
  grass: ['#F1F0E4', '#E6EDE2', '#D3DFCE'] as const,
  sunset: ['#FBF3E6', '#F6E1DB', '#EFCDBF'] as const,
  primary: ['#6B8465', '#5A7355'] as const,
  greenButton: ['#6B8465', '#5A7355'] as const,
  blueButton: ['#8CAAB5', '#7C9CA8'] as const,
  orangeButton: ['#B85C44', '#A0503C'] as const,
  ocean: ['#7C9CA8', '#8CAAB5'] as const,
  scanner: ['#5A7355', '#8FA889'] as const,
  magic: ['#9B8CAE', '#8B7CA0'] as const,
  card: ['#FFFFFF', '#F7F2E4'] as const,
  xp: ['#C9A227', '#B8802E'] as const,
  healthy: ['#5A7355', '#6B8465'] as const,
  warning: ['#C48F3E', '#B8802E'] as const,
  critical: ['#A0503C', '#B85C44'] as const,
};

export type ThemeGradients = Record<string, readonly string[]>;

// ============================================
// GRADIENTES (Dark)
// ============================================
export const DarkGradients: ThemeGradients = {
  sky: ['#1B2226', '#232C31', '#2C383E'] as const,
  grass: ['#1A1D17', '#23271F', '#2B3025'] as const,
  sunset: ['#2A2019', '#3A241D', '#472C22'] as const,
  primary: ['#6B8266', '#8FA889'] as const,
  greenButton: ['#6B8266', '#8FA889'] as const,
  blueButton: ['#6D8E9B', '#93B3BF'] as const,
  orangeButton: ['#B0654F', '#C9765E'] as const,
  ocean: ['#6D8E9B', '#93B3BF'] as const,
  scanner: ['#8FA889', '#A8BFA1'] as const,
  magic: ['#8A7C9E', '#A395B8'] as const,
  card: ['#23271F', '#2B3025'] as const,
  xp: ['#B89A3C', '#D9B84A'] as const,
  healthy: ['#6B8266', '#8FA889'] as const,
  warning: ['#B58840', '#D9A45C'] as const,
  critical: ['#B0654F', '#C9765E'] as const,
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
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  float: {
    shadowColor: '#5A7355',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
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
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
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
  emoji: string;        // Nombre para componente Emoji (ej: 'happy')
  emojiUnicode?: string; // Fallback Unicode si no hay SVG
  color: string;
  message: string;
  animation: 'bounce' | 'shake' | 'wobble' | 'pulse' | 'jump' | 'hearts';
}

export const PlantMoods: Record<PlantMoodType, PlantMood> = {
  happy: {
    emoji: 'happy',
    emojiUnicode: '😊',
    color: '#5A7355',
    message: '¡Estoy feliz!',
    animation: 'bounce',
  },
  thirsty: {
    emoji: 'thirsty',
    emojiUnicode: '😰',
    color: '#FFB74D',
    message: '¡Tengo sed!',
    animation: 'shake',
  },
  sick: {
    emoji: 'sick',
    emojiUnicode: '🤒',
    color: '#EF5350',
    message: 'No me siento bien...',
    animation: 'wobble',
  },
  sleeping: {
    emoji: 'sleeping',
    emojiUnicode: '😴',
    color: '#64B5F6',
    message: 'Zzz...',
    animation: 'pulse',
  },
  excited: {
    emoji: 'excited',
    emojiUnicode: '🤩',
    color: '#FFD700',
    message: '¡Increíble!',
    animation: 'jump',
  },
  loved: {
    emoji: 'loved',
    emojiUnicode: '🥰',
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
  emoji: string;        // Nombre para componente Emoji
  emojiUnicode?: string; // Fallback Unicode
}

export const HealthStatuses: Record<HealthStatus, HealthStatusConfig> = {
  healthy: {
    label: 'Saludable',
    color: LightColors.success,
    emoji: 'check',
    emojiUnicode: '✅',
  },
  warning: {
    label: 'Atención',
    color: LightColors.warning,
    emoji: 'warning',
    emojiUnicode: '⚠️',
  },
  critical: {
    label: 'Crítico',
    color: LightColors.critical,
    emoji: 'alert',
    emojiUnicode: '🚨',
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
