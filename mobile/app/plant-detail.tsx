/**
 * Pantalla de Detalles de Planta - Rediseño profesional
 * Usa DesignSystem para colores, tipografía y espaciado.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { plantsAPI } from '../services/api';
import { PlantResponse } from '../types';
import { Model3DViewer } from '../components/Model3DViewer';
import { Button } from '../components/ui';
import {
  Colors,
  Gradients,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../constants/DesignSystem';

/* -------------------------------------------------- */
/*  Pequeños componentes auxiliares                    */
/* -------------------------------------------------- */

function DetailStatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function GradientHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <LinearGradient
      colors={Gradients.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    >
      <SafeAreaView>
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.headerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>

          <TouchableOpacity
            style={styles.headerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="ellipsis-vertical" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* -------------------------------------------------- */
/*  Pantalla principal                                */
/* -------------------------------------------------- */

export default function PlantDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const [plant, setPlant] = useState<PlantResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [show3D, setShow3D] = useState(false);

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

  /* --- helpers de texto --- */

  const getRiegoLabel = (): string => {
    if (!plant?.last_watered) return '2x semana';
    const days = Math.floor(
      (Date.now() - new Date(plant.last_watered).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Hace 1 día';
    return `Hace ${days} días`;
  };

  const getHealthLabel = (): string => {
    if (!plant) return 'Saludable';
    const h = plant.health_status || 'healthy';
    if (h === 'healthy') return 'Saludable';
    if (h === 'warning') return 'Atención';
    return 'Crítico';
  };

  const getTempLabel = (): string => {
    if (!plant?.optimal_temp_min || !plant?.optimal_temp_max) return '18-25°C';
    return `${plant.optimal_temp_min}-${plant.optimal_temp_max}°C`;
  };

  /* --- estados de carga / error --- */

  if (isLoading) {
    return (
      <View style={styles.container}>
        <GradientHeader title="Cargando..." onBack={() => router.back()} />
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.stateText}>Cargando planta...</Text>
        </View>
      </View>
    );
  }

  if (error || !plant) {
    return (
      <View style={styles.container}>
        <GradientHeader title="Error" onBack={() => router.back()} />
        <View style={styles.centeredState}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <Text style={[styles.stateText, { color: Colors.error, marginBottom: Spacing.lg }]}>
            {error || 'Planta no encontrada'}
          </Text>
          <Button title="Reintentar" onPress={loadPlant} variant="primary" size="md" />
        </View>
      </View>
    );
  }

  /* --- datos derivados --- */

  const imageUri =
    plant.character_image_url ||
    plant.default_render_url ||
    plant.original_photo_url ||
    undefined;
  const mood = (plant.character_mood || 'happy') as string;

  /* --- render --- */

  return (
    <View style={styles.container}>
      <GradientHeader title="Detalle de Planta" onBack={() => router.back()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Foto circular */}
        <View style={styles.photoSection}>
          <View style={styles.photoCircle}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.plantImage} resizeMode="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="leaf" size={80} color={Colors.primaryLight} />
              </View>
            )}
          </View>
        </View>

        {/* Card de información */}
        <View style={styles.infoCard}>
          <Text style={styles.plantName}>
            {plant.plant_name || plant.plant_type || 'Planta'}
          </Text>
          {plant.scientific_name ? (
            <Text style={styles.scientificName}>{plant.scientific_name}</Text>
          ) : null}
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>
              Nivel: {plant.care_level || 'Medio'}
            </Text>
          </View>
          <View style={styles.statsGrid}>
            <DetailStatCard icon="💧" label="Riego" value={getRiegoLabel()} />
            <DetailStatCard icon="☀️" label="Luz" value="Indirecta" />
            <DetailStatCard icon="🌡️" label="Temp" value={getTempLabel()} />
            <DetailStatCard icon="💚" label="Salud" value={getHealthLabel()} />
          </View>
        </View>

        {/* Toggle Foto / 3D */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: !show3D ? Colors.primary : Colors.backgroundLighter },
            ]}
            onPress={() => setShow3D(false)}
          >
            <Text
              style={[
                styles.toggleButtonText,
                { color: !show3D ? Colors.white : Colors.textMuted },
              ]}
            >
              📷 Foto Real
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: show3D ? Colors.primary : Colors.backgroundLighter },
            ]}
            onPress={() => setShow3D(true)}
          >
            <Text
              style={[
                styles.toggleButtonText,
                { color: show3D ? Colors.white : Colors.textMuted },
              ]}
            >
              🎮 Modelo 3D
            </Text>
          </TouchableOpacity>
        </View>

        {/* Modelo 3D condicional */}
        {show3D && (
          <View style={styles.model3dWrapper}>
            <Text style={styles.model3dLabel}>Vista 3D Interactiva</Text>
            {plant.model_3d_url ? (
              <Model3DViewer
                modelUrl={plant.model_3d_url}
                style={styles.model3dViewer}
                autoRotate
                characterMood={mood}
              />
            ) : (
              <View style={styles.model3dPlaceholder}>
                <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.model3dPlaceholderText}>Modelo 3D no disponible</Text>
              </View>
            )}
          </View>
        )}

        {/* Botones de acción */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              router.push({
                pathname: '/watering',
                params: { plantId: plant.id.toString(), plantName: plant.plant_name },
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>💧 Registrar Riego</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              router.push({
                pathname: '/watering-history',
                params: {
                  plantId: plant.id.toString(),
                  plantName: plant.plant_name,
                  sensorId: plant.sensor_id?.toString() ?? '',
                },
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>📊 Ver Historial</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

/* -------------------------------------------------- */
/*  Estilos                                           */
/* -------------------------------------------------- */

const styles = StyleSheet.create({
  /* --- layout --- */
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
  },

  /* --- header --- */
  headerGradient: {
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    height: 56,
  },
  headerBtn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    textAlign: 'center',
  },

  /* --- estados (carga / error) --- */
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  stateText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  /* --- foto --- */
  photoSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  photoCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: 'hidden',
    borderWidth: 6,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.white,
    ...Shadows.lg,
  },
  plantImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundLight,
  },

  /* --- info card --- */
  infoCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.lg,
    ...Shadows.md,
  },
  plantName: {
    fontSize: Typography.sizes.xxl - 2,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  scientificName: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  levelBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
  },
  levelBadgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.backgroundLighter,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },

  /* --- toggle foto / 3D --- */
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },

  /* --- modelo 3D --- */
  model3dWrapper: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    height: 200,
    backgroundColor: Colors.backgroundLighter,
    borderRadius: BorderRadius.lg,
    borderWidth: 3,
    borderColor: Colors.primaryLight,
    overflow: 'hidden',
    position: 'relative',
  },
  model3dLabel: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    textAlign: 'center',
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    backgroundColor: 'rgba(26,38,52,0.85)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    zIndex: 1,
    overflow: 'hidden',
  },
  model3dViewer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  model3dPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  model3dPlaceholderText: {
    marginTop: Spacing.sm,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
  },

  /* --- botones de acción --- */
  actionsSection: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  primaryButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    ...Shadows.md,
  },
  secondaryButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    ...Shadows.md,
  },
  actionButtonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
});
