/**
 * Badge Component - Estilo Duolingo/Pokémon
 * 
 * Badge para estados con ícono animado (pulse)
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Colors, Typography, BorderRadius, Spacing, HealthStatuses, HealthStatus } from '../../constants/DesignSystem';
import { Emoji } from './Emoji';

export interface BadgeProps {
  status: HealthStatus;
  label?: string;
  showDot?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

const sizeStyles = {
  sm: {
    padding: Spacing.xs,
    fontSize: Typography.sizes.xs,
    iconSize: 12,
    dotSize: 6,
  },
  md: {
    padding: Spacing.sm,
    fontSize: Typography.sizes.sm,
    iconSize: 16,
    dotSize: 8,
  },
  lg: {
    padding: Spacing.md,
    fontSize: Typography.sizes.base,
    iconSize: 20,
    dotSize: 10,
  },
};

export const Badge: React.FC<BadgeProps> = ({
  status,
  label,
  showDot = true,
  size = 'md',
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const statusConfig = HealthStatuses[status];
  const sizeStyle = sizeStyles[size];
  const displayLabel = label || statusConfig.label;

  useEffect(() => {
    // Animación de pulso para el punto
    if (showDot) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        false
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        false
      );
    }
  }, [showDot]);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${statusConfig.color}20`,
          borderColor: statusConfig.color,
          paddingHorizontal: sizeStyle.padding,
          paddingVertical: sizeStyle.padding / 2,
        },
        style,
      ]}
      accessibilityLabel={accessibilityLabel || `${displayLabel} - ${status}`}
      accessibilityRole="text"
    >
      <View style={styles.content}>
        {showDot && (
          <Animated.View
            style={[
              styles.dot,
              {
                width: sizeStyle.dotSize,
                height: sizeStyle.dotSize,
                backgroundColor: statusConfig.color,
                borderRadius: sizeStyle.dotSize / 2,
              },
              dotAnimatedStyle,
            ]}
          />
        )}
        <View style={styles.labelRow}>
          <Emoji name={statusConfig.emoji} size={sizeStyle.iconSize} />
          <Text
            style={[
              styles.text,
              {
                fontSize: sizeStyle.fontSize,
                color: statusConfig.color,
              },
              textStyle,
            ]}
          >
            {displayLabel}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dot: {
    marginRight: Spacing.xs,
  },
  text: {
    fontWeight: Typography.weights.semibold,
  },
});
