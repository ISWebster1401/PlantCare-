/**
 * PlantCare Design System - Front React (Web)
 * Misma paleta que mobile para consistencia visual
 */

// ============================================
// PALETA DE COLORES
// ============================================
export const Colors = {
  primary: '#4CAF50',
  primaryLight: '#81C784',
  primaryDark: '#388E3C',

  background: '#1A2634',
  backgroundLight: '#243447',
  backgroundLighter: '#2D4258',

  accent: '#FFB74D',
  accentLight: '#FFCC80',
  secondary: '#64B5F6',

  healthy: '#4CAF50',
  warning: '#FFB74D',
  critical: '#EF5350',

  text: '#FFFFFF',
  textSecondary: '#B0BEC5',
  textMuted: '#78909C',

  success: '#66BB6A',
  error: '#EF5350',
  xp: '#FFD700',

  white: '#FFFFFF',
  black: '#000000',
};

// ============================================
// VARIABLES CSS (para usar en estilos)
// ============================================
export const cssVariables = `
  :root {
    --color-primary: ${Colors.primary};
    --color-primary-light: ${Colors.primaryLight};
    --color-primary-dark: ${Colors.primaryDark};
    --color-background: ${Colors.background};
    --color-background-light: ${Colors.backgroundLight};
    --color-background-lighter: ${Colors.backgroundLighter};
    --color-accent: ${Colors.accent};
    --color-accent-light: ${Colors.accentLight};
    --color-secondary: ${Colors.secondary};
    --color-healthy: ${Colors.healthy};
    --color-warning: ${Colors.warning};
    --color-critical: ${Colors.critical};
    --color-text: ${Colors.text};
    --color-text-secondary: ${Colors.textSecondary};
    --color-text-muted: ${Colors.textMuted};
    --color-success: ${Colors.success};
    --color-error: ${Colors.error};
  }
`;
