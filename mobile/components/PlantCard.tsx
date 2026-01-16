/**
 * PlantCard Component - Estilo Duolingo/Pokémon
 * 
 * Tarjeta de planta con diseño moderno usando DesignSystem
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, PlantAvatar, Badge, ProgressBar } from './ui';
import { Colors, Typography, Spacing, HealthStatuses, PlantMoods, PlantMoodType, BorderRadius } from '../constants/DesignSystem';
import { PlantResponse } from '../types';

export interface PlantCardProps {
  plant: PlantResponse;
  onPress?: () => void;
  style?: ViewStyle;
}

export const PlantCard: React.FC<PlantCardProps> = ({ plant, onPress, style }) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/plant-detail?id=${plant.id}`);
    }
  };

  // Determinar estado de salud con validación
  const getValidHealthStatus = (): 'healthy' | 'warning' | 'critical' => {
    const status = plant.health_status as string;
    if (status === 'healthy' || status === 'warning' || status === 'critical') {
      return status;
    }
    return 'healthy';
  };

  // Determinar mood con validación defensiva
  const getValidMood = (): PlantMoodType => {
    const moodValue = plant.character_mood as string;
    if (moodValue && PlantMoods[moodValue as PlantMoodType]) {
      return moodValue as PlantMoodType;
    }
    // Si el mood es inválido o no existe, usar 'happy' por defecto
    return 'happy';
  };

  const healthStatus = getValidHealthStatus();
  const mood = getValidMood();

  // Calcular progreso de salud (ejemplo: basado en días desde último riego)
  const getHealthProgress = (): number => {
    if (healthStatus === 'healthy') return 100;
    if (healthStatus === 'warning') return 60;
    return 30;
  };

  // Calcular progreso de agua (ejemplo: basado en last_watered)
  const getWaterProgress = (): number => {
    if (!plant.last_watered) return 20;
    const daysSinceWatered = Math.floor(
      (Date.now() - new Date(plant.last_watered).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceWatered < 2) return 100;
    if (daysSinceWatered < 5) return 60;
    if (daysSinceWatered < 7) return 30;
    return 10;
  };

  const healthProgress = getHealthProgress();
  const waterProgress = getWaterProgress();

  // Construir array de estilos sin valores undefined
  const cardStyles: ViewStyle[] = [styles.card];
  if (style) cardStyles.push(style);

  // Obtener imageUrl manejando el null
  const imageUrl = plant.character_image_url || plant.original_photo_url || undefined;

  return (
    <Card
      variant="elevated"
      onPress={handlePress}
      style={cardStyles}
      accessibilityLabel={`Planta ${plant.plant_name}, estado ${healthStatus}`}
    >
      <View style={styles.container}>
        {/* Imagen a todo ancho */}
        {imageUrl ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <PlantAvatar
              imageUrl={undefined}
              mood={mood}
              healthStatus={healthStatus}
              size={100}
              showMoodEmoji={false}
              showGlow={true}
            />
          </View>
        )}

        {/* Contenido */}
        <View style={styles.content}>
          {/* Nombre y tipo */}
          <View style={styles.nameContainer}>
            <Text style={styles.plantName} numberOfLines={1}>
              {plant.plant_name}
            </Text>
            {plant.plant_type && (
              <Text style={styles.plantType} numberOfLines={1}>
                {plant.plant_type}
              </Text>
            )}
          </View>

          {/* Badge de estado */}
          <View style={styles.badgeContainer}>
            <Badge status={healthStatus} size="sm" />
          </View>

          {/* Barras de progreso */}
          <View style={styles.progressContainer}>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Salud</Text>
              <ProgressBar
                progress={healthProgress}
                height={8}
                color={HealthStatuses[healthStatus].color}
                showShimmer={healthStatus === 'healthy'}
              />
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Agua</Text>
              <ProgressBar
                progress={waterProgress}
                height={8}
                gradient={['#64B5F6', '#4FC3F7']}
                showShimmer={waterProgress > 80}
              />
            </View>
          </View>

          {/* Mensaje del mood */}
          {PlantMoods[mood] && (
            <View style={styles.moodContainer}>
              <Text style={styles.moodText}>
                {PlantMoods[mood].emoji} {PlantMoods[mood].message}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  container: {
    width: '100%',
  },
  imageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.backgroundLighter,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.md,
  },
  nameContainer: {
    marginBottom: Spacing.md,
  },
  plantName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  plantType: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    color: Colors.textSecondary,
  },
  badgeContainer: {
    marginBottom: Spacing.md,
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressItem: {
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  moodContainer: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundLighter,
  },
  moodText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});