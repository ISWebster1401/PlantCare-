/**
 * PokedexCard Component - versión simplificada
 *
 * Reiniciamos el diseño desde cero para evitar glitches en grid
 * y hacer el layout mucho más predecible.
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
  style,
}) => {
  const router = useRouter();
  const { catalog_entry, is_unlocked } = entry;

  const isGrid = viewMode === 'grid';
  const hasImage = is_unlocked && (entry.discovered_photo_url || catalog_entry.silhouette_url);

  const handlePress = () => {
    if (!is_unlocked) return;

    if (onPress) {
      onPress();
    } else {
      router.push(`/pokedex-entry-detail?id=${catalog_entry.entry_number}`);
    }
  };

  // Estilos de tarjeta (muy simples para evitar problemas de layout)
  const cardStyles: ViewStyle[] = [styles.cardBase, isGrid ? styles.cardGrid : styles.cardList];
  if (!is_unlocked) cardStyles.push(styles.cardLocked);
  if (style) cardStyles.push(style);

  const nameStyles: TextStyle[] = [styles.plantNameBase];
  if (isGrid) nameStyles.push(styles.plantNameGrid);
  else nameStyles.push(styles.plantNameList);
  if (!is_unlocked) nameStyles.push(styles.plantNameLocked);

  return (
    <Card
      variant={is_unlocked ? 'elevated' : 'outlined'}
      onPress={is_unlocked ? handlePress : undefined}
      style={cardStyles}
      gradient={is_unlocked ? Gradients.card : undefined}
      accessibilityLabel={`${catalog_entry.plant_type} - ${is_unlocked ? 'Desbloqueado' : 'Bloqueado'}`}
    >
      <View style={styles.inner}>
        {/* Número de entrada */}
        <View style={styles.numberPill}>
          <Text style={styles.numberText}>#{catalog_entry.entry_number}</Text>
        </View>

        {/* Imagen o placeholder */}
        <View style={[styles.imageWrapper, isGrid ? styles.imageWrapperGrid : styles.imageWrapperList]}>
          {hasImage ? (
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
                  size={isGrid ? 18 : 20}
                  color={Colors.textMuted}
                  style={styles.lockIcon}
                />
              )}
            </View>
          )}
        </View>

        {/* Información de la planta */}
        <View style={[styles.infoWrapper, isGrid ? styles.infoWrapperGrid : styles.infoWrapperList]}>
          <Text style={nameStyles} numberOfLines={isGrid ? 2 : 1}>
            {is_unlocked ? catalog_entry.plant_type : '???'}
          </Text>

          {is_unlocked && catalog_entry.scientific_name && !isGrid && (
            <Text style={styles.scientificName} numberOfLines={1}>
              {catalog_entry.scientific_name}
            </Text>
          )}

          {is_unlocked && catalog_entry.care_level && (
            <View style={styles.badgeWrapper}>
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

        {/* Check de desbloqueado */}
        {is_unlocked && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  cardBase: {
    marginBottom: Spacing.md,
  },
  cardList: {
    width: '100%',
  },
  cardGrid: {
    width: '48%',
  },
  cardLocked: {
    opacity: 0.65,
  },
  inner: {
    padding: Spacing.md,
    position: 'relative',
  },
  numberPill: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    zIndex: 10,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  numberText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  imageWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundLighter,
    marginBottom: Spacing.sm,
  },
  imageWrapperList: {
    height: 140,
    width: '100%',
  },
  imageWrapperGrid: {
    width: '100%',
    aspectRatio: 1,
    minHeight: 120,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
  },
  infoWrapper: {
    alignItems: 'center',
  },
  infoWrapperList: {
    marginTop: Spacing.sm,
  },
  infoWrapperGrid: {
    marginTop: Spacing.xs,
    minHeight: 60,
    justifyContent: 'center',
  },
  plantNameBase: {
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  plantNameList: {
    fontSize: Typography.sizes.lg,
    marginBottom: Spacing.xs,
  },
  plantNameGrid: {
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.xs,
  },
  plantNameLocked: {
    color: Colors.textMuted,
  },
  scientificName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  badgeWrapper: {
    marginTop: Spacing.xs,
  },
  checkBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    zIndex: 10,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full,
    padding: Spacing.xs,
  },
});