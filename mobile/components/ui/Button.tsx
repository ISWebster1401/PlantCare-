/**
 * Button Component - Estilo Duolingo/Pokémon
 * 
 * Botón con variantes, animaciones y haptic feedback
 */
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Typography, BorderRadius, Spacing, Animations } from '../../constants/DesignSystem';
import { useThemeColors } from '../../context/ThemeContext';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

function getVariantStyles(colors: ReturnType<typeof useThemeColors>): Record<ButtonVariant, { bg: string; text: string; border?: string }> {
  return {
    primary: { bg: colors.primary, text: colors.white },
    secondary: { bg: colors.secondary, text: colors.white },
    ghost: { bg: colors.transparent, text: colors.primary, border: colors.primary },
    danger: { bg: colors.error, text: colors.white },
  };
}

const sizeStyles: Record<ButtonSize, { height: number; padding: number; fontSize: number }> = {
  sm: {
    height: 36,
    padding: Spacing.sm,
    fontSize: Typography.sizes.sm,
  },
  md: {
    height: 48,
    padding: Spacing.md,
    fontSize: Typography.sizes.base,
  },
  lg: {
    height: 56,
    padding: Spacing.lg,
    fontSize: Typography.sizes.lg,
  },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const colors = useThemeColors();
  const variantStylesMap = getVariantStyles(colors);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const variantStyle = variantStylesMap[variant];
  const sizeStyle = sizeStyles[size];

  const handlePressIn = () => {
    scale.value = withSpring(0.95, Animations.spring.snappy);
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Animations.spring.snappy);
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  React.useEffect(() => {
    opacity.value = disabled ? withTiming(0.5, { duration: Animations.duration.fast }) : withTiming(1, { duration: Animations.duration.fast });
  }, [disabled]);

  // Determinar justifyContent basado en si tiene style personalizado
  const justifyContentValue = style?.justifyContent === 'flex-start' ? 'flex-start' : 'center';

  const buttonStyle: ViewStyle = {
    backgroundColor: variantStyle.bg,
    borderWidth: variantStyle.border ? 2 : 0,
    borderColor: variantStyle.border,
    minHeight: sizeStyle.height,
    height: style?.height === 'auto' ? undefined : (style?.height || sizeStyle.height),
    paddingHorizontal: sizeStyle.padding,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: justifyContentValue,
    minWidth: fullWidth ? '100%' : undefined,
  };

  const textColorStyle: TextStyle = {
    color: variantStyle.text,
    fontSize: sizeStyle.fontSize,
    fontWeight: Typography.weights.semibold,
  };

  return (
    <AnimatedTouchable
      style={[buttonStyle, animatedStyle, style]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={1}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyle.text} />
      ) : (
        <View style={[styles.content, !title && styles.contentIconOnly]}>
          {title ? (
            <>
              {icon && iconPosition === 'left' && (
                <Ionicons
                  name={icon}
                  size={sizeStyle.fontSize + 4}
                  color={variantStyle.text}
                  style={styles.iconLeft}
                />
              )}
              <Text style={[textColorStyle, textStyle]}>{title}</Text>
              {icon && iconPosition === 'right' && (
                <Ionicons
                  name={icon}
                  size={sizeStyle.fontSize + 4}
                  color={variantStyle.text}
                  style={styles.iconRight}
                />
              )}
            </>
          ) : (
            // Cuando no hay título, mostrar el ícono centrado sin márgenes
            icon && (
              <Ionicons
                name={icon}
                size={sizeStyle.fontSize + 12}
                color={variantStyle.text}
              />
            )
          )}
        </View>
      )}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentIconOnly: {
    // Cuando solo hay ícono, asegurar que esté perfectamente centrado
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
});
