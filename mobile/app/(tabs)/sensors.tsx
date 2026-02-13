/**
 * Pantalla de Sensores/Dispositivos - Rediseñada con DesignSystem
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Button } from '../../components/ui';
import { Colors, Typography, Spacing, Gradients } from '../../constants/DesignSystem';

export default function SensorsScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Gradients.ocean}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.regular,
    color: Colors.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  placeholderCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  placeholderContent: {
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  placeholderTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  placeholderText: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
