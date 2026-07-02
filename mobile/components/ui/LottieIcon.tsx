/**
 * Icono animado con Lottie (cámara, galería, planta, éxito)
 * Fondo transparente para usar en cards del scanner.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useThemeColors } from '../../context/ThemeContext';

export type LottieIconName = 'camera' | 'gallery' | 'plant' | 'success';

const LOTTIE_FILES: Record<LottieIconName, any> = {
  camera: (() => { try { return require('../../assets/lottie/camera-scan.json'); } catch { return null; } })(),
  gallery: (() => { try { return require('../../assets/lottie/camera-scan.json'); } catch { return null; } })(),
  plant: (() => { try { return require('../../assets/lottie/plant-happy.json'); } catch { return null; } })(),
  success: (() => { try { return require('../../assets/lottie/success.json'); } catch { return null; } })(),
};

const FALLBACK_ICONS: Record<LottieIconName, { name: 'camera' | 'images' | 'leaf' | 'checkmark-circle'; colorKey: 'primary' | 'secondary' | 'success' }> = {
  camera: { name: 'camera', colorKey: 'primary' },
  gallery: { name: 'images', colorKey: 'secondary' },
  plant: { name: 'leaf', colorKey: 'primary' },
  success: { name: 'checkmark-circle', colorKey: 'success' },
};

export interface LottieIconProps {
  name: LottieIconName;
  size?: number;
  autoPlay?: boolean;
  loop?: boolean;
}

export function LottieIcon({ name, size = 60, autoPlay = true, loop = true }: LottieIconProps) {
  const colors = useThemeColors();
  const source = LOTTIE_FILES[name];
  const fallback = FALLBACK_ICONS[name];
  const fallbackColor = colors[fallback.colorKey];

  if (source) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <LottieView
          source={source}
          autoPlay={autoPlay}
          loop={loop}
          style={{ width: size, height: size }}
        />
      </View>
    );
  }
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Ionicons name={fallback.name as any} size={size * 0.6} color={fallbackColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
