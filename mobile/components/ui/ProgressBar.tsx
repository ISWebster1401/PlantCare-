/**
 * ProgressBar Component - Estilo Duolingo
 * 
 * Barra de progreso animada con efecto shimmer/brillo
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius, Spacing, Gradients } from '../../constants/DesignSystem';
import { useThemeColors } from '../../context/ThemeContext';

export interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  color?: string;
  gradient?: string[];
  showShimmer?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 12,
  color,
  gradient,
  showShimmer = true,
  style,
  accessibilityLabel,
}) => {
  const colors = useThemeColors();
  const progressValue = useSharedValue(0);
  const shimmerTranslate = useSharedValue(-100);

  useEffect(() => {
    // Animar el progreso
    progressValue.value = withTiming(Math.max(0, Math.min(100, progress)), {
      duration: 500,
    });
  }, [progress]);

  useEffect(() => {
    // Animación shimmer
    if (showShimmer) {
      shimmerTranslate.value = withRepeat(
        withSequence(
          withTiming(200, { duration: 1500 }),
          withTiming(-100, { duration: 0 })
        ),
        -1,
        false
      );
    }
  }, [showShimmer]);

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value}%`,
  }));

  const shimmerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      shimmerTranslate.value,
      [-100, 0, 100, 200],
      [0, 0.5, 0.5, 0]
    );
    return {
      transform: [{ translateX: shimmerTranslate.value }],
      opacity,
    };
  });

  // Función para convertir string[] a tupla válida para LinearGradient
  const getGradientColors = (inputColors: string[] | undefined): [string, string, ...string[]] => {
    if (!inputColors || inputColors.length < 2) {
      return [colors.primary, colors.primaryLight];
    }
    return inputColors as [string, string, ...string[]];
  };

  // Determinar colores para el gradiente
  const progressColors = gradient 
    ? getGradientColors(gradient)
    : color 
    ? [color, color] as [string, string]
    : getGradientColors(Array.from(Gradients.primary));

  // Colores fijos para el shimmer
  const shimmerColors: [string, string, string] = [
    'transparent', 
    'rgba(255,255,255,0.3)', 
    'transparent'
  ];

  return (
    <View
      style={[
        styles.container,
        {
          height,
          borderRadius: height / 2,
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel || `Progreso: ${Math.round(progress)}%`}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(progress),
      }}
    >
      {/* Fondo */}
      <View
        style={[
          styles.background,
          {
            height,
            borderRadius: height / 2,
          },
        ]}
      />

      {/* Barra de progreso */}
      <Animated.View
        style={[
          styles.progress,
          {
            height,
            borderRadius: height / 2,
            overflow: 'hidden',
          },
          progressAnimatedStyle,
        ]}
      >
        <LinearGradient
          colors={progressColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Efecto shimmer */}
        {showShimmer && (
          <AnimatedGradient
            colors={shimmerColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              StyleSheet.absoluteFillObject,
              {
                width: '50%',
              },
              shimmerAnimatedStyle,
            ]}
          />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  background: {
    position: 'absolute',
    width: '100%',
    backgroundColor: '#00000020', // se sobreescribe con theme si se usa inline
  },
  progress: {
    position: 'relative',
    zIndex: 1,
  },
});