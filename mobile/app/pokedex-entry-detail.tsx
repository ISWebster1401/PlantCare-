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

  // Función para determinar si es Interior o Exterior
  const getLocationType = (): 'Interior' | 'Exterior' | 'Adaptable' => {
    if (!entry) return 'Adaptable';
    
    const tempMin = entry.catalog_entry.optimal_temp_min;
    const tempMax = entry.catalog_entry.optimal_temp_max;
    
    if (!tempMin || !tempMax) return 'Adaptable';
    
    // Si la temperatura mínima es menor a 5°C, probablemente es exterior
    if (tempMin < 5) return 'Exterior';
    
    // Si la temperatura mínima es >= 10°C y el rango es pequeño (menos de 15°C), probablemente es interior
    if (tempMin >= 10 && (tempMax - tempMin) < 15) return 'Interior';
    
    return 'Adaptable';
  };

  const locationType = entry ? getLocationType() : 'Adaptable';
  const getLocationColor = () => {
    switch (locationType) {
      case 'Interior': return '#4a90e2';
      case 'Exterior': return '#50c878';
      default: return '#9b59b6';
    }
  };
  const getLocationIcon = () => {
    switch (locationType) {
      case 'Interior': return 'home';
      case 'Exterior': return 'sunny';
      default: return 'resize';
    }
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

  const headerBgColor = getLocationColor() + '20';
  const headerBorderColor = getLocationColor();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: headerBgColor, borderBottomColor: headerBorderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.colors.icon} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={[styles.entryNumberBadge, { backgroundColor: headerBorderColor }]}>
            <Text style={styles.entryNumber}>
              #{entry.catalog_entry.entry_number.toString().padStart(3, '0')}
            </Text>
          </View>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {entry.catalog_entry.plant_type || 'Planta'}
            </Text>
            {entry.catalog_entry.scientific_name && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {entry.catalog_entry.scientific_name}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Foto con decoración tipo Pokémon */}
        <View style={styles.imageSection}>
          <View style={[styles.imageContainer, { borderColor: headerBorderColor }]}>
            {entry.is_unlocked && entry.discovered_photo_url ? (
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: entry.discovered_photo_url }}
                  style={styles.plantImage}
                  resizeMode="contain"
                />
                {entry.is_unlocked && (
                  <View style={[styles.unlockedBadge, { backgroundColor: '#4caf50' }]}>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.unlockedText}>¡Desbloqueada!</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <View style={[styles.placeholderIconContainer, { backgroundColor: headerBgColor }]}>
                  <Ionicons name="leaf" size={100} color={headerBorderColor} />
                </View>
                <Text style={[styles.placeholderText, { color: headerBorderColor }]}>
                  {entry.is_unlocked ? '🌱 Sin foto' : '🔒 No desbloqueada'}
                </Text>
                <Text style={styles.placeholderHint}>
                  Escanea esta planta para desbloquearla
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Información Botánica con diseño más atractivo */}
        <View style={styles.botanicalSection}>
          <View style={[styles.botanicalCard, { borderLeftColor: '#4caf50' }]}>
            <View style={styles.botanicalHeader}>
              <Ionicons name="school" size={28} color="#4caf50" />
              <Text style={styles.botanicalCardTitle}>📚 Información Científica</Text>
            </View>
            {entry.catalog_entry.scientific_name && (
              <View style={styles.botanicalRow}>
                <View style={[styles.botanicalIconCircle, { backgroundColor: '#4caf5030' }]}>
                  <Ionicons name="flask" size={24} color="#4caf50" />
                </View>
                <View style={styles.botanicalContent}>
                  <Text style={styles.botanicalLabel}>🔬 Nombre Científico</Text>
                  <Text style={styles.botanicalValue}>{entry.catalog_entry.scientific_name}</Text>
                </View>
              </View>
            )}
            {entry.catalog_entry.family && (
              <View style={[styles.botanicalRow, styles.botanicalRowSeparator]}>
                <View style={[styles.botanicalIconCircle, { backgroundColor: '#9c27b030' }]}>
                  <Ionicons name="flower" size={24} color="#9c27b0" />
                </View>
                <View style={styles.botanicalContent}>
                  <Text style={styles.botanicalLabel}>🌸 Familia Botánica</Text>
                  <Text style={styles.botanicalValue}>{entry.catalog_entry.family}</Text>
                </View>
              </View>
            )}
            {entry.catalog_entry.common_names && (
              <View style={[styles.botanicalRow, styles.botanicalRowSeparator]}>
                <View style={[styles.botanicalIconCircle, { backgroundColor: '#ff980030' }]}>
                  <Ionicons name="bookmark" size={24} color="#ff9800" />
                </View>
                <View style={styles.botanicalContent}>
                  <Text style={styles.botanicalLabel}>🏷️ También se llama</Text>
                  <Text style={styles.botanicalValue}>{entry.catalog_entry.common_names}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Estadísticas tipo Pokémon con diseño más colorido */}
        <View style={styles.statsSection}>
          <View style={styles.sectionTitleContainer}>
            <View style={[styles.sectionIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="stats-chart" size={28} color={theme.colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>⚡ Estadísticas</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statCardVibrant, { 
              borderLeftColor: getLocationColor(),
              backgroundColor: getLocationColor() + '15'
            }]}>
              <View style={[styles.statIconContainer, { backgroundColor: getLocationColor() + '30' }]}>
                <Ionicons name={getLocationIcon()} size={32} color={getLocationColor()} />
              </View>
              <Text style={styles.statLabel}>📍 Tipo</Text>
              <Text style={[styles.statValue, { color: getLocationColor() }]}>
                {locationType}
              </Text>
            </View>
            
            {entry.catalog_entry.care_level && (
              <View style={[styles.statCard, styles.statCardVibrant, { 
                borderLeftColor: '#ff9800',
                backgroundColor: '#ff980015'
              }]}>
                <View style={[styles.statIconContainer, { backgroundColor: '#ff980030' }]}>
                  <Ionicons name="star" size={32} color="#ff9800" />
                </View>
                <Text style={styles.statLabel}>⭐ Nivel</Text>
                <Text style={[styles.statValue, { color: '#ff9800' }]}>
                  {entry.catalog_entry.care_level}
                </Text>
              </View>
            )}
            
            {entry.catalog_entry.family && (
              <View style={[styles.statCard, styles.statCardVibrant, { 
                borderLeftColor: '#9c27b0',
                backgroundColor: '#9c27b015'
              }]}>
                <View style={[styles.statIconContainer, { backgroundColor: '#9c27b030' }]}>
                  <Ionicons name="flower" size={32} color="#9c27b0" />
                </View>
                <Text style={styles.statLabel}>🌸 Familia</Text>
                <Text style={[styles.statValue, { color: '#9c27b0' }]} numberOfLines={1}>
                  {entry.catalog_entry.family.split(' ')[0]}
                </Text>
              </View>
            )}
            
            <View style={[styles.statCard, styles.statCardVibrant, { 
              borderLeftColor: '#4caf50',
              backgroundColor: '#4caf5015'
            }]}>
              <View style={[styles.statIconContainer, { backgroundColor: '#4caf5030' }]}>
                <Ionicons name="leaf" size={32} color="#4caf50" />
              </View>
              <Text style={styles.statLabel}>🌿 Categoría</Text>
              <Text style={[styles.statValue, { color: '#4caf50' }]}>
                {entry.catalog_entry.plant_type || 'Planta'}
              </Text>
            </View>
          </View>
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

        {/* Tips de cuidado con diseño más divertido */}
        {entry.catalog_entry.care_tips && (
          <View style={styles.tipsSection}>
            <View style={styles.sectionTitleContainer}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#ffb74d20' }]}>
                <Ionicons name="bulb" size={28} color="#ffb74d" />
              </View>
              <Text style={styles.sectionTitle}>💡 Tips de Cuidado</Text>
            </View>
            <View style={[styles.tipsCard, { borderLeftColor: '#ffb74d' }]}>
              <View style={styles.tipsHeader}>
                <Ionicons name="sparkles" size={24} color="#ffb74d" />
                <Text style={styles.tipsTitle}>¡Aprende a cuidarla!</Text>
              </View>
              <Text style={styles.tipsText}>{entry.catalog_entry.care_tips}</Text>
            </View>
          </View>
        )}

        {/* Condiciones óptimas con diseño más atractivo */}
        {(entry.catalog_entry.optimal_humidity_min || entry.catalog_entry.optimal_temp_min) && (
          <View style={styles.conditionsSection}>
            <View style={styles.sectionTitleContainer}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#64b5f620' }]}>
                <Ionicons name="thermometer" size={28} color="#64b5f6" />
              </View>
              <Text style={styles.sectionTitle}>🌡️ Condiciones Ideales</Text>
            </View>
            <View style={styles.conditionsGrid}>
              {entry.catalog_entry.optimal_humidity_min && entry.catalog_entry.optimal_humidity_max && (
                <View style={[styles.conditionCard, styles.conditionCardEnhanced, { 
                  backgroundColor: '#2196f315',
                  borderColor: '#2196f3'
                }]}>
                  <View style={[styles.conditionIconContainer, { backgroundColor: '#2196f330' }]}>
                    <Ionicons name="water" size={40} color="#2196f3" />
                  </View>
                  <Text style={styles.conditionLabel}>💧 Humedad</Text>
                  <Text style={styles.conditionValue}>
                    {entry.catalog_entry.optimal_humidity_min}% - {entry.catalog_entry.optimal_humidity_max}%
                  </Text>
                  <Text style={styles.conditionSubtext}>Rango perfecto</Text>
                </View>
              )}
              {entry.catalog_entry.optimal_temp_min && entry.catalog_entry.optimal_temp_max && (
                <View style={[styles.conditionCard, styles.conditionCardEnhanced, { 
                  backgroundColor: '#f4433615',
                  borderColor: '#f44336'
                }]}>
                  <View style={[styles.conditionIconContainer, { backgroundColor: '#f4433630' }]}>
                    <Ionicons name="thermometer" size={40} color="#f44336" />
                  </View>
                  <Text style={styles.conditionLabel}>🌡️ Temperatura</Text>
                  <Text style={styles.conditionValue}>
                    {entry.catalog_entry.optimal_temp_min}°C - {entry.catalog_entry.optimal_temp_max}°C
                  </Text>
                  <Text style={styles.conditionSubtext}>{locationType}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Botón Agregar a Jardín más atractivo */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddToGarden} activeOpacity={0.8}>
            <View style={styles.addButtonContent}>
              <View style={styles.addButtonIconContainer}>
                <Ionicons name="add-circle" size={32} color="#fff" />
              </View>
              <View>
                <Text style={styles.addButtonText}>🌱 Agregar a Mi Jardín</Text>
                <Text style={styles.addButtonSubtext}>¡Cultiva esta planta en tu jardín!</Text>
              </View>
            </View>
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
    borderBottomWidth: 3,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: 10,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: colors.background + '80',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entryNumberBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  entryNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1.5,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
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
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    borderWidth: 4,
    borderRadius: 24,
    padding: 8,
    backgroundColor: colors.surface,
  },
  imageWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: colors.primary + '40',
    position: 'relative',
  },
  plantImage: {
    width: 320,
    height: 320,
    backgroundColor: colors.surface,
  },
  unlockedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  unlockedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  imagePlaceholder: {
    width: 320,
    height: 320,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderStyle: 'dashed',
    padding: 20,
  },
  placeholderIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderStyle: 'dashed',
  },
  placeholderText: {
    marginTop: 20,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  placeholderHint: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  botanicalSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  botanicalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  botanicalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  botanicalCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  botanicalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  botanicalRowSeparator: {
    borderTopWidth: 2,
    borderTopColor: colors.border,
    marginTop: 8,
    paddingTop: 18,
  },
  botanicalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botanicalContent: {
    flex: 1,
    marginLeft: 14,
  },
  botanicalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  botanicalValue: {
    fontSize: 17,
    color: colors.text,
    fontWeight: '600',
    lineHeight: 24,
  },
  statsSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: colors.border,
    borderLeftWidth: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardVibrant: {
    borderWidth: 2,
  },
  statIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
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
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  tipsCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 22,
    borderWidth: 2,
    borderColor: colors.border,
    borderLeftWidth: 6,
    shadowColor: '#ffb74d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  tipsText: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.text,
    fontWeight: '500',
  },
  conditionsSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  conditionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  conditionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 3,
  },
  conditionCardEnhanced: {
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  conditionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  conditionLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  conditionValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  conditionSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  actionSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  addButtonIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  addButtonSubtext: {
    color: '#ffffff90',
    fontSize: 13,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 40,
  },
});
