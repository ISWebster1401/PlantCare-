/**
 * PokedexCard Component
 * 
 * Todas las tarjetas tienen el MISMO layout.
 * La única diferencia es que si hay imagen, se muestra en lugar del placeholder.
 */
import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle, TextStyle, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Badge } from './ui';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/DesignSystem';
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
  const imageUrl = entry.discovered_photo_url || catalog_entry.silhouette_url;
  const hasImage = is_unlocked && imageUrl;

  const handlePress = () => {
    if (!is_unlocked) return;
    if (onPress) {
      onPress();
    } else {
      router.push(`/pokedex-entry-detail?id=${catalog_entry.entry_number}`);
    }
  };

  const cardStyles: ViewStyle[] = [
    styles.card,
    isGrid ? styles.cardGrid : styles.cardList,
    !is_unlocked && styles.cardLocked,
  ];
  if (style) cardStyles.push(style);

  const nameStyles: TextStyle[] = [styles.plantName];
  if (isGrid) nameStyles.push(styles.plantNameGrid);
  if (!is_unlocked) nameStyles.push(styles.plantNameLocked);

  return (
    <TouchableOpacity
      onPress={is_unlocked ? handlePress : undefined}
      style={cardStyles}
      activeOpacity={is_unlocked ? 0.7 : 1}
      accessibilityLabel={`${catalog_entry.plant_type} - ${is_unlocked ? 'Desbloqueado' : 'Bloqueado'}`}
    >
      {/* Número de entrada - esquina superior derecha */}
      <View style={styles.numberBadge}>
        <Text style={styles.numberText}>#{catalog_entry.entry_number}</Text>
      </View>

      {/* Check de desbloqueado - esquina superior izquierda */}
      {is_unlocked && (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
        </View>
      )}

      {/* ÁREA VISUAL: Imagen o Placeholder con hoja */}
      <View style={[styles.visualArea, isGrid && styles.visualAreaGrid]}>
        {hasImage ? (
          // CON IMAGEN: la imagen ocupa todo este espacio
          <Image
            source={{ uri: imageUrl }}
            style={styles.plantImage}
            resizeMode="cover"
          />
        ) : (
          // SIN IMAGEN: placeholder con hoja y candado
          <View style={styles.placeholderContent}>
            <Ionicons
              name="leaf-outline"
              size={isGrid ? 40 : 48}
              color={is_unlocked ? Colors.textSecondary : Colors.textMuted}
            />
            {!is_unlocked && (
              <Ionicons
                name="lock-closed"
                size={18}
                color={Colors.textMuted}
                style={styles.lockIcon}
              />
            )}
          </View>
        )}
      </View>

      {/* ÁREA DE INFO: nombre y badge */}
      <View style={[styles.infoArea, isGrid && styles.infoAreaGrid]}>
        <Text style={nameStyles} numberOfLines={isGrid ? 2 : 1}>
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // ========== TARJETA BASE ==========
  card: {
    backgroundColor: Colors.backgroundLighter,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  cardList: {
    width: '100%',
  },
  cardGrid: {
    width: '48%',
  },
  cardLocked: {
    opacity: 0.6,
    borderColor: Colors.textMuted,
  },

  // ========== BADGES (número y check) ==========
  numberBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 20,
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  numberText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 20,
    backgroundColor: Colors.background,
    borderRadius: 999,
    padding: 4,
  },

  // ========== ÁREA VISUAL (imagen o placeholder) ==========
  visualArea: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  visualAreaGrid: {
    height: 100,
  },
  plantImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  lockIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },

  // ========== ÁREA DE INFO ==========
  infoArea: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  infoAreaGrid: {
    padding: Spacing.sm,
    minHeight: 70,
    justifyContent: 'center',
  },
  plantName: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  plantNameGrid: {
    fontSize: Typography.sizes.sm,
  },
  plantNameLocked: {
    color: Colors.textMuted,
  },
  scientificName: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 4,
    textAlign: 'center',
  },
  badgeContainer: {
    marginTop: 4,
  },
});
