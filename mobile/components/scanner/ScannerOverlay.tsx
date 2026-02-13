/**
 * Overlay con líneas verdes de escaneo (efecto sci-fi)
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useThemeColors } from '../../context/ThemeContext';

interface ScannerOverlayProps {
  scanning?: boolean;
  /** Progreso 0-100 para la línea principal que baja */
  progress?: number;
}

export function ScannerOverlay({
  scanning = true,
  progress = 0,
}: ScannerOverlayProps) {
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const lineOpacity = useSharedValue(0.6);
  const linePosition = useSharedValue(0);

  useEffect(() => {
    linePosition.value = withTiming(progress / 100, { duration: 150 });
  }, [progress]);

  useEffect(() => {
    if (scanning) {
      lineOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.4, { duration: 300 })
        ),
        -1,
        true
      );
    } else {
      lineOpacity.value = withTiming(0.3, { duration: 200 });
    }
  }, [scanning]);

  const scanLineStyle = useAnimatedStyle(() => ({
    opacity: lineOpacity.value,
    transform: [{ translateY: linePosition.value * 400 }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Marco de bordes verdes */}
      <View style={styles.frame}>
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View>

      {/* Línea de escaneo horizontal que baja */}
      <View style={styles.scanLineContainer}>
        <Animated.View style={[styles.scanLine, scanLineStyle]} />
      </View>

      {/* Líneas horizontales estáticas con glow */}
      {[0.2, 0.4, 0.6, 0.8].map((y, i) => (
        <View
          key={i}
          style={[
            styles.horizontalLine,
            { top: `${y * 100}%`, opacity: 0.15 + i * 0.05 },
          ]}
        />
      ))}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  frame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    margin: 16,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.primary,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanLineContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 0,
    bottom: 0,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
  },
  horizontalLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: colors.primary,
  },
  });
}
