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
} from 'react-native';
import { PokedexEntryResponse } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface PokedexCardProps {
  entry: PokedexEntryResponse;
  onPress?: () => void;
}

export const PokedexCard: React.FC<PokedexCardProps> = ({ entry, onPress }) => {
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
            <Ionicons name="leaf" size={40} color={theme.colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.content}>
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

        {entry.is_unlocked && entry.discovered_at && (
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.dateText}>
              {formatDate(entry.discovered_at)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.chevronContainer}>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.iconSecondary} />
      </View>
    </TouchableOpacity>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
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
    backgroundColor: `${colors.primary}15`,
    borderWidth: 2,
    borderColor: colors.border,
  },
  content: {
    flex: 1,
  },
  plantType: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  scientificName: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  careLevelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  careLevelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  chevronContainer: {
    marginLeft: 8,
    opacity: 0.5,
  },
});
