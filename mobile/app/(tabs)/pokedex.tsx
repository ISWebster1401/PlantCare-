/**
 * Pantalla Pokedex - Rediseñada con DesignSystem
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { pokedexAPI } from '../../services/api';
import { PokedexEntryResponse } from '../../types';
import { PokedexCard } from '../../components/PokedexCard';
import { Button, Badge } from '../../components/ui';
import { Colors, Typography, Spacing, BorderRadius, Gradients, Shadows } from '../../constants/DesignSystem';

type ViewMode = 'list' | 'grid';

export default function PokedexScreen() {
  const [entries, setEntries] = useState<PokedexEntryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const router = useRouter();

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
          colors={Gradients.ocean}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.title}>📚 Pokedex Plantuna</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Cargando pokedex...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con gradiente */}
      <LinearGradient
        colors={Gradients.ocean}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>📚 Pokedex Plantuna</Text>
            <View style={styles.progressContainer}>
              <Badge
                status="healthy"
                label={`${unlockedCount}/${totalCount}`}
                size="sm"
              />
            </View>
          </View>
          <View style={styles.viewModeContainer}>
            <Button
              title=""
              onPress={() => setViewMode('list')}
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              icon="list"
              style={styles.viewModeButton}
            />
            <Button
              title=""
              onPress={() => setViewMode('grid')}
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              icon="grid"
              style={styles.viewModeButton}
            />
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
          contentContainerStyle={viewMode === 'grid' ? styles.gridContent : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}

      {entries.length > 0 && (
        <View style={styles.fabContainer}>
          <Button
            title=""
            onPress={handleScanPress}
            variant="primary"
            size="lg"
            icon="camera"
            style={styles.fab}
          />
        </View>
      )}
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
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.sizes.giant,
    fontWeight: Typography.weights.extrabold,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  progressContainer: {
    alignSelf: 'flex-start',
  },
  viewModeContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  viewModeButton: {
    width: 40,
    height: 40,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${Colors.secondary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
  },
  emptyButton: {
    minWidth: 200,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  gridContent: {
    padding: Spacing.sm,
    paddingBottom: 100,
    justifyContent: 'flex-start',
  },
  fabContainer: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    ...Shadows.lg,
  },
});
