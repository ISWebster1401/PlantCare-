/**
 * Card Component - Estilo Duolingo/Pokémon
 * 
 * Card con gradiente sutil y animaciones de entrada
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius, Shadows, Spacing } from '../../constants/DesignSystem';
import { useThemeColors, useThemeGradients } from '../../context/ThemeContext';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  gradient?: readonly string[] | string[];
  delay?: number;
  accessibilityLabel?: string;
}

const AnimatedCard = Animated.createAnimatedComponent(View);
const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  onPress,
  style,
  gradient,
  delay = 0,
  accessibilityLabel,
}) => {
  const colors = useThemeColors();
  const themeGradients = useThemeGradients();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
    }, delay);
    
    return () => clearTimeout(timer);
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          ...Shadows.lg,
          backgroundColor: colors.backgroundLight,
        };
      case 'outlined':
        return {
          backgroundColor: colors.backgroundLight,
          borderWidth: 2,
          borderColor: colors.primary,
        };
      case 'glass':
        return {
          backgroundColor: 'rgba(36, 52, 71, 0.6)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
        };
      default:
        return {
          backgroundColor: colors.backgroundLight,
          ...Shadows.md,
        };
    }
  };

  const getGradientColors = (colorList: string[] | undefined) => {
    if (!colorList || colorList.length < 2) {
      return [colors.backgroundLight, colors.backgroundLight] as const;
    }
    return colorList as [string, string, ...string[]];
  };

  const cardContent = (
    <AnimatedCard
      style={[
        styles.card,
        getVariantStyles(),
        animatedStyle,
        style,
      ]}
    >
      {gradient ? (
        <AnimatedGradient
          colors={getGradientColors(Array.isArray(gradient) ? gradient : Array.from(gradient))}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : variant === 'default' ? (
        <LinearGradient
          colors={getGradientColors(Array.from(themeGradients.card))}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      <View style={styles.content}>{children}</View>
    </AnimatedCard>
  );

  if (onPress) {
    // Extract flex from the style so the TouchableOpacity wrapper also expands
    const flatStyle = StyleSheet.flatten(style) || {};
    const wrapperStyle: ViewStyle = {};
    if (flatStyle.flex !== undefined) wrapperStyle.flex = flatStyle.flex;
    if (flatStyle.minWidth !== undefined) wrapperStyle.minWidth = flatStyle.minWidth;

    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        style={wrapperStyle}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    padding: Spacing.md,
  },
  content: {
    zIndex: 1,
  },
});