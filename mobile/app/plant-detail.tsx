/**
 * Pantalla de Detalles de Planta - Rediseñada con DesignSystem
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { plantsAPI } from '../services/api';
import { PlantResponse } from '../types';
import { Model3DViewer } from '../components/Model3DViewer';
import { Card, Badge, ProgressBar, PlantAvatar, Button } from '../components/ui';
import { Colors, Typography, Spacing, BorderRadius, Gradients, Shadows, HealthStatuses, PlantMoods } from '../constants/DesignSystem';

export default function PlantDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const [plant, setPlant] = useState<PlantResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleGoToSensor = () => {
    router.push('/(tabs)/sensors');
  };

  // Calcular progreso de salud y agua
  const getHealthProgress = (): number => {
    if (!plant) return 0;
    const health = plant.health_status || 'healthy';
    if (health === 'healthy') return 100;
    if (health === 'warning') return 60;
    return 30;
  };

  const getWaterProgress = (): number => {
    if (!plant || !plant.last_watered) return 20;
    const daysSinceWatered = Math.floor(
      (Date.now() - new Date(plant.last_watered).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceWatered < 2) return 100;
    if (daysSinceWatered < 5) return 60;
    if (daysSinceWatered < 7) return 30;
    return 10;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Button
            title=""
            onPress={() => router.back()}
            variant="ghost"
            size="sm"
            icon="arrow-back"
            style={styles.backButton}
          />
          <Text style={styles.headerTitle}>Cargando...</Text>
          <View style={styles.backButtonPlaceholder} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Cargando planta...</Text>
        </View>
      </View>
    );
  }

  if (error || !plant) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Button
            title=""
            onPress={() => router.back()}
            variant="ghost"
            size="sm"
            icon="arrow-back"
            style={styles.backButton}
          />
          <Text style={styles.headerTitle}>Error</Text>
          <View style={styles.backButtonPlaceholder} />
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <Text style={styles.errorText}>{error || 'Planta no encontrada'}</Text>
          <Button
            title="Reintentar"
            onPress={loadPlant}
            variant="primary"
            size="md"
          />
        </View>
      </View>
    );
  }

  const healthStatus = (plant.health_status || 'healthy') as 'healthy' | 'warning' | 'critical';
  const mood = (plant.character_mood || 'happy') as keyof typeof PlantMoods;
  const moodConfig = PlantMoods[mood] || PlantMoods.happy;

  return (
    <View style={styles.container}>
      {/* Header con gradiente */}
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Button
          title=""
          onPress={() => router.back()}
          variant="ghost"
          size="sm"
          icon="arrow-back"
          style={styles.backButton}
        />
        <Text style={styles.headerTitle} numberOfLines={1}>
          {plant.plant_name}
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar grande de la planta */}
        <View style={styles.avatarSection}>
          {plant.model_3d_url ? (
            <View style={styles.model3dContainer}>
              <Model3DViewer
                modelUrl={plant.model_3d_url}
                style={styles.model3dViewer}
                autoRotate={true}
                characterMood={mood}
              />
            </View>
          ) : (
            <PlantAvatar
              imageUrl={plant.character_image_url || plant.original_photo_url}
              mood={mood}
              healthStatus={healthStatus}
              size={200}
              showMoodEmoji={true}
              showGlow={true}
            />
          )}
        </View>

        {/* Información básica */}
        <Card variant="elevated" style={styles.infoCard}>
          <View style={styles.plantTypeContainer}>
            <Ionicons name="leaf" size={24} color={Colors.primary} />
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
            <Badge
              status={plant.care_level === 'Fácil' ? 'healthy' : plant.care_level === 'Medio' ? 'warning' : 'critical'}
              label={`Nivel: ${plant.care_level}`}
              size="sm"
            />
          )}
        </Card>

        {/* Estado de salud y ánimo */}
        <View style={styles.statusRow}>
          <Card variant="elevated" style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={[styles.healthDot, { backgroundColor: HealthStatuses[healthStatus].color }]} />
              <Text style={styles.statusLabel}>Salud</Text>
            </View>
            <Text style={[styles.statusValue, { color: HealthStatuses[healthStatus].color }]}>
              {HealthStatuses[healthStatus].label}
            </Text>
            <ProgressBar
              progress={getHealthProgress()}
              height={8}
              color={HealthStatuses[healthStatus].color}
              showShimmer={healthStatus === 'healthy'}
              style={styles.progressBar}
            />
          </Card>

          <Card variant="elevated" style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Text style={styles.moodEmoji}>{moodConfig.emoji}</Text>
              <Text style={styles.statusLabel}>Ánimo</Text>
            </View>
            <Text style={styles.statusValue}>{moodConfig.message}</Text>
          </Card>
        </View>

        {/* Progreso de agua */}
        <Card variant="elevated" style={styles.waterCard}>
          <View style={styles.waterHeader}>
            <Ionicons name="water" size={24} color={Colors.secondary} />
            <Text style={styles.waterTitle}>Nivel de Agua</Text>
          </View>
          <ProgressBar
            progress={getWaterProgress()}
            height={12}
            gradient={Gradients.ocean}
            showShimmer={getWaterProgress() > 80}
            style={styles.waterProgress}
          />
          <Text style={styles.waterText}>
            {plant.last_watered
              ? `Último riego: hace ${Math.floor((Date.now() - new Date(plant.last_watered).getTime()) / (1000 * 60 * 60 * 24))} días`
              : 'Aún no se ha registrado riego'}
          </Text>
        </Card>

        {/* Tips de cuidado */}
        {plant.care_tips && (
          <Card variant="elevated" style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={24} color={Colors.accent} />
              <Text style={styles.tipsTitle}>Tips de Cuidado</Text>
            </View>
            <Text style={styles.tipsText}>{plant.care_tips}</Text>
          </Card>
        )}

        {/* Condiciones óptimas */}
        {(plant.optimal_humidity_min || plant.optimal_temp_min) && (
          <Card variant="elevated" style={styles.conditionsCard}>
            <View style={styles.conditionsHeader}>
              <Ionicons name="stats-chart" size={24} color={Colors.secondary} />
              <Text style={styles.conditionsTitle}>Condiciones Óptimas</Text>
            </View>
            <View style={styles.conditionsRow}>
              {plant.optimal_humidity_min && (
                <View style={styles.conditionItem}>
                  <Ionicons name="water" size={20} color={Colors.secondary} />
                  <Text style={styles.conditionLabel}>Humedad</Text>
                  <Text style={styles.conditionValue}>
                    {plant.optimal_humidity_min}% - {plant.optimal_humidity_max}%
                  </Text>
                </View>
              )}
              {plant.optimal_temp_min && (
                <View style={styles.conditionItem}>
                  <Ionicons name="thermometer" size={20} color={Colors.error} />
                  <Text style={styles.conditionLabel}>Temperatura</Text>
                  <Text style={styles.conditionValue}>
                    {plant.optimal_temp_min}°C - {plant.optimal_temp_max}°C
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Botón Ir al Sensor */}
        {plant.sensor_id && (
          <Button
            title="Ir al Sensor"
            onPress={handleGoToSensor}
            variant="secondary"
            size="lg"
            icon="hardware-chip"
            iconPosition="left"
            fullWidth
            style={styles.sensorButton}
          />
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingTop: 60,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    padding: 0,
  },
  backButtonPlaceholder: {
    width: 40,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  model3dContainer: {
    width: 240,
    height: 240,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.backgroundLight,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.primary,
    ...Shadows.lg,
  },
  model3dViewer: {
    flex: 1,
  },
  infoCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  plantTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  plantTypeContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  plantType: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  scientificName: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statusCard: {
    flex: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  healthDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  moodEmoji: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  statusLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: Typography.weights.semibold,
  },
  statusValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
  },
  progressBar: {
    marginTop: Spacing.xs,
  },
  waterCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  waterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  waterTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  waterProgress: {
    marginBottom: Spacing.sm,
  },
  waterText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  tipsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tipsTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  tipsText: {
    fontSize: Typography.sizes.base,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
  conditionsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  conditionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  conditionsTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  conditionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  conditionItem: {
    flex: 1,
    backgroundColor: Colors.backgroundLighter,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  conditionLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  conditionValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  sensorButton: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  bottomSpacer: {
    height: Spacing.xl,
  },
});
