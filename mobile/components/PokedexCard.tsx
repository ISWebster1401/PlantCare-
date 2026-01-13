/**
 * Componente para mostrar una tarjeta de entrada de pokedex
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { PokedexEntryResponse } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface PokedexCardProps {
  entry: PokedexEntryResponse;
  onPress?: () => void;
  viewMode?: 'list' | 'grid';
}

export const PokedexCard: React.FC<PokedexCardProps> = ({ entry, onPress, viewMode = 'list' }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme.colors);

  const getCareLevelColor = (level: string | null) => {
    if (!level) return '#b0bec5';
    const levelMap: Record<string, string> = {
      'Fácil': '#4caf50',
      'Medio': '#ff9800',
      'Difícil': '#f44336',
    };
    return levelMap[level] || '#b0bec5';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (viewMode === 'grid') {
    return (
      <TouchableOpacity 
        style={styles.gridCard} 
        onPress={onPress} 
        activeOpacity={0.8}
      >
        <View style={styles.gridImageContainer}>
          {entry.is_unlocked && entry.discovered_photo_url ? (
            <Image
              source={{ uri: entry.discovered_photo_url }}
              style={styles.gridImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.gridPlaceholder}>
              <Ionicons name="leaf" size={32} color={theme.colors.primary} />
            </View>
          )}
          {entry.catalog_entry.entry_number && (
            <View style={styles.entryNumberBadge}>
              <Text style={styles.entryNumberText}>
                #{entry.catalog_entry.entry_number.toString().padStart(3, '0')}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.gridContent}>
          {entry.is_unlocked ? (
            <>
              <Text style={styles.gridPlantType} numberOfLines={1}>
                {entry.catalog_entry.plant_type || 'Planta'}
              </Text>
              {entry.catalog_entry.care_level && (
                <View style={[styles.gridCareLevelBadge, { backgroundColor: `${getCareLevelColor(entry.catalog_entry.care_level)}20` }]}>
                  <Text style={[styles.gridCareLevelText, { color: getCareLevelColor(entry.catalog_entry.care_level) }]}>
                    {entry.catalog_entry.care_level}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.gridPlantType} numberOfLines={1}>
                ???
              </Text>
              <View style={[styles.gridCareLevelBadge, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Text style={[styles.gridCareLevelText, { color: theme.colors.primary }]}>
                  🔒 Bloqueada
                </Text>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress} 
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        {entry.is_unlocked && entry.discovered_photo_url ? (
          <Image
            source={{ uri: entry.discovered_photo_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="leaf" size={32} color={theme.colors.primary} />
          </View>
        )}
        {entry.catalog_entry.entry_number && (
          <View style={styles.entryNumberBadge}>
            <Text style={styles.entryNumberText}>
              #{entry.catalog_entry.entry_number.toString().padStart(3, '0')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {entry.is_unlocked ? (
          <>
            <Text style={styles.plantType} numberOfLines={1}>
              {entry.catalog_entry.plant_type || 'Planta'}
            </Text>
            {entry.catalog_entry.scientific_name && (
              <Text style={styles.scientificName} numberOfLines={1}>
                {entry.catalog_entry.scientific_name}
              </Text>
            )}

            {entry.catalog_entry.care_level && (
              <View style={[styles.careLevelBadge, { backgroundColor: `${getCareLevelColor(entry.catalog_entry.care_level)}15` }]}>
                <Text style={[styles.careLevelText, { color: getCareLevelColor(entry.catalog_entry.care_level) }]}>
                  {entry.catalog_entry.care_level}
                </Text>
              </View>
            )}

            {entry.discovered_at && (
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={12} color={theme.colors.textSecondary} />
                <Text style={styles.dateText}>
                  {formatDate(entry.discovered_at)}
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.plantType} numberOfLines={1}>
              ???
            </Text>
            <Text style={styles.scientificName} numberOfLines={1}>
              Planta desconocida
            </Text>
            <View style={[styles.careLevelBadge, { backgroundColor: `${theme.colors.primary}15` }]}>
              <Text style={[styles.careLevelText, { color: theme.colors.primary }]}>
                🔒 Bloqueada
              </Text>
            </View>
            <View style={styles.dateContainer}>
              <Ionicons name="lock-closed-outline" size={12} color={theme.colors.textSecondary} />
              <Text style={styles.dateText}>
                Escanea para desbloquear
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.chevronContainer}>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.iconSecondary} />
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (colors: any) => {
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const GRID_CARD_WIDTH = (SCREEN_WIDTH - 32) / 2 - 6;
  
  return StyleSheet.create({
  // List View Styles
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    marginRight: 10,
    position: 'relative',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  placeholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${colors.primary}12`,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  entryNumberBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  entryNumberText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  plantType: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  scientificName: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  careLevelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 6,
  },
  careLevelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dateText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  chevronContainer: {
    marginLeft: 6,
    opacity: 0.4,
  },
  // Grid View Styles
  gridCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    margin: 4,
    width: GRID_CARD_WIDTH,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  gridImageContainer: {
    width: '100%',
    height: GRID_CARD_WIDTH,
    position: 'relative',
    backgroundColor: colors.background,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
  },
  gridPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${colors.primary}12`,
  },
  gridContent: {
    padding: 8,
  },
  gridPlantType: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  gridCareLevelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  gridCareLevelText: {
    fontSize: 9,
    fontWeight: '600',
  },
  });
};
