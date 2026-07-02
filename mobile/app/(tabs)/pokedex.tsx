/**
 * Pantalla Plantadex - Con modo oscuro (useThemeColors)
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
import { pokedexAPI } from '../../services/api';
import { PokedexEntryResponse } from '../../types';
import { PokedexCard } from '../../components/PokedexCard';
import { Button } from '../../components/ui';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/DesignSystem';
import { useThemeColors, useThemeGradients } from '../../context/ThemeContext';

type ViewMode = 'list' | 'grid';

export default function PokedexScreen() {
  const [entries, setEntries] = useState<PokedexEntryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const gradients = useThemeGradients();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const loadEntries = async () => {
    try {
      const entriesList = await pokedexAPI.getPokedexEntries();
      setEntries(entriesList);
    } catch (error: any) {
      if (error.isNetworkError || error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        console.error('❌ Error de conexión al cargar pokedex:', error.userMessage || error.message);
      } else {
        console.error('Error cargando pokedex:', error);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadEntries();
  };

  const handleScanPress = () => {
    router.push('/scan-pokedex');
  };

  const handleEntryPress = (entry: PokedexEntryResponse) => {
    router.push({
      pathname: '/pokedex-entry-detail',
      params: { id: entry.catalog_entry.entry_number.toString() },
    });
  };

  const unlockedCount = entries.filter(e => e.is_unlocked).length;
  const totalCount = entries.length;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={gradients.primary as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.title}>📚 Plantadex</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando pokedex...</Text>
        </View>
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
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>📚 Plantadex</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBadge}>
                <Text style={styles.progressText}>
                  ✔ {unlockedCount}/{totalCount}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.viewModeContainer}>
            <TouchableOpacity
              style={[
                styles.viewModeToggle,
                viewMode === 'list' ? styles.viewModeToggleActive : styles.viewModeToggleInactive,
              ]}
              onPress={() => setViewMode('list')}
              accessibilityLabel="Ver como lista"
            >
              <Ionicons
                name="list"
                size={20}
                color={viewMode === 'list' ? colors.primaryDark : colors.white}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.viewModeToggle,
                viewMode === 'grid' ? styles.viewModeToggleActive : styles.viewModeToggleInactive,
              ]}
              onPress={() => setViewMode('grid')}
              accessibilityLabel="Ver como cuadrícula"
            >
              <Ionicons
                name="grid"
                size={18}
                color={viewMode === 'grid' ? colors.primaryDark : colors.white}
              />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyEmoji}>📖</Text>
          </View>
          <Text style={styles.emptyTitle}>Tu pokedex está vacía</Text>
          <Text style={styles.emptyDescription}>
            Escanea plantas para comenzar a llenar tu catálogo personal
          </Text>
          <Button
            title="Escanear Planta"
            onPress={handleScanPress}
            variant="primary"
            size="lg"
            icon="camera"
            iconPosition="left"
            style={styles.emptyButton}
          />
        </View>
      ) : (
        <FlatList
          key={`flatlist-${viewMode}`}
          data={entries}
          renderItem={({ item }) => (
            <PokedexCard
              entry={item}
              onPress={() => handleEntryPress(item)}
              viewMode={viewMode}
            />
          )}
          keyExtractor={(item) => item.catalog_entry.id.toString()}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
          contentContainerStyle={viewMode === 'grid' ? styles.gridContent : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {entries.length > 0 && (
        <View style={[styles.fabContainer, { bottom: insets.bottom + Spacing.lg }]}>
          <TouchableOpacity
            style={styles.fab}
            onPress={handleScanPress}
            activeOpacity={0.8}
            accessibilityLabel="Escanear planta"
            accessibilityRole="button"
          >
            <Ionicons name="camera" size={28} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: 60,
      paddingBottom: Spacing.lg,
      paddingHorizontal: Spacing.lg,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
    },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    titleContainer: { flex: 1 },
    title: {
      fontSize: Typography.sizes.giant,
      fontWeight: Typography.weights.extrabold,
      color: colors.white,
      marginBottom: Spacing.sm,
    },
    progressContainer: { alignSelf: 'flex-start' },
    progressBadge: {
      backgroundColor: colors.white,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      borderWidth: 2,
      borderColor: colors.primaryDark,
      ...Shadows.md,
    },
    progressText: {
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.bold,
      color: colors.primaryDark,
    },
    viewModeContainer: { flexDirection: 'row', gap: Spacing.xs },
    viewModeToggle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewModeToggleActive: {
      backgroundColor: colors.white,
    },
    viewModeToggleInactive: {
      backgroundColor: colors.white + '22',
      borderWidth: 1,
      borderColor: colors.white + '55',
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: Spacing.md, fontSize: Typography.sizes.base, color: colors.textSecondary },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
    emptyIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.secondary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.xl,
    },
    emptyEmoji: { fontSize: 64 },
    emptyTitle: {
      fontSize: Typography.sizes.xxl,
      fontWeight: Typography.weights.bold,
      color: colors.text,
      marginBottom: Spacing.md,
      textAlign: 'center',
    },
    emptyDescription: {
      fontSize: Typography.sizes.base,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: Spacing.xl,
      lineHeight: 24,
      paddingHorizontal: Spacing.lg,
    },
    emptyButton: { minWidth: 200 },
    listContent: { padding: Spacing.lg, paddingBottom: 100 },
    gridRow: { justifyContent: 'space-between', paddingHorizontal: Spacing.md },
    gridContent: { paddingTop: Spacing.md, paddingBottom: 100 },
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
  });
}
