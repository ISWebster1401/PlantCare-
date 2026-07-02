/**
 * Pantalla de Detalles de Planta - Con modo oscuro (useThemeColors)
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { plantsAPI } from '../services/api';
import { PlantResponse } from '../types';
import { Model3DViewer } from '../components/Model3DViewer';
import { Button } from '../components/ui';
import { Typography, Spacing, BorderRadius, Shadows } from '../constants/DesignSystem';
import { useThemeColors, useThemeGradients } from '../context/ThemeContext';

export default function PlantDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const gradients = useThemeGradients();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [plant, setPlant] = useState<PlantResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [show3D, setShow3D] = useState(false);
  const [isModel3DLoading, setIsModel3DLoading] = useState(true);

  const DetailStatCard = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  // Menú de 3 puntos
  const [menuVisible, setMenuVisible] = useState(false);
  // Modal de renombrar
  const [renameVisible, setRenameVisible] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadPlant();
  }, [params.id]);

  const loadPlant = async () => {
    if (!params.id) {
      setError('ID de planta no proporcionado');
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const plantData = await plantsAPI.getPlant(parseInt(params.id, 10));
      setPlant(plantData);
    } catch (err: any) {
      console.error('Error cargando planta:', err);
      setError('No se pudo cargar la información de la planta');
      Alert.alert('Error', 'No se pudo cargar la información de la planta');
    } finally {
      setIsLoading(false);
    }
  };

  /* --- acciones del menú --- */

  const handleDeletePlant = () => {
    setMenuVisible(false);
    Alert.alert(
      'Eliminar planta',
      `¿Estás seguro de que quieres eliminar "${plant?.plant_name || 'esta planta'}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!plant) return;
            try {
              await plantsAPI.deletePlant(plant.id);
              Alert.alert('Planta eliminada', 'La planta fue eliminada correctamente.');
              router.back();
            } catch (e: any) {
              console.error('Error eliminando planta:', e);
              Alert.alert('Error', e?.response?.data?.detail || 'No se pudo eliminar la planta.');
            }
          },
        },
      ],
    );
  };

  const handleOpenRename = () => {
    setMenuVisible(false);
    setNewName(plant?.plant_name || '');
    setRenameVisible(true);
  };

  const handleConfirmRename = async () => {
    if (!plant || !newName.trim()) return;
    const trimmed = newName.trim();
    if (trimmed === plant.plant_name) {
      setRenameVisible(false);
      return;
    }
    try {
      const updated = await plantsAPI.renamePlant(plant.id, trimmed);
      setPlant(updated);
      setRenameVisible(false);
      Alert.alert('Nombre actualizado', `Tu planta ahora se llama "${trimmed}".`);
    } catch (e: any) {
      console.error('Error renombrando planta:', e);
      Alert.alert('Error', e?.response?.data?.detail || 'No se pudo cambiar el nombre.');
    }
  };

  /* --- helpers de texto --- */

  const getRiegoLabel = (): string => {
    if (!plant?.last_watered) return '2x semana';
    const days = Math.floor(
      (Date.now() - new Date(plant.last_watered).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Hace 1 día';
    return `Hace ${days} días`;
  };

  const getHealthLabel = (): string => {
    if (!plant) return 'Saludable';
    const h = plant.health_status || 'healthy';
    if (h === 'healthy') return 'Saludable';
    if (h === 'warning') return 'Atención';
    return 'Crítico';
  };

  const getTempLabel = (): string => {
    if (!plant?.optimal_temp_min || !plant?.optimal_temp_max) return '18-25°C';
    return `${plant.optimal_temp_min}-${plant.optimal_temp_max}°C`;
  };

  /* --- estados de carga / error --- */

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradients.primary as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerBar}>
              <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                <Ionicons name="arrow-back" size={24} color={colors.white} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Cargando...</Text>
              <View style={styles.headerBtn} />
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Cargando planta...</Text>
        </View>
      </View>
    );
  }

  if (error || !plant) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradients.primary as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerBar}>
              <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                <Ionicons name="arrow-back" size={24} color={colors.white} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Error</Text>
              <View style={styles.headerBtn} />
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.centeredState}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={[styles.stateText, { color: colors.error, marginBottom: Spacing.lg }]}>
            {error || 'Planta no encontrada'}
          </Text>
          <Button title="Reintentar" onPress={loadPlant} variant="primary" size="md" />
        </View>
      </View>
    );
  }

  /* --- datos derivados --- */

  const imageUri =
    plant.character_image_url ||
    plant.default_render_url ||
    plant.original_photo_url ||
    undefined;
  const mood = (plant.character_mood || 'happy') as string;

  /* --- render --- */

  return (
    <View style={styles.container}>
      {/* Header con gradiente */}
      <LinearGradient
        colors={gradients.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.white} />
            </TouchableOpacity>

            <Text style={styles.headerTitle} numberOfLines={1}>
              Detalle de Planta
            </Text>

            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              style={styles.headerBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="ellipsis-vertical" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Foto circular */}
        <View style={styles.photoSection}>
          <View style={styles.photoCircle}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.plantImage} resizeMode="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="leaf" size={80} color={colors.primaryLight} />
              </View>
            )}
          </View>
        </View>

        {/* Card de información */}
        <View style={styles.infoCard}>
          <Text style={styles.plantName}>
            {plant.plant_name || plant.plant_type || 'Planta'}
          </Text>
          {plant.scientific_name ? (
            <Text style={styles.scientificName}>{plant.scientific_name}</Text>
          ) : null}
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>
              Nivel: {plant.care_level || 'Medio'}
            </Text>
          </View>
          <View style={styles.statsGrid}>
            <DetailStatCard icon="💧" label="Riego" value={getRiegoLabel()} />
            <DetailStatCard icon="☀️" label="Luz" value="Indirecta" />
            <DetailStatCard icon="🌡️" label="Temp" value={getTempLabel()} />
            <DetailStatCard icon="💚" label="Salud" value={getHealthLabel()} />
          </View>
        </View>

        {/* Consejos de cuidado */}
        {plant.care_tips ? (
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb-outline" size={20} color={colors.accent} />
              <Text style={styles.tipsTitle}>Consejos de cuidado</Text>
            </View>
            {(plant.care_tips)
              .split(/[;\n]/)
              .map((t: string) => t.trim())
              .filter((t: string) => t.length > 0)
              .map((tip: string, index: number) => (
                <View key={index} style={styles.tipRow}>
                  <View style={styles.tipBullet} />
                  <Text style={styles.tipText}>
                    {tip.replace(/^[-*•]\s*/, '')}
                  </Text>
                </View>
              ))}
          </View>
        ) : null}

        {/* Toggle Foto / 3D */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: !show3D ? colors.primary : colors.backgroundLighter },
            ]}
            onPress={() => setShow3D(false)}
          >
            <Text
              style={[
                styles.toggleButtonText,
                { color: !show3D ? colors.white : colors.textMuted },
              ]}
            >
              📷 Foto Real
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: show3D ? colors.primary : colors.backgroundLighter },
            ]}
            onPress={() => setShow3D(true)}
          >
            <Text
              style={[
                styles.toggleButtonText,
                { color: show3D ? colors.white : colors.textMuted },
              ]}
            >
              🎮 Modelo 3D
            </Text>
          </TouchableOpacity>
        </View>

        {/* Modelo 3D condicional */}
        {show3D && (
          <View style={styles.model3dWrapper}>
            <Text style={styles.model3dLabel}>Vista 3D Interactiva</Text>
            {plant.model_3d_url ? (
              <>
                {isModel3DLoading && (
                  <View style={styles.model3dLoading}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.model3dLoadingText}>Cargando modelo 3D...</Text>
                  </View>
                )}
                <Model3DViewer
                  modelUrl={plant.model_3d_url}
                  style={isModel3DLoading ? { ...styles.model3dViewer, opacity: 0 } : styles.model3dViewer}
                  autoRotate={false}
                  characterMood={mood}
                  onLoad={() => setIsModel3DLoading(false)}
                  onError={() => setIsModel3DLoading(false)}
                />
              </>
            ) : (
              <View style={styles.model3dPlaceholder}>
                <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
                <Text style={styles.model3dPlaceholderText}>Modelo 3D no disponible</Text>
              </View>
            )}
          </View>
        )}

        {/* Botones de acción */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              router.push({
                pathname: '/watering',
                params: { plantId: plant.id.toString(), plantName: plant.plant_name },
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>💧 Registrar Riego</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              router.push({
                pathname: '/watering-history',
                params: {
                  plantId: plant.id.toString(),
                  plantName: plant.plant_name,
                  sensorId: plant.sensor_id?.toString() ?? '',
                },
              })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>📊 Ver Historial</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ================================================ */}
      {/*  Modal: Menú de 3 puntos                         */}
      {/* ================================================ */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleOpenRename}>
              <Ionicons name="pencil-outline" size={20} color={colors.text} />
              <Text style={styles.menuItemText}>Cambiar nombre</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleDeletePlant}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.menuItemText, { color: colors.error }]}>
                Eliminar planta
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ================================================ */}
      {/*  Modal: Renombrar planta                         */}
      {/* ================================================ */}
      <Modal
        visible={renameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.renameContainer}>
            <Text style={styles.renameTitle}>Cambiar nombre</Text>
            <Text style={styles.renameSubtitle}>
              Escribe el nuevo nombre para tu planta
            </Text>
            <TextInput
              style={styles.renameInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nombre de la planta"
              placeholderTextColor={colors.textMuted}
              autoFocus
              maxLength={50}
              selectTextOnFocus
            />
            <View style={styles.renameButtons}>
              <TouchableOpacity
                style={styles.renameBtnCancel}
                onPress={() => setRenameVisible(false)}
              >
                <Text style={styles.renameBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.renameBtnConfirm,
                  !newName.trim() && { opacity: 0.5 },
                ]}
                onPress={handleConfirmRename}
                disabled={!newName.trim()}
              >
                <Text style={styles.renameBtnConfirmText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* -------------------------------------------------- */
/*  Estilos                                           */
/* -------------------------------------------------- */

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    paddingBottom: Spacing.lg,
  },

  /* --- header --- */
  headerGradient: {
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    height: 56,
  },
  headerBtn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: colors.white,
    textAlign: 'center',
  },

  /* --- estados (carga / error) --- */
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  stateText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  /* --- foto --- */
  photoSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  photoCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: 'hidden',
    borderWidth: 6,
    borderColor: colors.primaryLight,
    backgroundColor: colors.white,
    ...Shadows.lg,
  },
  plantImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
  },

  /* --- info card --- */
  infoCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.lg,
    ...Shadows.md,
  },
  plantName: {
    fontSize: Typography.sizes.xxl - 2,
    fontWeight: Typography.weights.bold,
    color: colors.text,
    marginBottom: Spacing.xs,
  },
  scientificName: {
    fontSize: Typography.sizes.base,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  levelBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
  },
  levelBadgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: colors.white,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.backgroundLighter,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: colors.text,
  },

  /* --- tips de cuidado --- */
  tipsCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    ...Shadows.md,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tipsTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: colors.text,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  tipBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 7,
    marginRight: 12,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    lineHeight: 22,
    color: colors.textSecondary,
  },

  /* --- toggle foto / 3D --- */
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },

  /* --- modelo 3D --- */
  model3dWrapper: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    height: 200,
    backgroundColor: colors.backgroundLighter,
    borderRadius: BorderRadius.lg,
    borderWidth: 3,
    borderColor: colors.primaryLight,
    overflow: 'hidden',
    position: 'relative',
  },
  model3dLabel: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    textAlign: 'center',
    fontSize: Typography.sizes.xs,
    color: colors.textSecondary,
    backgroundColor: 'rgba(26,38,52,0.85)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    zIndex: 1,
    overflow: 'hidden',
  },
  model3dViewer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  model3dLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundLighter,
    borderRadius: BorderRadius.lg,
    zIndex: 10,
  },
  model3dLoadingText: {
    marginTop: Spacing.sm,
    fontSize: Typography.sizes.sm,
    color: colors.textSecondary,
  },
  model3dPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  model3dPlaceholderText: {
    marginTop: Spacing.sm,
    fontSize: Typography.sizes.sm,
    color: colors.textMuted,
  },

  /* --- botones de acción --- */
  actionsSection: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  primaryButton: {
    backgroundColor: colors.secondary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    ...Shadows.md,
  },
  secondaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    ...Shadows.md,
  },
  actionButtonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: colors.white,
  },

  /* --- modal overlay (compartido) --- */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* --- menú de 3 puntos --- */
  menuContainer: {
    position: 'absolute',
    top: 100,
    right: Spacing.lg,
    backgroundColor: colors.backgroundLight,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    minWidth: 200,
    ...Shadows.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  menuItemText: {
    fontSize: Typography.sizes.base,
    color: colors.text,
    fontWeight: Typography.weights.medium,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.backgroundLighter,
    marginHorizontal: Spacing.md,
  },

  /* --- modal renombrar --- */
  renameContainer: {
    backgroundColor: colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '85%',
    maxWidth: 360,
    ...Shadows.lg,
  },
  renameTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: colors.text,
    marginBottom: Spacing.xs,
  },
  renameSubtitle: {
    fontSize: Typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  renameInput: {
    backgroundColor: colors.backgroundLighter,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: Spacing.lg,
  },
  renameButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  renameBtnCancel: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  renameBtnCancelText: {
    fontSize: Typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: Typography.weights.semibold,
  },
  renameBtnConfirm: {
    backgroundColor: colors.primary,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  renameBtnConfirmText: {
    fontSize: Typography.sizes.sm,
    color: colors.white,
    fontWeight: Typography.weights.semibold,
  },
  });
}
