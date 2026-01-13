/**
 * Pantalla Pokedex Plantuna - Catálogo de plantas descubiertas
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { pokedexAPI } from '../../services/api';
import { PokedexEntryResponse } from '../../types';
import { PokedexCard } from '../../components/PokedexCard';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function PokedexScreen() {
  const { theme } = useTheme();
  const [entries, setEntries] = useState<PokedexEntryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  
  const styles = createStyles(theme.colors);

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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Ionicons name="book" size={28} color={theme.colors.primary} />
              <Text style={styles.title}>Pokedex Plantuna</Text>
            </View>
            <View style={styles.statBadge}>
              <Ionicons name="leaf" size={18} color={theme.colors.primary} />
              <Text style={styles.statText}>-</Text>
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Cargando pokedex...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Ionicons name="book" size={28} color={theme.colors.primary} />
            <Text style={styles.title}>Pokedex Plantuna</Text>
          </View>
          <View style={styles.statBadge}>
            <Ionicons name="leaf" size={18} color={theme.colors.primary} />
            <Text style={styles.statText}>{entries.length}</Text>
          </View>
        </View>
      </View>

      {entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="book-outline" size={64} color={theme.colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Tu pokedex está vacía</Text>
          <Text style={styles.emptyDescription}>
            Escanea plantas para comenzar a llenar tu catálogo personal
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleScanPress}>
            <Ionicons name="camera" size={24} color="#fff" />
            <Text style={styles.emptyButtonText}>Escanear Planta</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={({ item }) => (
            <PokedexCard entry={item} onPress={() => handleEntryPress(item)} />
          )}
          keyExtractor={(item) => item.catalog_entry.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}

      {entries.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleScanPress}>
          <Ionicons name="camera" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 0.5,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  statText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: `${colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
