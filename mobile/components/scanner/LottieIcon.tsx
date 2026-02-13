/**
 * Icono animado con Lottie para las cards de selección del scanner
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';

type IconName = 'camera' | 'gallery' | 'success';

const LOTTIE_SOURCES: Record<IconName, any> = {
  camera: (() => {
    try { return require('../../assets/lottie/camera-scan.json'); }
    catch { return null; }
  })(),
  gallery: null,
  success: (() => {
    try { return require('../../assets/lottie/success.json'); }
    catch { return null; }
  })(),
};

const ICON_FALLBACKS: Record<IconName, { name: string; color: string }> = {
  camera: { name: 'camera', color: '#4CAF50' },
  gallery: { name: 'images', color: '#64B5F6' },
  success: { name: 'checkmark-circle', color: '#66BB6A' },
};

interface LottieIconProps {
  name: IconName;
  size?: number;
}

export function LottieIcon({ name, size = 56 }: LottieIconProps) {
  const colors = useThemeColors();
  const source = LOTTIE_SOURCES[name];
  const fallback = ICON_FALLBACKS[name];

  if (source) {
    try {
      const LottieView = require('lottie-react-native').default;
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <LottieView
            source={source}
            autoPlay
            loop
            speed={0.7}
            style={styles.lottie}
            resizeMode="contain"
          />
        </View>
      );
    } catch {
      // Fallback si lottie-react-native falla
    }
  }

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      <Ionicons
        name={fallback.name as any}
        size={size * 0.6}
        color={fallback.color}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  lottie: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
