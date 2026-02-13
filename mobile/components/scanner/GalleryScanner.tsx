/**
 * Scanner de galería: foto estática + animación de escaneo
 */
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing } from '../../constants/DesignSystem';
import { useThemeColors } from '../../context/ThemeContext';
import { GrassFooter } from '../decorative';
import { ScannerOverlay } from './ScannerOverlay';
import { ScannerProgressBar } from './ScannerProgress';
import { preloadSounds, startBeepLoop, stopBeepLoop, playComplete } from '../../utils/soundManager';

const DURATION_MS = 3000;
const MESSAGES = [
  'Detectando hojas...',
  'Analizando colores...',
  'Identificando especie...',
  '¡Casi listo!',
];

interface GalleryScannerProps {
  imageUri: string;
  onComplete: () => void;
}

export function GalleryScanner({ imageUri, onComplete }: GalleryScannerProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    preloadSounds();
  }, []);

  useEffect(() => {
    startBeepLoop();
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, (elapsed / DURATION_MS) * 100);
      setProgress(p);
      setMessageIndex(Math.min(3, Math.floor(p / 25)));
      if (p >= 100) {
        clearInterval(interval);
        stopBeepLoop();
        playComplete();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(onComplete, 400);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      <View style={styles.overlay}>
        <ScannerOverlay scanning progress={progress} />
        <View style={styles.progressSection}>
          <Text style={styles.message}>{MESSAGES[messageIndex]}</Text>
          <ScannerProgressBar progress={progress} height={10} />
          <Text style={styles.percent}>{Math.round(progress)}%</Text>
        </View>
      </View>
      <GrassFooter />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    image: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.25)',
    },
    progressSection: {
      position: 'absolute',
      bottom: 100,
      left: Spacing.lg,
      right: Spacing.lg,
    },
    message: {
      color: colors.white,
      fontSize: Typography.sizes.lg,
      fontWeight: Typography.weights.semibold,
      textAlign: 'center',
      marginBottom: Spacing.md,
    },
    percent: {
      color: colors.white,
      fontSize: Typography.sizes.xl,
      fontWeight: Typography.weights.bold,
      textAlign: 'center',
      marginTop: Spacing.sm,
    },
  });
}
