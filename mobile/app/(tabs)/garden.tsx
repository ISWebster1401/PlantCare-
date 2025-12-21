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
import { Ionicons } from '@expo/vector-icons';

export default function GardenScreen() {
  const [plants, setPlants] = useState<PlantResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

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
        // TODO: Navegar a detalles de la planta
        console.log('Plant pressed:', item.id);
      }}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="leaf-outline" size={64} color="#64748b" />
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
        <ActivityIndicator size="large" color="#4caf50" style={styles.loader} />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4caf50" />
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/scan-plant')}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1929',
  },
  header: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#b0bec5',
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
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#b0bec5',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#4caf50',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyStateButtonText: {
    color: '#fff',
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
    backgroundColor: '#4caf50',
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
