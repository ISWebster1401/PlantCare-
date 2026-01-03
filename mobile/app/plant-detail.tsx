/**
 * Pantalla de Detalles de Planta
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { plantsAPI } from '../services/api';
import { PlantResponse } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Model3DViewer } from '../components/Model3DViewer';

export default function PlantDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const [plant, setPlant] = useState<PlantResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const styles = createStyles(theme.colors);

  useEffect(() => {
    loadPlant();
  }, [params.id]);

  const loadPlant = async () => {
    if (!params.id) {
      setError('ID de planta no proporcionado');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const plantData = await plantsAPI.getPlant(parseInt(params.id, 10));
      setPlant(plantData);
    } catch (err: any) {
      console.error('Error cargando planta:', err);
      setError('No se pudo cargar la información de la planta');
      Alert.alert('Error', 'No se pudo cargar la información de la planta');
    } finally {
      setIsLoading(false);
    }
  };

  const getMoodEmoji = (mood: string) => {
    const moodMap: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      sick: '🤒',
      thirsty: '💧',
      overwatered: '💦',
      neutral: '😐',
      excited: '🤩',
    };
    return moodMap[mood] || '🌱';
  };

  const getMoodText = (mood: string) => {
    const moodMap: Record<string, string> = {
      happy: 'Feliz',
      sad: 'Triste',
      sick: 'Enfermo',
      thirsty: 'Sediento',
      overwatered: 'Demasiada agua',
      neutral: 'Neutral',
      excited: 'Emocionado',
    };
    return moodMap[mood] || 'Normal';
  };

  const getHealthColor = (health: string) => {
    const healthMap: Record<string, string> = {
      healthy: '#4caf50',
      warning: '#ff9800',
      critical: '#f44336',
    };
    return healthMap[health] || '#b0bec5';
  };

  const getHealthText = (health: string) => {
    const healthMap: Record<string, string> = {
      healthy: 'Saludable',
      warning: 'Atención',
      critical: 'Crítico',
    };
    return healthMap[health] || 'Desconocido';
  };

  const handleGoToSensor = () => {
    router.push('/(tabs)/sensors');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Cargando planta...</Text>
        </View>
      </View>
    );
  }

  if (error || !plant) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} />
          <Text style={styles.errorText}>{error || 'Planta no encontrada'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPlant}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {plant.plant_name}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Imagen/Render 3D */}
        <View style={styles.imageSection}>
          {plant.character_image_url ? (
            <Image
              source={{ uri: plant.character_image_url }}
              style={styles.plantImage}
              resizeMode="contain"
            />
          ) : plant.model_3d_url ? (
            <View style={styles.model3dContainer}>
              <Model3DViewer 
                modelUrl={plant.model_3d_url} 
                style={styles.model3dViewer}
                autoRotate={true}
              />
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="cube-outline" size={64} color={theme.colors.primary} />
              <Text style={styles.placeholderText}>Render 3D</Text>
              <Text style={styles.placeholderSubtext}>Próximamente</Text>
            </View>
          )}
        </View>

        {/* Información básica */}
        <View style={styles.infoSection}>
          <Text style={styles.plantType}>
            {plant.plant_type || 'Planta'}
            {plant.scientific_name && ` (${plant.scientific_name})`}
          </Text>
          {plant.care_level && (
            <Text style={styles.careLevel}>Nivel de cuidado: {plant.care_level}</Text>
          )}
        </View>

        {/* Estado de salud y ánimo */}
        <View style={styles.statusSection}>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={[styles.healthBadge, { backgroundColor: getHealthColor(plant.health_status) }]} />
              <Text style={styles.statusLabel}>Estado</Text>
            </View>
            <Text style={styles.statusValue}>{getHealthText(plant.health_status)}</Text>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Text style={styles.moodEmoji}>{getMoodEmoji(plant.character_mood)}</Text>
              <Text style={styles.statusLabel}>Ánimo</Text>
            </View>
            <Text style={styles.statusValue}>{getMoodText(plant.character_mood)}</Text>
          </View>
        </View>

        {/* Tips de cuidado */}
        {plant.care_tips && (
          <View style={styles.tipsSection}>
            <Text style={styles.sectionTitle}>💡 Tips de Cuidado</Text>
            <View style={styles.tipsCard}>
              <Text style={styles.tipsText}>{plant.care_tips}</Text>
            </View>
          </View>
        )}

        {/* Botón Ir al Sensor */}
        {plant.sensor_id && (
          <View style={styles.actionSection}>
            <TouchableOpacity style={styles.sensorButton} onPress={handleGoToSensor}>
              <Ionicons name="hardware-chip" size={24} color={theme.colors.text} />
              <Text style={styles.sensorButtonText}>Ir al Sensor</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        )}

        {/* Espaciado final */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  plantImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  model3dContainer: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  model3dViewer: {
    flex: 1,
  },
  imagePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  placeholderSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  plantType: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  careLevel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusSection: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  statusCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  moodEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  tipsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  tipsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipsText: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  actionSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sensorButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    marginRight: 8,
    flex: 1,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 32,
  },
});
