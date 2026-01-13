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
    } catch (error: any) {
      // Manejar errores de red de forma más clara
      if (error.isNetworkError || error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        console.error('❌ Error de conexión al cargar plantas:', error.userMessage || error.message);
        console.error('   Base URL:', error.baseURL || 'Verificar Config.ts');
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
      <View style={styles.emptyIconContainer}>
        <Ionicons name="leaf-outline" size={80} color={theme.colors.iconSecondary} />
      </View>
      <Text style={styles.emptyStateTitle}>No tienes plantas aún</Text>
      <Text style={styles.emptyStateText}>
        Comienza escaneando tu primera planta y dale vida a tu jardín virtual
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => router.push('/scan-plant')}
        activeOpacity={0.8}
      >
        <Ionicons name="camera" size={24} color="#fff" />
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
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>🌿 Tu Jardín</Text>
            <Text style={styles.subtitle}>{plants.length} {plants.length === 1 ? 'planta' : 'plantas'}</Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statBadge}>
              <Ionicons name="leaf" size={20} color={theme.colors.primary} />
              <Text style={styles.statText}>{plants.length}</Text>
            </View>
          </View>
        </View>
      </View>

      <FlatList
        data={plants}
        renderItem={renderPlant}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={plants.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/scan-plant')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  headerStats: {
    flexDirection: 'row',
    gap: 12,
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  list: {
    padding: 16,
    paddingTop: 16,
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
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: `${colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
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
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loader: {
    marginTop: 100,
  },
});
