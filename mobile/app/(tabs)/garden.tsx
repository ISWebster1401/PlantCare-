/**
 * Pantalla Tu Jardín - Con modo oscuro (useThemeColors)
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { plantsAPI } from '../../services/api';
import { PlantResponse } from '../../types';
import { PlantCard } from '../../components/PlantCard';
import { Button } from '../../components/ui';
import { Typography, Spacing, Shadows } from '../../constants/DesignSystem';
import { useThemeColors, useThemeGradients } from '../../context/ThemeContext';

export default function GardenScreen() {
  const [plants, setPlants] = useState<PlantResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const gradients = useThemeGradients();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const loadPlants = async () => {
    try {
      const plantsList = await plantsAPI.getMyPlants();
      setPlants(plantsList);
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

  useEffect(() => {
    loadPlants();
  }, []);

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
        <Text style={styles.subtitle}>
          {plants.length} {plants.length === 1 ? 'planta' : 'plantas'}
        </Text>
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
