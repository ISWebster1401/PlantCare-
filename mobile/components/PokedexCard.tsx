/**
 * PokedexCard Component - Estilo Duolingo/Pokémon
 * 
 * Tarjeta de entrada del Pokedex con diseño estilo colección
 */
import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle, TextStyle } from 'react-native';
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

export const PokedexCard: React.FC<PokedexCardProps> = ({ 
  entry, 
  onPress, 
  viewMode = 'list', 
  style 
}) => {
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

  // Construir array de estilos sin valores falsy
  const cardStyles: ViewStyle[] = [styles.card];
  if (isGrid) cardStyles.push(styles.cardGrid);
  if (!is_unlocked) cardStyles.push(styles.locked);
  if (style) cardStyles.push(style);

  const containerStyles: ViewStyle[] = [styles.container];
  if (isGrid) containerStyles.push(styles.containerGrid);

  const imageContainerStyles: ViewStyle[] = [styles.imageContainer];
  if (isGrid) imageContainerStyles.push(styles.imageContainerGrid);

  const infoContainerStyles: ViewStyle[] = [styles.infoContainer];
  if (isGrid) infoContainerStyles.push(styles.infoContainerGrid);

  const plantNameStyles: TextStyle[] = [styles.plantName];
  if (isGrid) plantNameStyles.push(styles.plantNameGrid);
  if (!is_unlocked) plantNameStyles.push(styles.lockedText);

  return (
    <Card
      variant={is_unlocked ? 'elevated' : 'outlined'}
      onPress={is_unlocked ? handlePress : undefined}
      style={cardStyles}
      gradient={is_unlocked ? Gradients.card : undefined}
      accessibilityLabel={`${catalog_entry.plant_type} - ${is_unlocked ? 'Desbloqueado' : 'Bloqueado'}`}
    >
      <View style={containerStyles}>
        {/* Número de entrada */}
        <View style={styles.numberContainer}>
          <Text style={styles.number}>#{catalog_entry.entry_number}</Text>
        </View>

        {/* Imagen o placeholder */}
        <View style={imageContainerStyles}>
          {is_unlocked && (entry.discovered_photo_url || catalog_entry.silhouette_url) ? (
            <Image
              source={{ uri: entry.discovered_photo_url || catalog_entry.silhouette_url || '' }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons
                name="leaf-outline"
                size={isGrid ? 40 : 48}
                color={is_unlocked ? Colors.textSecondary : Colors.textMuted}
              />
              {!is_unlocked && (
                <Ionicons
                  name="lock-closed"
                  size={isGrid ? 20 : 24}
                  color={Colors.textMuted}
                  style={styles.lockIcon}
                />
              )}
            </View>
          )}
        </View>

        {/* Información */}
        <View style={infoContainerStyles}>
          <Text
            style={plantNameStyles}
            numberOfLines={isGrid ? 2 : 1}
          >
            {is_unlocked ? catalog_entry.plant_type : '???'}
          </Text>
          
          {is_unlocked && catalog_entry.scientific_name && !isGrid && (
            <Text style={styles.scientificName} numberOfLines={1}>
              {catalog_entry.scientific_name}
            </Text>
          )}
          
          {is_unlocked && catalog_entry.care_level && (
            <View style={styles.badgeContainer}>
              <Badge
                status={
                  catalog_entry.care_level === 'Fácil' 
                    ? 'healthy' 
                    : catalog_entry.care_level === 'Medio' 
                    ? 'warning' 
                    : 'critical'
                }
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
    marginBottom: Spacing.md,
    marginHorizontal: '1%',
  },
  locked: {
    opacity: 0.6,
  },
  container: {
    position: 'relative',
    width: '100%',
    padding: Spacing.md,
  },
  containerGrid: {
    padding: Spacing.sm,
  },
  numberContainer: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
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
    position: 'relative',
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    backgroundColor: Colors.backgroundLighter,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  imageContainerGrid: {
    height: 140,
    marginBottom: Spacing.sm,
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
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
    bottom: Spacing.sm,
    right: Spacing.sm,
  },
  infoContainer: {
    alignItems: 'center',
    width: '100%',
  },
  infoContainerGrid: {
    minHeight: 70,
    justifyContent: 'center',
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
    letterSpacing: 2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});