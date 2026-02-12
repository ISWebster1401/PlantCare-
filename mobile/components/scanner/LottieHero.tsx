/**
 * Hero con Lottie opcional; fallback a Emoji animado para Expo Go
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Emoji } from '../ui';

const LOTTIE_SOURCE = (() => {
  try {
    return require('../../assets/lottie/plant-happy.json');
  } catch {
    return null;
  }
})();

interface LottieHeroProps {
  size?: number;
}

export function LottieHero({ size = 200 }: LottieHeroProps) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withSpring(1.08, { damping: 8 }),
        withSpring(1, { damping: 8 })
      ),
      -1,
      true
    );
    rotate.value = withRepeat(
      withSequence(
        withSpring(-4, { damping: 15 }),
        withSpring(4, { damping: 15 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  let content: React.ReactNode;
  if (LOTTIE_SOURCE) {
    try {
      const LottieView = require('lottie-react-native').default;
      content = (
        <LottieView
          source={LOTTIE_SOURCE}
          autoPlay
          loop
          style={{ width: size, height: size }}
        />
      );
    } catch {
      content = (
        <Animated.View style={[styles.fallback, { width: size, height: size }, animatedStyle]}>
          <Emoji name="plant" size={size * 0.6} />
        </Animated.View>
      );
    }
  } else {
    content = (
      <Animated.View style={[styles.fallback, { width: size, height: size }, animatedStyle]}>
        <Emoji name="plant" size={size * 0.6} />
      </Animated.View>
    );
  }

  return <View style={styles.wrap}>{content}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
