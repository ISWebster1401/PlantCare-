/**
 * Nubes animadas de fondo - estilo Pokémon GO (soporta tema)
 * Animadas con reanimated: corren en el hilo de UI y no se traban
 * aunque el hilo de JS esté ocupado.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

function Cloud({
  duration,
  delay,
  cloudStyle,
  opacity,
  color,
}: {
  duration: number;
  delay: number;
  cloudStyle: object;
  opacity: number;
  color: string;
}) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withRepeat(
      withDelay(
        delay,
        withSequence(
          withTiming(width + 100, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(-100, { duration: 0 }),
        ),
      ),
      -1,
    );
  }, [translateX, duration, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.cloud,
        cloudStyle,
        animatedStyle,
        { backgroundColor: color, opacity },
      ]}
    />
  );
}

export function CloudsBackground() {
  const { isDark } = useTheme();

  const cloudOpacity = isDark ? 0.08 : 0.85;
  const cloudColor = '#FFFFFF';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Cloud duration={25000} delay={0} cloudStyle={styles.cloud1} opacity={cloudOpacity} color={cloudColor} />
      <Cloud duration={30000} delay={5000} cloudStyle={styles.cloud2} opacity={cloudOpacity * 0.7} color={cloudColor} />
      <Cloud duration={20000} delay={10000} cloudStyle={styles.cloud3} opacity={cloudOpacity * 0.5} color={cloudColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  cloud: {
    position: 'absolute',
    borderRadius: 50,
  },
  cloud1: {
    width: 100,
    height: 40,
    top: 80,
    left: -100,
  },
  cloud2: {
    width: 80,
    height: 30,
    top: 140,
    left: -100,
  },
  cloud3: {
    width: 120,
    height: 45,
    top: 200,
    left: -100,
  },
});
