/**
 * Pantalla de Configuración - Con modo oscuro (Light / Dark / Sistema)
 */
import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '../components/ui';
import { Typography, Spacing } from '../constants/DesignSystem';
import { useThemeColors, useThemeGradients, useTheme } from '../context/ThemeContext';
import type { ThemeMode } from '../context/ThemeContext';
import {
  getPrefs,
  scheduleWateringReminder,
  cancelWateringReminder,
  sendTestReminder,
  buildReminderText,
  DEFAULT_PREFS,
  type ReminderPrefs,
} from '../services/notifications';
import { plantsAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Legal } from '../constants/Legal';

/** Horas ofrecidas para el recordatorio. */
const HOURS = [8, 9, 12, 19, 21];

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const gradients = useThemeGradients();
  const { themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [reminder, setReminder] = useState<ReminderPrefs>(DEFAULT_PREFS);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { logout } = useAuth();

  // Apple exige poder eliminar la cuenta desde dentro de la app (guía 5.1.1(v)).
  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await authAPI.deleteAccount();
      await cancelWateringReminder().catch(() => {});
      await logout();
      router.replace('/(auth)/login');
    } catch (error: any) {
      Alert.alert(
        'No se pudo eliminar',
        error.response?.data?.detail || 'Revisa tu conexión e inténtalo de nuevo.',
      );
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Se borrarán para siempre tu perfil, plantas, fotos, conversaciones, logros y amistades. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar definitivamente', style: 'destructive', onPress: deleteAccount },
      ],
    );
  };

  useEffect(() => {
    getPrefs().then(setReminder);
  }, []);

  const toggleReminder = async (on: boolean) => {
    setBusy(true);
    try {
      if (!on) {
        await cancelWateringReminder();
        setReminder((r) => ({ ...r, enabled: false }));
        return;
      }
      const ok = await scheduleWateringReminder(reminder.hour, reminder.minute);
      if (ok) {
        setReminder((r) => ({ ...r, enabled: true }));
      } else {
        Alert.alert(
          'Permiso necesario',
          'Activa las notificaciones para PlantCare desde los ajustes de tu teléfono.',
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const changeHour = async (hour: number) => {
    setReminder((r) => ({ ...r, hour }));
    if (reminder.enabled) {
      await scheduleWateringReminder(hour, reminder.minute);
    }
  };

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
            <Ionicons name="notifications-outline" size={24} color={colors.secondary} />
            <Text style={styles.sectionTitle}>Recordatorio de riego</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Un aviso diario para que no pierdas tu racha.
          </Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Avisarme todos los días</Text>
            <Switch
              value={reminder.enabled}
              onValueChange={toggleReminder}
              disabled={busy}
              trackColor={{ false: colors.backgroundLighter, true: colors.primaryLight }}
              thumbColor={reminder.enabled ? colors.primary : colors.textMuted}
            />
          </View>

          {reminder.enabled && (
            <>
              <Text style={styles.hourLabel}>¿A qué hora?</Text>
              <View style={styles.hourRow}>
                {HOURS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.hourChip, reminder.hour === h && styles.hourChipActive]}
                    onPress={() => changeHour(h)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.hourChipText,
                        reminder.hour === h && styles.hourChipTextActive,
                      ]}
                    >
                      {String(h).padStart(2, '0')}:00
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity
            style={styles.testButton}
            onPress={async () => {
              // Prueba con el texto real, no el genérico: así se ve tal cual
              // llegará mañana, nombrando la planta más sedienta.
              let texto;
              try {
                texto = buildReminderText(await plantsAPI.getMyPlants());
              } catch {
                texto = undefined;
              }
              const ok = await sendTestReminder(texto);
              Alert.alert(
                ok ? 'Listo' : 'Permiso necesario',
                ok
                  ? 'Te llega una notificación de prueba en 5 segundos.'
                  : 'Activa las notificaciones para PlantCare desde los ajustes de tu teléfono.',
              );
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="play-outline" size={18} color={colors.primary} />
            <Text style={styles.testButtonText}>Probar ahora</Text>
          </TouchableOpacity>
        </Card>

        <Card variant="elevated" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={24} color={colors.secondary} />
            <Text style={styles.sectionTitle}>Información</Text>
          </View>

          {[
            { label: 'Política de privacidad', icon: 'shield-checkmark-outline' as const, url: Legal.PRIVACY_URL },
            { label: 'Términos de uso', icon: 'document-text-outline' as const, url: Legal.TERMS_URL },
            { label: 'Ayuda y soporte', icon: 'help-circle-outline' as const, url: Legal.SUPPORT_URL },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.infoItem}
              onPress={() => WebBrowser.openBrowserAsync(item.url)}
              activeOpacity={0.85}
            >
              <View style={styles.infoItemLeft}>
                <View style={styles.infoIcon}>
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                </View>
                <Text style={styles.infoLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </Card>

        <Card variant="elevated" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-remove-outline" size={24} color={colors.secondary} />
            <Text style={styles.sectionTitle}>Cuenta</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Eliminar tu cuenta borra de forma permanente tu perfil, tus plantas, fotos,
            conversaciones, logros y amistades. No se puede deshacer.
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={confirmDeleteAccount}
            disabled={deleting}
            activeOpacity={0.8}
          >
            {deleting ? (
              <ActivityIndicator color="#D64545" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#D64545" />
                <Text style={styles.deleteButtonText}>Eliminar mi cuenta</Text>
              </>
            )}
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
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    switchLabel: {
      flex: 1,
      fontSize: Typography.sizes.base,
      color: colors.text,
    },
    hourLabel: {
      fontSize: Typography.sizes.sm,
      color: colors.textSecondary,
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
    },
    hourRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    hourChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.primaryLight,
      backgroundColor: colors.background,
    },
    hourChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    hourChipText: {
      fontSize: Typography.sizes.sm,
      color: colors.textSecondary,
    },
    hourChipTextActive: {
      color: colors.white,
      fontWeight: Typography.weights.semibold,
    },
    testButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.primaryLight,
    },
    testButtonText: {
      fontSize: Typography.sizes.sm,
      color: colors.primary,
      fontWeight: Typography.weights.semibold,
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
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      minHeight: 48,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#D64545',
    },
    deleteButtonText: {
      fontSize: Typography.sizes.sm,
      color: '#D64545',
      fontWeight: Typography.weights.semibold,
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
