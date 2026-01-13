/**
 * Pantalla de Detalles de Entrada de Pokedex
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { pokedexAPI, plantsAPI } from '../services/api';
import { PokedexEntryResponse } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function PokedexEntryDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<PokedexEntryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const styles = createStyles(theme.colors);

  useEffect(() => {
    loadEntry();
  }, [params.id]);

  const loadEntry = async () => {
    if (!params.id) {
      setError('ID de entrada no proporcionado');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const entryData = await pokedexAPI.getPokedexEntry(parseInt(params.id, 10));
      setEntry(entryData);
    } catch (err: any) {
      console.error('Error cargando entrada de pokedex:', err);
      setError('No se pudo cargar la información de la entrada');
      Alert.alert('Error', 'No se pudo cargar la información de la entrada');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToGarden = () => {
    Alert.alert(
      'Agregar a Mi Jardín',
      '¿Quieres agregar esta planta a tu jardín? Necesitarás darle un nombre.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: () => {
            router.push({
              pathname: '/scan-plant',
              params: { fromPokedex: 'true', entryId: params.id },
            });
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Cargando entrada...</Text>
        </View>
      </View>
    );
  }

  if (error || !entry) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} />
          <Text style={styles.errorText}>{error || 'Entrada no encontrada'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadEntry}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {entry.catalog_entry.plant_type || 'Planta'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Foto */}
        <View style={styles.imageSection}>
          {entry.is_unlocked && entry.discovered_photo_url ? (
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: entry.discovered_photo_url }}
                style={styles.plantImage}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <View style={styles.placeholderIconContainer}>
                <Ionicons name="leaf" size={64} color={theme.colors.primary} />
              </View>
              <Text style={styles.placeholderText}>
                {entry.is_unlocked ? 'Sin foto' : 'No desbloqueada'}
              </Text>
            </View>
          )}
        </View>

        {/* Información básica */}
        <View style={styles.infoSection}>
          <View style={styles.plantTypeContainer}>
            <Ionicons name="leaf" size={24} color={theme.colors.primary} />
            <View style={styles.plantTypeContent}>
              <Text style={styles.plantType}>
                {entry.catalog_entry.plant_type || 'Planta'}
              </Text>
              {entry.catalog_entry.scientific_name && (
                <Text style={styles.scientificName}>{entry.catalog_entry.scientific_name}</Text>
              )}
            </View>
          </View>
          {entry.catalog_entry.care_level && (
            <View style={[styles.careLevelBadge, { backgroundColor: `${theme.colors.primary}15` }]}>
              <Ionicons name="star" size={16} color={theme.colors.primary} />
              <Text style={[styles.careLevel, { color: theme.colors.primary }]}>
                Nivel: {entry.catalog_entry.care_level}
              </Text>
            </View>
          )}
        </View>

        {/* Fecha de descubrimiento */}
        {entry.is_unlocked && entry.discovered_at && (
          <View style={styles.dateSection}>
            <View style={styles.dateCard}>
              <Ionicons name="calendar" size={20} color={theme.colors.textSecondary} />
              <View style={styles.dateContent}>
                <Text style={styles.dateLabel}>Descubierta el</Text>
                <Text style={styles.dateValue}>{formatDate(entry.discovered_at)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tips de cuidado */}
        {entry.catalog_entry.care_tips && (
          <View style={styles.tipsSection}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="bulb" size={24} color="#ffb74d" />
              <Text style={styles.sectionTitle}>Tips de Cuidado</Text>
            </View>
            <View style={styles.tipsCard}>
              <Text style={styles.tipsText}>{entry.catalog_entry.care_tips}</Text>
            </View>
          </View>
        )}

        {/* Condiciones óptimas */}
        {(entry.catalog_entry.optimal_humidity_min || entry.catalog_entry.optimal_temp_min) && (
          <View style={styles.conditionsSection}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="stats-chart" size={24} color="#64b5f6" />
              <Text style={styles.sectionTitle}>Condiciones Óptimas</Text>
            </View>
            <View style={styles.conditionsRow}>
              {entry.catalog_entry.optimal_humidity_min && entry.catalog_entry.optimal_humidity_max && (
                <View style={styles.conditionCard}>
                  <Ionicons name="water" size={24} color="#64b5f6" />
                  <Text style={styles.conditionLabel}>Humedad</Text>
                  <Text style={styles.conditionValue}>
                    {entry.catalog_entry.optimal_humidity_min}% - {entry.catalog_entry.optimal_humidity_max}%
                  </Text>
                </View>
              )}
              {entry.catalog_entry.optimal_temp_min && entry.catalog_entry.optimal_temp_max && (
                <View style={styles.conditionCard}>
                  <Ionicons name="thermometer" size={24} color="#ef5350" />
                  <Text style={styles.conditionLabel}>Temperatura</Text>
                  <Text style={styles.conditionValue}>
                    {entry.catalog_entry.optimal_temp_min}°C - {entry.catalog_entry.optimal_temp_max}°C
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Botón Agregar a Jardín */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddToGarden}>
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Agregar a Mi Jardín</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  imageWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  plantImage: {
    width: 300,
    height: 300,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    width: 300,
    height: 300,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  placeholderIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  infoSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  plantTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  plantTypeContent: {
    flex: 1,
    marginLeft: 12,
  },
  plantType: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  careLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  careLevel: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateContent: {
    marginLeft: 12,
  },
  dateLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  tipsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  tipsCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: '#ffb74d',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tipsText: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.textSecondary,
  },
  conditionsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  conditionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  conditionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  conditionLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  conditionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  actionSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 32,
  },
});
