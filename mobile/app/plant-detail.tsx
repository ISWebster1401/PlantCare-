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
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: plant.character_image_url }}
                style={styles.plantImage}
                resizeMode="contain"
                onError={() => {
                  console.log('Error cargando character_image_url, intentando con modelo 3D');
                }}
              />
            </View>
          ) : plant.default_render_url ? (
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: plant.default_render_url }}
                style={styles.plantImage}
                resizeMode="contain"
                onError={() => {
                  console.log('Error cargando default_render_url, intentando con modelo 3D');
                }}
              />
            </View>
          ) : plant.model_3d_url ? (
            <View style={styles.model3dContainer}>
              <Model3DViewer 
                modelUrl={plant.model_3d_url} 
                style={styles.model3dViewer}
                autoRotate={true}
                characterMood={plant.character_mood}
              />
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <View style={styles.placeholderIconContainer}>
                <Ionicons name="leaf" size={64} color={theme.colors.primary} />
              </View>
              <Text style={styles.placeholderText}>Render 3D</Text>
              <Text style={styles.placeholderSubtext}>Próximamente</Text>
            </View>
          )}
        </View>

        {/* Información básica */}
        <View style={styles.infoSection}>
          <View style={styles.plantTypeContainer}>
            <Ionicons name="leaf" size={24} color={theme.colors.primary} />
            <View style={styles.plantTypeContent}>
              <Text style={styles.plantType}>
                {plant.plant_type || 'Planta'}
              </Text>
              {plant.scientific_name && (
                <Text style={styles.scientificName}>{plant.scientific_name}</Text>
              )}
            </View>
          </View>
          {plant.care_level && (
            <View style={[styles.careLevelBadge, { backgroundColor: `${theme.colors.primary}15` }]}>
              <Ionicons name="star" size={16} color={theme.colors.primary} />
              <Text style={[styles.careLevel, { color: theme.colors.primary }]}>
                Nivel: {plant.care_level}
              </Text>
            </View>
          )}
        </View>

        {/* Estado de salud y ánimo */}
        <View style={styles.statusSection}>
          <View style={[styles.statusCard, { borderLeftColor: getHealthColor(plant.health_status) }]}>
            <View style={styles.statusHeader}>
              <View style={[styles.healthBadge, { backgroundColor: getHealthColor(plant.health_status) }]} />
              <Text style={styles.statusLabel}>Estado de Salud</Text>
            </View>
            <Text style={[styles.statusValue, { color: getHealthColor(plant.health_status) }]}>
              {getHealthText(plant.health_status)}
            </Text>
          </View>

          <View style={[styles.statusCard, { borderLeftColor: '#ffb74d' }]}>
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
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="bulb" size={24} color="#ffb74d" />
              <Text style={styles.sectionTitle}>Tips de Cuidado</Text>
            </View>
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
  imageWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  plantImage: {
    width: 240,
    height: 240,
    backgroundColor: colors.surface,
  },
  model3dContainer: {
    width: 240,
    height: 240,
    borderRadius: 24,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  model3dViewer: {
    flex: 1,
  },
  imagePlaceholder: {
    width: 240,
    height: 240,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  placeholderIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  placeholderSubtext: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  plantTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  plantTypeContent: {
    flex: 1,
    marginLeft: 12,
  },
  plantType: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  careLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  careLevel: {
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  moodEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  statusLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  tipsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  tipsCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: '#ffb74d',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tipsText: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.textSecondary,
  },
  actionSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sensorButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  sensorButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
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
