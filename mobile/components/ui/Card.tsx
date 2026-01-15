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
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Shadows, Spacing, Gradients } from '../../constants/DesignSystem';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: ViewStyle;
  gradient?: string[];
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
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          ...Shadows.lg,
          backgroundColor: Colors.backgroundLight,
        };
      case 'outlined':
        return {
          backgroundColor: Colors.backgroundLight,
          borderWidth: 2,
          borderColor: Colors.primary,
        };
      case 'glass':
        return {
          backgroundColor: 'rgba(36, 52, 71, 0.6)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
        };
      default:
        return {
          backgroundColor: Colors.backgroundLight,
          ...Shadows.md,
        };
    }
  };

  const cardContent = (
    <AnimatedCard
      entering={FadeInDown.delay(delay).springify()}
      style={[
        styles.card,
        getVariantStyles(),
        animatedStyle,
        style,
      ]}
    >
      {gradient ? (
        <AnimatedGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : variant === 'default' ? (
        <LinearGradient
          colors={Gradients.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      <View style={styles.content}>{children}</View>
    </AnimatedCard>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
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
