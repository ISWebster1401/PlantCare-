/**
 * Pantalla de selección estilo Pokémon GO: swipe entre Escanear / Galería
 * Fondo cielo→pasto, nubes, plantita protagonista, pasto abajo
 */
import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions,
  NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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
import { CloudsBackground, GrassFooter } from '../decorative';
import { LottieHero } from './LottieHero';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - Spacing.lg * 2;

export type ScanMode = 'live' | 'gallery';

export interface ScannerSelectionProps {
  onSelect: (mode: ScanMode) => void;
  onBack?: () => void;
}

export function ScannerSelection({ onSelect, onBack }: ScannerSelectionProps) {
  const colors = useThemeColors();
  const gradients = useThemeGradients();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [page, setPage] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const buttonScale = useSharedValue(1);

  const handleSelect = (mode: ScanMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    buttonScale.value = withSpring(1.1, { damping: 10 }, () => {
      buttonScale.value = withTiming(1);
    });
    onSelect(mode);
  };

  const onPageSelected = (e: NativeSyntheticEvent<{ position: number }>) => {
    setPage(e.nativeEvent.position);
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const currentMode: ScanMode = page === 0 ? 'live' : 'gallery';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB', '#E8F5E9', '#C8E6C9']}
        locations={[0, 0.35, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <CloudsBackground />

      {onBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      )}

      <View style={styles.content}>
        <LottieHero size={180} />

        <Text style={styles.title}>¿Cómo quieres conocer tu planta?</Text>

        <View style={styles.pagerWrap}>
          <PagerView
            ref={pagerRef}
            style={styles.pager}
            initialPage={0}
            onPageSelected={onPageSelected}
          >
            <View key="0" style={styles.page} collapsable={false}>
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => handleSelect('live')}
              >
                <View style={styles.cardIconWrap}>
                  <Emoji name="camera" size={48} />
                </View>
                <Text style={styles.cardTitle}>Escanear en vivo</Text>
                <Text style={styles.cardSubtitle}>
                  Usa la cámara para identificar tu planta
                </Text>
              </Pressable>
            </View>
            <View key="1" style={styles.page} collapsable={false}>
              <Pressable
                style={({ pressed }) => [styles.card, styles.cardBlue, pressed && styles.cardPressed]}
                onPress={() => handleSelect('gallery')}
              >
                <View style={[styles.cardIconWrap, styles.cardIconBlue]}>
                  <Emoji name="sparkles" size={48} />
                </View>
                <Text style={styles.cardTitle}>Subir foto</Text>
                <Text style={styles.cardSubtitle}>
                  Elige una foto de tu galería
                </Text>
              </Pressable>
            </View>
          </PagerView>
        </View>

        <View style={styles.dots}>
          <View style={[styles.dot, page === 0 && styles.dotActive]} />
          <View style={[styles.dot, page === 1 && styles.dotActive]} />
        </View>

        <Text style={styles.hint}>Desliza para ver más</Text>

        <Animated.View style={buttonStyle}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handleSelect(currentMode)}
            style={styles.ctaTouch}
          >
            <LinearGradient
              colors={
                currentMode === 'live'
                  ? (gradients.greenButton as unknown as [string, string])
                  : (gradients.blueButton as unknown as [string, string])
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>
                {currentMode === 'live' ? 'Escanear ahora' : 'Elegir de galería'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <GrassFooter />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    backButton: {
      position: 'absolute',
      top: 56,
      left: Spacing.md,
      zIndex: 10,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.backgroundLight,
      justifyContent: 'center',
      alignItems: 'center',
      ...Shadows.soft,
    },
    content: {
      flex: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
      alignItems: 'center',
    },
    title: {
      fontSize: Typography.sizes.xxl,
      fontWeight: Typography.weights.bold,
      color: colors.text,
      textAlign: 'center',
      marginTop: Spacing.md,
      marginBottom: Spacing.xl,
      paddingHorizontal: Spacing.sm,
    },
    pagerWrap: { flex: 1, width: '100%', minHeight: 220 },
    pager: { flex: 1 },
    page: {
      paddingHorizontal: Spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      width: CARD_WIDTH,
      backgroundColor: colors.backgroundLight,
      borderRadius: 24,
      padding: Spacing.xl,
      alignItems: 'center',
      ...Shadows.medium,
      borderWidth: 2,
      borderColor: colors.primaryPastel,
    },
    cardPressed: { opacity: 0.9 },
    cardBlue: { borderColor: colors.secondaryLight },
    cardIconWrap: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.primaryPastel,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    cardIconBlue: { backgroundColor: colors.secondaryLight + '30' },
    cardTitle: {
      fontSize: Typography.sizes.xl,
      fontWeight: Typography.weights.bold,
      color: colors.text,
      marginBottom: Spacing.xs,
    },
    cardSubtitle: {
      fontSize: Typography.sizes.sm,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    dots: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.textMuted,
    },
    dotActive: { backgroundColor: colors.primary, width: 24 },
    hint: { fontSize: Typography.sizes.xs, color: colors.textMuted, marginTop: Spacing.sm },
    ctaTouch: {
      marginTop: Spacing.lg,
      borderRadius: BorderRadius.full,
      overflow: 'hidden',
      ...Shadows.float,
    },
    cta: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xxl,
      minWidth: 260,
      alignItems: 'center',
    },
    ctaText: {
      fontSize: Typography.sizes.lg,
      fontWeight: Typography.weights.bold,
      color: colors.white,
    },
  });

ScannerSelection.displayName = 'ScannerSelection';
