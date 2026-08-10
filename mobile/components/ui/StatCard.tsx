/**
 * StatCard Component - Estilo Duolingo/Pokémon
 * 
 * Tarjeta de estadísticas con animación de contador
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, CardProps } from './Card';
import { Typography, Spacing, BorderRadius } from '../../constants/DesignSystem';
import { useThemeColors } from '../../context/ThemeContext';

export interface StatCardProps extends Omit<CardProps, 'children'> {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  color?: string;
  iconSize?: number;
  showAnimation?: boolean;
  formatValue?: (value: number) => string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  color,
  iconSize = 32,
  showAnimation = true,
  formatValue,
  style,
  ...cardProps
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const effectiveColor = color || colors.primary;
  // El contador se anima con estado de React: el número es texto, así que
  // igual necesita re-render en cada paso (un shared value de Reanimated no
  // re-renderiza, por eso antes la cifra se quedaba pegada en 0).
  const [displayNumber, setDisplayNumber] = useState(showAnimation ? 0 : value);

  useEffect(() => {
    if (!showAnimation) {
      setDisplayNumber(value);
      return;
    }

    const DURATION_MS = 1000;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const progress = Math.min((Date.now() - startedAt) / DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cúbico
      setDisplayNumber(Math.round(value * eased));
      if (progress >= 1) clearInterval(timer);
    }, 16);

    return () => clearInterval(timer);
  }, [value, showAnimation]);

  const displayValue = formatValue ? formatValue(displayNumber) : displayNumber;

  return (
    <Card style={style} {...cardProps}>
      <View style={styles.container}>
        <View style={[styles.iconContainer, { backgroundColor: `${effectiveColor}20` }]}>
          <Ionicons name={icon} size={iconSize} color={effectiveColor} />
          {value > 0 && (
            <View style={[styles.badge, { backgroundColor: effectiveColor }]}>
              <Text style={styles.badgeText}>{displayValue}</Text>
            </View>
          )}
        </View>
        <View style={styles.content}>
          <Text style={styles.value}>{displayValue}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>
    </Card>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    lineHeight: 14,
  },
  content: {
    flex: 1,
  },
  value: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: colors.text,
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    color: colors.textSecondary,
  },
});
