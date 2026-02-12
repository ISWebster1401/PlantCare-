/**
 * Efectos visuales del scanner: partículas, glow, estrellas
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');


function FloatingParticle({ size, duration }: { size: number; duration: number }) {
  const opacity = useSharedValue(0.2);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: duration * 0.5 }),
        withTiming(0.2, { duration: duration * 0.5 })
      ),
      -1,
      true
    );
    translateY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { borderRadius: size / 2 },
        animatedStyle,
      ]}
    />
  );
}

/** Partículas de fondo sutiles */
export function ScannerParticles({ color = '#4CAF50' }: { color?: string }) {
  const particles = [
    { size: 4, left: width * 0.1, top: height * 0.2, delay: 0, duration: 3000 },
    { size: 2, left: width * 0.8, top: height * 0.3, delay: 500, duration: 2500 },
    { size: 3, left: width * 0.2, top: height * 0.6, delay: 1000, duration: 3500 },
    { size: 2, left: width * 0.7, top: height * 0.5, delay: 200, duration: 2800 },
    { size: 5, left: width * 0.5, top: height * 0.15, delay: 800, duration: 4000 },
    { size: 2, left: width * 0.9, top: height * 0.7, delay: 300, duration: 2200 },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <View
          key={i}
          style={[
            styles.particleWrap,
            {
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: color,
            },
          ]}
        >
          <FloatingParticle size={p.size} duration={p.duration} />
        </View>
      ))}
    </View>
  );
}

/** Glow pulsante */
export function PulsingGlow({
  color,
  size = 120,
}: {
  color: string;
  size?: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.glow,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  particleWrap: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
  },
});
