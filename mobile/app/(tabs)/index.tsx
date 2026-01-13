/**
 * Pantalla Home/Dashboard
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { plantsAPI, sensorsAPI } from '../../services/api';
import { PlantResponse } from '../../types';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  
  const styles = createStyles(theme.colors);
  const [plantCount, setPlantCount] = useState(0);
  const [activeSensors, setActiveSensors] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [plants, sensors] = await Promise.all([
        plantsAPI.getMyPlants(),
        sensorsAPI.getMySensors(),
      ]);

      setPlantCount(plants.length);
      setActiveSensors(sensors.filter((s) => s.status === 'active').length);
    } catch (error: any) {
      // Solo loguear errores que no sean de autenticación (401/403)
      // Los errores de auth se manejan en el interceptor de axios
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        // Manejar errores de red de forma más clara
        if (error.isNetworkError || error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
          console.error('❌ Error de conexión:', error.userMessage || error.message);
          console.error('   Base URL:', error.baseURL || Config.API_URL);
        } else {
          console.error('Error cargando datos:', error);
        }
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>¡Hola, {user?.full_name?.split(' ')[0] || 'Usuario'}! 👋</Text>
          <Text style={styles.subtitle}>Bienvenido a tu jardín virtual</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={[styles.statCard, { borderLeftColor: theme.colors.primary }]}
          onPress={() => router.push('/(tabs)/garden')}
          activeOpacity={0.8}
        >
          <View style={[styles.statIconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
            <Ionicons name="leaf" size={32} color={theme.colors.primary} />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{plantCount}</Text>
            <Text style={styles.statLabel}>Plantas</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.statCard, { borderLeftColor: '#2196f3' }]}
          onPress={() => router.push('/(tabs)/sensors')}
          activeOpacity={0.8}
        >
          <View style={[styles.statIconContainer, { backgroundColor: '#2196f315' }]}>
            <Ionicons name="hardware-chip" size={32} color="#2196f3" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{activeSensors}</Text>
            <Text style={styles.statLabel}>Sensores Activos</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/garden')}
          activeOpacity={0.8}
        >
          <View style={styles.actionButtonIcon}>
            <Ionicons name="leaf" size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.actionButtonText}>Ver Mi Jardín</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.iconSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={() => router.push('/scan-plant')}
          activeOpacity={0.8}
        >
          <View style={styles.actionButtonIconPrimary}>
            <Ionicons name="camera" size={28} color="#fff" />
          </View>
          <Text style={styles.actionButtonTextPrimary}>Escanear Nueva Planta</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionsContainer: {
    padding: 24,
    gap: 16,
  },
  actionButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
