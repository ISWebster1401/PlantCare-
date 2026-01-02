/**
 * Pantalla Tu Jardín - Lista de plantas
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
import { plantsAPI } from '../../services/api';
import { PlantResponse } from '../../types';
import { PlantCard } from '../../components/PlantCard';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function GardenScreen() {
  const { theme } = useTheme();
  const [plants, setPlants] = useState<PlantResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  
  const styles = createStyles(theme.colors);

  const loadPlants = async () => {
    try {
      const plantsList = await plantsAPI.getMyPlants();
      setPlants(plantsList);
    } catch (error) {
      console.error('Error cargando plantas:', error);
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

  const renderPlant = ({ item }: { item: PlantResponse }) => (
    <PlantCard
      plant={item}
      onPress={() => {
        router.push(`/plant-detail?id=${item.id}`);
      }}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="leaf-outline" size={64} color={theme.colors.iconSecondary} />
      <Text style={styles.emptyStateTitle}>No tienes plantas aún</Text>
      <Text style={styles.emptyStateText}>
        Comienza escaneando tu primera planta
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => router.push('/scan-plant')}
      >
        <Text style={styles.emptyStateButtonText}>Escanear Planta</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌿 Tu Jardín</Text>
        <Text style={styles.subtitle}>{plants.length} {plants.length === 1 ? 'planta' : 'plantas'}</Text>
      </View>

      <FlatList
        data={plants}
        renderItem={renderPlant}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={plants.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/scan-plant')}
      >
        <Ionicons name="add" size={32} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  emptyList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyStateButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
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
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  loader: {
    marginTop: 100,
  },
});
