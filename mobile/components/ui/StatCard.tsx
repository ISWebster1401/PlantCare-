/**
 * StatCard Component - Estilo Duolingo/Pokémon
 * 
 * Tarjeta de estadísticas con animación de contador
 */
import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
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
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    if (showAnimation) {
      animatedValue.value = withTiming(value, {
        duration: 1000,
      });
    } else {
      animatedValue.value = value;
    }
  }, [value, showAnimation]);

  const animatedTextStyle = useAnimatedStyle(() => {
    const displayValue = showAnimation
      ? Math.round(interpolate(animatedValue.value, [0, value], [0, value]))
      : value;

    return {
      opacity: 1,
    };
  });

  const displayValue = formatValue
    ? formatValue(showAnimation ? Math.round(animatedValue.value) : value)
    : showAnimation
    ? Math.round(animatedValue.value)
    : value;

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
        <Animated.View style={[styles.content, animatedTextStyle]}>
          <Text style={styles.value}>{displayValue}</Text>
          <Text style={styles.label}>{label}</Text>
        </Animated.View>
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
