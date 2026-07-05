/**
 * Componente de botón animado reutilizable
 * Agrega animaciones fluidas de scale y opacity al presionar.
 * Usa reanimated (hilo de UI) para respuesta táctil sin lag.
 */
import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// Equivalentes de tension=300/friction=10 del Animated clásico
const SPRING_CONFIG = { stiffness: 300, damping: 10, mass: 1 };

interface AnimatedButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'icon';
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  style,
  disabled = false,
  onPress,
  onPressIn,
  onPressOut,
  variant = 'primary',
  ...props
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = (e: any) => {
    if (disabled) return;
    scale.value = withSpring(0.95, SPRING_CONFIG);
    opacity.value = withTiming(0.7, { duration: 100 });
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    if (disabled) return;
    scale.value = withSpring(1, SPRING_CONFIG);
    opacity.value = withTiming(1, { duration: 150 });
    onPressOut?.(e);
  };

  const handlePress = (e: any) => {
    if (disabled) return;
    // Rebote rápido para taps sin pressIn/pressOut completos
    scale.value = 0.95;
    opacity.value = 0.7;
    scale.value = withSpring(1, SPRING_CONFIG);
    opacity.value = withTiming(1, { duration: 150 });
    onPress?.(e);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle, disabled && styles.disabled]}>
      <TouchableOpacity
        {...props}
        disabled={disabled}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});
