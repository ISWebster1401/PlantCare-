/**
 * Nubes animadas de fondo - estilo Pokémon GO (soporta tema)
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export function CloudsBackground() {
  const { isDark } = useTheme();
  const cloud1 = useRef(new Animated.Value(0)).current;
  const cloud2 = useRef(new Animated.Value(0)).current;
  const cloud3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateCloud = (cloud: Animated.Value, duration: number, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(cloud, {
            toValue: width + 100,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(cloud, {
            toValue: -100,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateCloud(cloud1, 25000, 0);
    animateCloud(cloud2, 30000, 5000);
    animateCloud(cloud3, 20000, 10000);
  }, [cloud1, cloud2, cloud3]);

  const cloudOpacity = isDark ? 0.08 : 0.85;
  const cloudColor = '#FFFFFF';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.cloud,
          styles.cloud1,
          {
            transform: [{ translateX: cloud1 }],
            backgroundColor: cloudColor,
            opacity: cloudOpacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.cloud,
          styles.cloud2,
          {
            transform: [{ translateX: cloud2 }],
            backgroundColor: cloudColor,
            opacity: cloudOpacity * 0.7,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.cloud,
          styles.cloud3,
          {
            transform: [{ translateX: cloud3 }],
            backgroundColor: cloudColor,
            opacity: cloudOpacity * 0.5,
          },
        ]}
      />
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
