/**
 * Pantalla de Configuración - Con modo oscuro (Light / Dark / Sistema)
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '../components/ui';
import { Typography, Spacing } from '../constants/DesignSystem';
import { useThemeColors, useThemeGradients, useTheme } from '../context/ThemeContext';
import type { ThemeMode } from '../context/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const gradients = useThemeGradients();
  const { themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.ocean as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Button
          title=""
          onPress={() => router.back()}
          variant="ghost"
          size="sm"
          icon="arrow-back"
          style={styles.backButton}
        />
        <Text style={styles.headerTitle}>⚙️ Configuración</Text>
        <View style={styles.backButtonPlaceholder} />
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card variant="elevated" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="moon-outline" size={24} color={colors.secondary} />
            <Text style={styles.sectionTitle}>Apariencia</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Elige el modo claro, oscuro o sigue el del sistema.
          </Text>
          <View style={styles.themeRow}>
            {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.themeOption,
                  themeMode === mode && styles.themeOptionActive,
                  themeMode === mode && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
                ]}
                onPress={() => setThemeMode(mode)}
              >
                <Ionicons
                  name={mode === 'light' ? 'sunny' : mode === 'dark' ? 'moon' : 'phone-portrait-outline'}
                  size={22}
                  color={themeMode === mode ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: themeMode === mode ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {mode === 'light' ? 'Claro' : mode === 'dark' ? 'Oscuro' : 'Sistema'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card variant="elevated" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={24} color={colors.secondary} />
            <Text style={styles.sectionTitle}>Información</Text>
          </View>

          <TouchableOpacity
            style={styles.infoItem}
            onPress={() => {}}
            activeOpacity={0.85}
          >
            <View style={styles.infoItemLeft}>
              <View style={styles.infoIcon}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.infoLabel}>Acerca de</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoItem}
            onPress={() => {}}
            activeOpacity={0.85}
          >
            <View style={styles.infoItemLeft}>
              <View style={styles.infoIcon}>
                <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.infoLabel}>Ayuda</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.lg,
      paddingTop: 60,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
    },
    headerTitle: {
      fontSize: Typography.sizes.xl,
      fontWeight: Typography.weights.bold,
      color: colors.white,
    },
    backButton: { width: 40, height: 40, padding: 0 },
    backButtonPlaceholder: { width: 40 },
    content: { flex: 1 },
    contentContainer: { padding: Spacing.lg },
    section: { marginBottom: Spacing.md },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    sectionTitle: {
      fontSize: Typography.sizes.lg,
      fontWeight: Typography.weights.bold,
      color: colors.text,
      marginLeft: Spacing.sm,
    },
    sectionDescription: {
      fontSize: Typography.sizes.sm,
      color: colors.textSecondary,
      marginBottom: Spacing.md,
    },
    themeRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    themeOption: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.backgroundLighter,
    },
    themeOptionActive: {},
    themeOptionText: {
      fontSize: Typography.sizes.sm,
      fontWeight: '600',
      marginTop: Spacing.xs,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.primary + '55',
      backgroundColor: colors.backgroundLight,
      marginTop: Spacing.sm,
    },
    infoItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    infoIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '15',
    },
    infoLabel: {
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.semibold,
      color: colors.text,
    },
  });
}
