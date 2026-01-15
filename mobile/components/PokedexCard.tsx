/**
 * PokedexCard Component - Estilo Duolingo/Pokémon
 * 
 * Tarjeta de entrada del Pokedex con diseño estilo colección
 */
import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Badge } from './ui';
import { Colors, Typography, Spacing, BorderRadius, Gradients } from '../constants/DesignSystem';
import { PokedexEntryResponse } from '../types';
import { Ionicons } from '@expo/vector-icons';

export interface PokedexCardProps {
  entry: PokedexEntryResponse;
  onPress?: () => void;
  style?: ViewStyle;
  viewMode?: 'list' | 'grid';
}

export const PokedexCard: React.FC<PokedexCardProps> = ({ entry, onPress, viewMode = 'list', style }) => {
  const router = useRouter();
  const { catalog_entry, is_unlocked } = entry;
  
  const isGrid = viewMode === 'grid';

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/pokedex-entry-detail?id=${catalog_entry.entry_number}`);
    }
  };

  return (
    <Card
      variant={is_unlocked ? 'elevated' : 'outlined'}
      onPress={is_unlocked ? handlePress : undefined}
      style={[
        styles.card,
        isGrid && styles.cardGrid,
        !is_unlocked && styles.locked,
        style,
      ]}
      gradient={is_unlocked ? Gradients.card : undefined}
      accessibilityLabel={`${catalog_entry.plant_type} - ${is_unlocked ? 'Desbloqueado' : 'Bloqueado'}`}
    >
      <View style={styles.container}>
        {/* Número de entrada */}
        <View style={styles.numberContainer}>
          <Text style={styles.number}>#{catalog_entry.entry_number}</Text>
        </View>

        {/* Imagen o placeholder */}
        <View style={[styles.imageContainer, isGrid && styles.imageContainerGrid]}>
          {is_unlocked && (entry.discovered_photo_url || catalog_entry.silhouette_url) ? (
            <Image
              source={{ uri: entry.discovered_photo_url || catalog_entry.silhouette_url || '' }}
              style={[styles.image, isGrid && styles.imageGrid]}
              resizeMode={isGrid ? "cover" : "cover"}
            />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons
                name="leaf-outline"
                size={isGrid ? 32 : 48}
                color={is_unlocked ? Colors.textSecondary : Colors.textMuted}
              />
              {!is_unlocked && (
                <Ionicons
                  name="lock-closed"
                  size={isGrid ? 16 : 24}
                  color={Colors.textMuted}
                  style={styles.lockIcon}
                />
              )}
            </View>
          )}
        </View>

        {/* Información */}
        <View style={[styles.infoContainer, isGrid && styles.infoContainerGrid]}>
          <Text
            style={[
              styles.plantName,
              isGrid && styles.plantNameGrid,
              !is_unlocked && styles.lockedText,
            ]}
            numberOfLines={isGrid ? 2 : 1}
          >
            {is_unlocked ? catalog_entry.plant_type : '???'}
          </Text>
          {is_unlocked && catalog_entry.scientific_name && !isGrid && (
            <Text style={styles.scientificName} numberOfLines={1}>
              {catalog_entry.scientific_name}
            </Text>
          )}
          {is_unlocked && catalog_entry.care_level && !isGrid && (
            <View style={styles.badgeContainer}>
              <Badge
                status={catalog_entry.care_level === 'Fácil' ? 'healthy' : catalog_entry.care_level === 'Medio' ? 'warning' : 'critical'}
                label={catalog_entry.care_level}
                size="sm"
              />
            </View>
          )}
          {is_unlocked && catalog_entry.care_level && isGrid && (
            <View style={styles.badgeContainer}>
              <Badge
                status={catalog_entry.care_level === 'Fácil' ? 'healthy' : catalog_entry.care_level === 'Medio' ? 'warning' : 'critical'}
                label={catalog_entry.care_level}
                size="sm"
              />
            </View>
          )}
        </View>

        {/* Indicador de desbloqueado */}
        {is_unlocked && (
          <View style={styles.unlockedBadge}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  cardGrid: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: Spacing.md,
    // Asegura que la card tenga suficiente espacio
  },
  locked: {
    opacity: 0.6,
  },
  container: {
    position: 'relative',
  },
  numberContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 2,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minWidth: 36,
  },
  number: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    textAlign: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    backgroundColor: Colors.backgroundLighter,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  imageContainerGrid: {
    height: 160, // Aumentado significativamente para que no se vea aplastado
    marginBottom: Spacing.sm,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGrid: {
    // Asegura que la imagen llene el contenedor cuadrado correctamente
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockIcon: {
    position: 'absolute',
    bottom: Spacing.xs,
    right: Spacing.xs,
  },
  infoContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    width: '100%',
  },
  infoContainerGrid: {
    minHeight: 60,
  },
  plantName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  plantNameGrid: {
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.xs,
  },
  lockedText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xl,
  },
  scientificName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  badgeContainer: {
    marginTop: Spacing.xs,
  },
  unlockedBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full,
    padding: Spacing.xs,
  },
});
