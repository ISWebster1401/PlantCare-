/**
 * Componente para mostrar una tarjeta de planta
 */
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ImageSourcePropType,
  Animated,
} from 'react-native';
import { PlantResponse } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface PlantCardProps {
  plant: PlantResponse;
  onPress?: () => void;
  index?: number;
}

export const PlantCard: React.FC<PlantCardProps> = ({ plant, onPress, index = 0 }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme.colors);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const moodBadgeScale = useRef(new Animated.Value(1)).current;
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

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  useEffect(() => {
    // Animación de entrada escalonada
    Animated.spring(entranceAnim, {
      toValue: 1,
      delay: index * 50,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
    
    // Animación de pulse para el mood badge
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.spring(moodBadgeScale, {
          toValue: 1.15,
          useNativeDriver: true,
          tension: 200,
          friction: 3,
        }),
        Animated.spring(moodBadgeScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 3,
        }),
        Animated.delay(2000),
      ]),
      { iterations: 1 }
    );
    
    // Ejecutar pulse una vez al montar
    setTimeout(() => {
      pulseAnim.start();
    }, 500 + index * 50);
  }, []);

  const opacity = entranceAnim;
  const translateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }, { translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity 
        style={[
          styles.card,
          {
            borderLeftColor: getHealthColor(plant.health_status),
          },
        ]} 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
      <View style={styles.imageContainer}>
        {plant.character_image_url ? (
          <Image
            source={{ uri: plant.character_image_url }}
            style={styles.image}
            resizeMode="cover"
            onError={() => console.log('Error cargando character_image_url')}
          />
        ) : plant.default_render_url ? (
          <Image
            source={{ uri: plant.default_render_url }}
            style={styles.image}
            resizeMode="cover"
            onError={() => console.log('Error cargando default_render_url')}
          />
        ) : plant.model_3d_url ? (
          // Si hay model_3d_url pero no default_render_url, mostrar un indicador visual
          <View style={[styles.image, styles.model3dPreview, { backgroundColor: `${getHealthColor(plant.health_status)}20` }]}>
            <Ionicons name="cube" size={32} color={getHealthColor(plant.health_status)} />
          </View>
        ) : (
          <View style={[styles.placeholder, { backgroundColor: `${getHealthColor(plant.health_status)}15` }]}>
            <Ionicons name="leaf" size={40} color={getHealthColor(plant.health_status)} />
          </View>
        )}
        <Animated.View
          style={[
            styles.moodBadge,
            {
              backgroundColor: getHealthColor(plant.health_status),
              transform: [{ scale: moodBadgeScale }],
            },
          ]}
        >
          <Text style={styles.moodEmoji}>{getMoodEmoji(plant.character_mood)}</Text>
        </Animated.View>
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
          <Text style={[styles.healthText, { color: getHealthColor(plant.health_status) }]}>
            {plant.health_status === 'healthy' ? 'Saludable' : 
             plant.health_status === 'warning' ? 'Atención' : 'Crítico'}
          </Text>
        </View>
      </View>

      <View style={styles.chevronContainer}>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.iconSecondary} />
      </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  placeholder: {
    width: 88,
    height: 88,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  model3dPreview: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${colors.primary}10`,
  },
  moodBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  moodEmoji: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  plantName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  plantType: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 10,
    fontWeight: '500',
  },
  healthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}10`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  healthIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  healthText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chevronContainer: {
    marginLeft: 8,
    opacity: 0.5,
  },
});
