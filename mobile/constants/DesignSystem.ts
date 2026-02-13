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
  // Fondos: base verde muy claro, cards apenas más claras
  background: '#E7F5E7',
  backgroundLight: '#F5FBF5',
  backgroundLighter: '#DDEFE2',
  backgroundAlt: '#E3F4E6',
  primary: '#4CAF50',
  primaryLight: '#81C784',
  primaryDark: '#2E7D32',
  primaryPastel: '#C8E6C9',
  accent: '#FFB74D',
  accentBright: '#FF9800',
  accentLight: '#FFCC80',
  secondary: '#64B5F6',
  secondaryLight: '#90CAF9',
  secondaryDark: '#1976D2',
  pink: '#F48FB1',
  purple: '#CE93D8',
  yellow: '#FFF176',
  coral: '#FF8A80',
  mint: '#80CBC4',
  healthy: '#66BB6A',
  success: '#66BB6A',
  warning: '#FFA726',
  critical: '#EF5350',
  error: '#EF5350',
  text: '#1B5E20',
  textSecondary: '#558B2F',
  textMuted: '#81C784',
  textDark: '#2E2E2E',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.3)',
  transparent: 'transparent',
  xp: '#FFD700',
  scanner: '#00E676',
  scannerGlow: '#69F0AE',
};

// ============================================
// PALETA OSCURA (Dark)
// ============================================
export const DarkColors: ThemeColors = {
  background: '#0D1F0D',
  backgroundLight: '#1A2E1A',
  backgroundLighter: '#243B24',
  backgroundAlt: '#1E3220',
  primary: '#66BB6A',
  primaryLight: '#81C784',
  primaryDark: '#388E3C',
  primaryPastel: '#2E5C30',
  accent: '#FFB74D',
  accentBright: '#FF9800',
  accentLight: '#FFCC80',
  secondary: '#64B5F6',
  secondaryLight: '#90CAF9',
  secondaryDark: '#1976D2',
  pink: '#F48FB1',
  purple: '#CE93D8',
  yellow: '#FFF176',
  coral: '#FF8A80',
  mint: '#80CBC4',
  healthy: '#66BB6A',
  success: '#66BB6A',
  warning: '#FFA726',
  critical: '#EF5350',
  error: '#EF5350',
  text: '#E8F5E9',
  textSecondary: '#A5D6A7',
  textMuted: '#81C784',
  textDark: '#FFFFFF',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  transparent: 'transparent',
  xp: '#FFD700',
  scanner: '#00E676',
  scannerGlow: '#69F0AE',
};

/** @deprecated Usar useThemeColors() o LightColors/DarkColors según tema */
export const Colors = LightColors;

// ============================================
// GRADIENTES (Light)
// ============================================
export const Gradients = {
  sky: ['#E3F2FD', '#BBDEFB', '#90CAF9'] as const,
  grass: ['#E8F5E9', '#C8E6C9', '#A5D6A7'] as const,
  sunset: ['#FFF8E1', '#FFECB3', '#FFE082'] as const,
  primary: ['#66BB6A', '#4CAF50'] as const,
  greenButton: ['#66BB6A', '#4CAF50'] as const,
  blueButton: ['#64B5F6', '#42A5F5'] as const,
  orangeButton: ['#FFB74D', '#FFA726'] as const,
  ocean: ['#64B5F6', '#4FC3F7'] as const,
  scanner: ['#00E676', '#69F0AE'] as const,
  magic: ['#CE93D8', '#BA68C8'] as const,
  card: ['#FFFFFF', '#F5F5F5'] as const,
  xp: ['#FFD700', '#FFA726'] as const,
  healthy: ['#4CAF50', '#66BB6A'] as const,
  warning: ['#FFB74D', '#FFA726'] as const,
  critical: ['#EF5350', '#E57373'] as const,
};

export type ThemeGradients = Record<string, readonly string[]>;

// ============================================
// GRADIENTES (Dark)
// ============================================
export const DarkGradients: ThemeGradients = {
  sky: ['#1A2E3A', '#243B4A', '#2D4A5C'] as const,
  grass: ['#1A2E1A', '#243B24', '#2E4A2E'] as const,
  sunset: ['#3D3520', '#4A4228', '#5C5230'] as const,
  primary: ['#2E7D32', '#388E3C'] as const,
  greenButton: ['#388E3C', '#2E7D32'] as const,
  blueButton: ['#1976D2', '#1E88E5'] as const,
  orangeButton: ['#F57C00', '#FF9800'] as const,
  ocean: ['#1565C0', '#1976D2'] as const,
  scanner: ['#00C853', '#00E676'] as const,
  magic: ['#7B1FA2', '#8E24AA'] as const,
  card: ['#1A2E1A', '#243B24'] as const,
  xp: ['#FFC107', '#FFD54F'] as const,
  healthy: ['#388E3C', '#43A047'] as const,
  warning: ['#F57C00', '#FF9800'] as const,
  critical: ['#D32F2F', '#E53935'] as const,
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
    shadowColor: '#4CAF50',
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
    color: '#4CAF50',
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
    color: Colors.warning,
    emoji: 'warning',
    emojiUnicode: '⚠️',
  },
  critical: {
    label: 'Crítico',
    color: Colors.critical,
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
