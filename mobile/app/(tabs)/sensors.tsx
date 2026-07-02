/**
 * Pantalla Dispositivos - Con modo oscuro (useThemeColors)
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../../components/ui';
import { Typography, Spacing } from '../../constants/DesignSystem';
import { useThemeColors, useThemeGradients } from '../../context/ThemeContext';

export default function SensorsScreen() {
  const colors = useThemeColors();
  const gradients = useThemeGradients();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.ocean as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.title}>🔌 Dispositivos</Text>
        <Text style={styles.subtitle}>Gestiona tus sensores</Text>
      </LinearGradient>

      <View style={styles.content}>
        <Card variant="elevated" style={styles.placeholderCard}>
          <View style={styles.placeholderContent}>
            <Text style={styles.placeholderEmoji}>📡</Text>
            <Text style={styles.placeholderTitle}>Próximamente</Text>
            <Text style={styles.placeholderText}>
              La gestión de sensores estará disponible pronto
            </Text>
          </View>
        </Card>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: 60,
      paddingBottom: Spacing.xl,
      paddingHorizontal: Spacing.lg,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
    },
    title: {
      fontSize: Typography.sizes.giant,
      fontWeight: Typography.weights.extrabold,
      color: colors.white,
      marginBottom: Spacing.xs,
    },
    subtitle: {
      fontSize: Typography.sizes.base,
      fontWeight: Typography.weights.regular,
      color: colors.white,
      opacity: 0.9,
    },
    content: { flex: 1, padding: Spacing.lg, justifyContent: 'center' },
    placeholderCard: { alignItems: 'center', padding: Spacing.xl },
    placeholderContent: { alignItems: 'center' },
    placeholderEmoji: { fontSize: 64, marginBottom: Spacing.md },
    placeholderTitle: {
      fontSize: Typography.sizes.xxl,
      fontWeight: Typography.weights.bold,
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    placeholderText: {
      fontSize: Typography.sizes.base,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
}
