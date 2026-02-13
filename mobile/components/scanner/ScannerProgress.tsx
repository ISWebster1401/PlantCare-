/**
 * Barra de progreso del scanner
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Typography, Spacing } from '../../constants/DesignSystem';
import { useThemeColors } from '../../context/ThemeContext';

export function ScannerProgressBar({
  progress,
  height = 8,
}: {
  progress: number;
  height?: number;
}) {
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.min(100, Math.max(0, progress)) / 100, { duration: 150 });
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={[styles.barContainer, { height }]}>
      <View style={[styles.barTrack, { height }]}>
        <Animated.View style={[styles.barFill, { height }, fillStyle]} />
      </View>
    </View>
  );
}

/** Con texto de porcentaje */
export function ScannerProgressWithLabel({
  progress,
  label,
}: {
  progress: number;
  label?: string;
}) {
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.labeledContainer}>
      <ScannerProgressBar progress={progress} height={10} />
      <View style={styles.labelRow}>
        <Text style={styles.percentText}>{Math.round(progress)}%</Text>
        {label && <Text style={styles.labelText}>{label}</Text>}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    labeledContainer: { width: '100%' },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: Spacing.xs,
    },
    labelText: {
      color: colors.textSecondary,
      fontSize: Typography.sizes.sm,
    },
    barContainer: { width: '100%' },
    barTrack: {
      width: '100%',
      backgroundColor: colors.backgroundLighter,
      borderRadius: 999,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 999,
    },
    percentText: {
      color: colors.text,
      fontWeight: Typography.weights.bold,
    },
  });
}
