/**
 * Pantalla Tu Jardín - Con modo oscuro (useThemeColors)
 */
import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { plantsAPI, streaksAPI, StreakRecord } from '../../services/api';
import { refreshReminderContent } from '../../services/notifications';
import { PlantResponse } from '../../types';
import { PlantCard } from '../../components/PlantCard';
import { Button } from '../../components/ui';
import { Typography, Spacing, Shadows } from '../../constants/DesignSystem';
import { useThemeColors, useThemeGradients } from '../../context/ThemeContext';

export default function GardenScreen() {
  const [plants, setPlants] = useState<PlantResponse[]>([]);
  const [streak, setStreak] = useState<StreakRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const gradients = useThemeGradients();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const loadPlants = async () => {
    // La racha es complementaria: si falla no debe impedir ver el jardín
    streaksAPI
      .getMyStreak()
      .then(setStreak)
      .catch(() => setStreak(null));

    try {
      const plantsList = await plantsAPI.getMyPlants();
      setPlants(plantsList);
      // El recordatorio de mañana se redacta ahora, con el estado de hoy: una
      // notificación local no puede consultar nada cuando suena.
      refreshReminderContent(plantsList);
    } catch (error: any) {
      if (error.isNetworkError || error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        console.error('❌ Error de conexión al cargar plantas:', error.userMessage || error.message);
      } else {
        console.error('Error cargando plantas:', error);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Recargar al enfocar la pantalla: así la racha se actualiza al volver de regar
  useFocusEffect(
    useCallback(() => {
      loadPlants();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadPlants();
  };

  const renderPlant = ({ item, index }: { item: PlantResponse; index: number }) => (
    <PlantCard
      plant={item}
      onPress={() => {
        router.push(`/plant-detail?id=${item.id}`);
      }}
      style={{ marginBottom: Spacing.md }}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Text style={styles.emptyEmoji}>🌱</Text>
      </View>
      <Text style={styles.emptyStateTitle}>No tienes plantas aún</Text>
      <Text style={styles.emptyStateText}>
        Comienza escaneando tu primera planta y dale vida a tu jardín virtual
      </Text>
      <Button
        title="Escanear Planta"
        onPress={() => router.push('/scan-plant')}
        variant="primary"
        size="lg"
        icon="camera"
        iconPosition="left"
        style={styles.emptyStateButton}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.title}>🌿 Tu Jardín</Text>
        <View style={styles.headerMeta}>
          <Text style={styles.subtitle}>
            {plants.length} {plants.length === 1 ? 'planta' : 'plantas'}
          </Text>
          {!!streak && streak.current_streak > 0 && (
            <View style={styles.streakPill}>
              <Text style={styles.streakText}>
                🔥 {streak.current_streak}{' '}
                {streak.current_streak === 1 ? 'día' : 'días'}
              </Text>
            </View>
          )}
        </View>
        {!!streak && streak.at_risk && (
          <Text style={styles.streakHint}>Riega hoy para no perder tu racha</Text>
        )}
      </LinearGradient>

      <FlatList
        data={plants}
        renderItem={renderPlant}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={plants.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />

      {/* FAB para agregar planta */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + Spacing.lg }]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/scan-plant')}
          activeOpacity={0.8}
          accessibilityLabel="Escanear planta"
          accessibilityRole="button"
        >
          <Ionicons name="camera" size={28} color={colors.white} />
        </TouchableOpacity>
      </View>
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
    headerMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    streakPill: {
      backgroundColor: 'rgba(255,255,255,0.22)',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: 999,
    },
    streakText: {
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.bold,
      color: colors.white,
    },
    streakHint: {
      fontSize: Typography.sizes.xs,
      fontWeight: Typography.weights.medium,
      color: colors.white,
      opacity: 0.85,
      marginTop: Spacing.xs,
    },
    subtitle: {
      fontSize: Typography.sizes.base,
      fontWeight: Typography.weights.regular,
      color: colors.white,
      opacity: 0.9,
    },
    list: {
      padding: Spacing.lg,
      paddingBottom: 100,
    },
    emptyList: { flex: 1 },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xl,
    },
    emptyIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.xl,
    },
    emptyEmoji: { fontSize: 64 },
    emptyStateTitle: {
      fontSize: Typography.sizes.xxl,
      fontWeight: Typography.weights.bold,
      color: colors.text,
      marginBottom: Spacing.md,
      textAlign: 'center',
    },
    emptyStateText: {
      fontSize: Typography.sizes.base,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: Spacing.xl,
      lineHeight: 24,
      paddingHorizontal: Spacing.lg,
    },
    emptyStateButton: { minWidth: 200 },
    fabContainer: { position: 'absolute', right: Spacing.lg },
    fab: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...Shadows.lg,
    },
    loader: { marginTop: 100 },
  });
}
