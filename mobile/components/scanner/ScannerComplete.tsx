/**
 * Pantalla de éxito post-escaneo: Lottie/confetti, preview (imagen o 3D), botón Continuar
 * Estilo Pokémon GO - fondo cielo/pasto, pasto abajo
 */
import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/DesignSystem';
import { useThemeColors, useThemeGradients } from '../../context/ThemeContext';
import { Emoji } from '../ui';
import { GrassFooter } from '../decorative';
import { Model3DViewer } from '../Model3DViewer';

const { width } = Dimensions.get('window');
const PREVIEW_SIZE = width - Spacing.lg * 2;
const PREVIEW_HEIGHT = Math.min(PREVIEW_SIZE * 0.75, 280);

const LOTTIE_SUCCESS = (() => {
  try {
    return require('../../assets/lottie/success.json');
  } catch {
    return null;
  }
})();

export interface ScannerCompleteProps {
  imageUri: string;
  model3dUrl?: string | null;
  onContinue: () => void;
}

export function ScannerComplete({ imageUri, model3dUrl, onContinue }: ScannerCompleteProps) {
  const colors = useThemeColors();
  const gradients = useThemeGradients();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12 });
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    buttonScale.value = withSequence(
      withSpring(1.08, { damping: 10 }),
      withSpring(1)
    );
    onContinue();
  };

  const animatedBoxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  let successContent: React.ReactNode;
  if (LOTTIE_SUCCESS) {
    try {
      const LottieView = require('lottie-react-native').default;
      successContent = (
        <LottieView
          source={LOTTIE_SUCCESS}
          autoPlay
          loop={false}
          style={styles.lottieSuccess}
        />
      );
    } catch {
      successContent = (
        <View style={styles.emojiSuccess}>
          <Emoji name="check" size={56} />
        </View>
      );
    }
  } else {
    successContent = (
      <View style={styles.emojiSuccess}>
        <Emoji name="check" size={56} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E3F2FD', '#E8F5E9', '#C8E6C9']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <Animated.View style={[styles.successRow, animatedBoxStyle]}>
          {successContent}
          <Text style={styles.title}>¡Planta escaneada!</Text>
          <Text style={styles.subtitle}>Ahora la vamos a identificar</Text>
        </Animated.View>

        <View style={styles.previewWrap}>
          {model3dUrl ? (
            <View style={styles.model3dContainer}>
              <Model3DViewer
                modelUrl={model3dUrl}
                style={styles.model3dViewer}
                gardenBackground
              />
            </View>
          ) : (
            <View style={styles.imageCard}>
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View style={styles.previewBadge}>
                <Emoji name="plant" size={20} />
                <Text style={styles.previewBadgeText}>Tu foto</Text>
              </View>
            </View>
          )}
        </View>

        <Animated.View style={animatedButtonStyle}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleContinue}
            style={styles.ctaTouch}
          >
            <LinearGradient
              colors={gradients.greenButton as unknown as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>Continuar</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <GrassFooter />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: {
      flex: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
      alignItems: 'center',
    },
    successRow: { alignItems: 'center', marginBottom: Spacing.lg },
    lottieSuccess: { width: 100, height: 100 },
    emojiSuccess: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.primaryPastel,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: Typography.sizes.xxl,
      fontWeight: Typography.weights.bold,
      color: colors.text,
      marginTop: Spacing.sm,
    },
    subtitle: {
      fontSize: Typography.sizes.base,
      color: colors.textSecondary,
      marginTop: Spacing.xs,
    },
    previewWrap: {
      width: '100%',
      alignItems: 'center',
      marginBottom: Spacing.xl,
    },
    model3dContainer: {
      width: PREVIEW_SIZE,
      height: PREVIEW_HEIGHT,
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
      ...Shadows.medium,
      backgroundColor: colors.backgroundLighter,
    },
    model3dViewer: { width: '100%', height: '100%' },
    imageCard: {
      width: PREVIEW_SIZE,
      height: PREVIEW_HEIGHT,
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
      ...Shadows.medium,
      borderWidth: 2,
      borderColor: colors.primaryPastel,
    },
    previewImage: { width: '100%', height: '100%' },
    previewBadge: {
      position: 'absolute',
      bottom: Spacing.sm,
      left: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.9)',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: BorderRadius.full,
    },
    previewBadgeText: {
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.semibold,
      color: colors.text,
    },
    ctaTouch: {
      borderRadius: BorderRadius.full,
      overflow: 'hidden',
      ...Shadows.float,
    },
    cta: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xxl,
      minWidth: 220,
      alignItems: 'center',
    },
    ctaText: {
      fontSize: Typography.sizes.lg,
      fontWeight: Typography.weights.bold,
      color: colors.white,
    },
  });
}
