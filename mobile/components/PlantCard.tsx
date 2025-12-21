/**
 * Componente para mostrar una tarjeta de planta
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ImageSourcePropType,
} from 'react-native';
import { PlantResponse } from '../types';
import { Ionicons } from '@expo/vector-icons';

interface PlantCardProps {
  plant: PlantResponse;
  onPress?: () => void;
}

export const PlantCard: React.FC<PlantCardProps> = ({ plant, onPress }) => {
  const getMoodEmoji = (mood: string) => {
    const moodMap: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      neutral: '😐',
      excited: '🤩',
    };
    return moodMap[mood] || '🌱';
  };

  const getHealthColor = (health: string) => {
    const healthMap: Record<string, string> = {
      healthy: '#4caf50',
      warning: '#ff9800',
      critical: '#f44336',
    };
    return healthMap[health] || '#b0bec5';
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.imageContainer}>
        {plant.character_image_url ? (
          <Image
            source={{ uri: plant.character_image_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="leaf-outline" size={48} color="#4caf50" />
          </View>
        )}
        <View style={[styles.moodBadge, { backgroundColor: getHealthColor(plant.health_status) }]}>
          <Text style={styles.moodEmoji}>{getMoodEmoji(plant.character_mood)}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.plantName} numberOfLines={1}>
          {plant.plant_name}
        </Text>
        <Text style={styles.plantType} numberOfLines={1}>
          {plant.plant_type || 'Planta'}
        </Text>

        <View style={styles.healthContainer}>
          <View style={[styles.healthIndicator, { backgroundColor: getHealthColor(plant.health_status) }]} />
          <Text style={styles.healthText}>
            {plant.health_status === 'healthy' ? 'Saludable' : 
             plant.health_status === 'warning' ? 'Atención' : 'Crítico'}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={24} color="#64748b" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#0a1929',
  },
  placeholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#0a1929',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e293b',
  },
  moodEmoji: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  plantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  plantType: {
    fontSize: 14,
    color: '#b0bec5',
    marginBottom: 8,
  },
  healthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  healthText: {
    fontSize: 12,
    color: '#b0bec5',
  },
});
