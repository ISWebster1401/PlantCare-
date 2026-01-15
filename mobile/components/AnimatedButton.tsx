/**
 * Componente de botón animado reutilizable
 * Agrega animaciones fluidas de scale y opacity al presionar
 */
import React, { useRef } from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

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
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: any) => {
    if (disabled) return;
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    if (disabled) return;

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    onPressOut?.(e);
  };

  const handlePress = (e: any) => {
    if (disabled) return;
    
    // Reset animations
    scaleAnim.setValue(0.95);
    opacityAnim.setValue(0.7);
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    onPress?.(e);
  };

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
        disabled && styles.disabled,
      ]}
    >
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
