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
        console.error('Error cargando datos:', error);
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>¡Hola, {user?.full_name?.split(' ')[0] || 'Usuario'}! 👋</Text>
        <Text style={styles.subtitle}>Bienvenido a tu jardín virtual</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="leaf" size={32} color={theme.colors.primary} />
          <Text style={styles.statNumber}>{plantCount}</Text>
          <Text style={styles.statLabel}>Plantas</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="hardware-chip" size={32} color="#2196f3" />
          <Text style={styles.statNumber}>{activeSensors}</Text>
          <Text style={styles.statLabel}>Sensores Activos</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/garden')}
        >
          <Ionicons name="leaf-outline" size={24} color={theme.colors.icon} />
          <Text style={styles.actionButtonText}>Ver Mi Jardín</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={() => router.push('/scan-plant')}
        >
          <Ionicons name="camera-outline" size={24} color={theme.colors.text} />
          <Text style={styles.actionButtonText}>Escanear Nueva Planta</Text>
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
