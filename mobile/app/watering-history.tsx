/**
 * Pantalla de Historial de Riego
 *
 * - Lee sesiones de riego guardadas en AsyncStorage
 * - Filtra por plantId para mostrar solo los riegos de esa planta
 * - Muestra fecha, duración, humedad inicio/fin y si alcanzó la meta
 * - Empty state si no hay riegos registrados
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Gradients,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../constants/DesignSystem';

/* -------------------------------------------------- */
/*  Constantes y tipo (igual que en watering.tsx)     */
/* -------------------------------------------------- */

const STORAGE_KEY = 'plantcare_watering_sessions';

interface StoredWateringSession {
  id: string;
  plantId: number;
  plantName: string;
  sensorId: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  humidityStart: number;
  humidityEnd: number;
  targetHumidity: number;
}

/* -------------------------------------------------- */
/*  Pantalla                                          */
/* -------------------------------------------------- */

export default function WateringHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    plantId: string;
    plantName: string;
    sensorId: string;
  }>();

  const [sessions, setSessions] = useState<StoredWateringSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const all: StoredWateringSession[] = raw ? JSON.parse(raw) : [];
      const plantId = parseInt(params.plantId, 10);
      const filtered = all.filter((s) => s.plantId === plantId);
      setSessions(filtered);
    } catch (e) {
      console.error('Error cargando historial de riego:', e);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [params.plantId]);

  // Recargar cuando la pantalla recibe foco (ej. volver del riego)
  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

  /* --- helpers de formato --- */

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString('es-CL', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const formatTime = (iso: string): string => {
    try {
      return new Date(iso).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  };

  const handleDeleteSession = (sessionId: string) => {
    Alert.alert(
      'Eliminar registro',
      '¿Seguro que quieres eliminar este registro de riego?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const raw = await AsyncStorage.getItem(STORAGE_KEY);
              const all: StoredWateringSession[] = raw ? JSON.parse(raw) : [];
              const updated = all.filter((s) => s.id !== sessionId);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              setSessions((prev) => prev.filter((s) => s.id !== sessionId));
            } catch (e) {
              console.error('Error eliminando sesión:', e);
            }
          },
        },
      ],
    );
  };

  /* --- render item --- */

  const renderSession = ({ item }: { item: StoredWateringSession }) => {
    const reachedGoal = item.humidityEnd >= item.targetHumidity;
    const humidityDelta = item.humidityEnd - item.humidityStart;

    return (
      <View style={styles.sessionCard}>
        {/* Encabezado: fecha y hora */}
        <View style={styles.sessionHeader}>
          <View style={styles.sessionDateRow}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.sessionDate}>{formatDate(item.startTime)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteSession(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Hora de inicio y fin */}
        <Text style={styles.sessionTime}>
          {formatTime(item.startTime)} - {formatTime(item.endTime)}
        </Text>

        {/* Stats */}
        <View style={styles.sessionStats}>
          <View style={styles.sessionStat}>
            <Ionicons name="time-outline" size={18} color={Colors.secondary} />
            <Text style={styles.sessionStatValue}>{formatDuration(item.durationSeconds)}</Text>
            <Text style={styles.sessionStatLabel}>Duración</Text>
          </View>

          <View style={styles.sessionStat}>
            <Ionicons name="water-outline" size={18} color={Colors.primary} />
            <Text style={styles.sessionStatValue}>
              {item.humidityStart}% → {item.humidityEnd}%
            </Text>
            <Text style={styles.sessionStatLabel}>Humedad</Text>
          </View>

          <View style={styles.sessionStat}>
            <Ionicons
              name={reachedGoal ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={reachedGoal ? Colors.success : Colors.warning}
            />
            <Text
              style={[
                styles.sessionStatValue,
                { color: reachedGoal ? Colors.success : Colors.warning },
              ]}
            >
              {reachedGoal ? 'Sí' : 'No'}
            </Text>
            <Text style={styles.sessionStatLabel}>Meta</Text>
          </View>
        </View>

        {/* Barra visual de humedad */}
        <View style={styles.miniGaugeTrack}>
          <View
            style={[
              styles.miniGaugeFillStart,
              { width: `${Math.min((item.humidityStart / item.targetHumidity) * 100, 100)}%` },
            ]}
          />
          <LinearGradient
            colors={['#64B5F6', reachedGoal ? '#4CAF50' : '#FFB74D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.miniGaugeFillEnd,
              { width: `${Math.min((item.humidityEnd / item.targetHumidity) * 100, 100)}%` },
            ]}
          />
        </View>

        {humidityDelta > 0 && (
          <Text style={styles.deltaText}>+{humidityDelta}% de humedad</Text>
        )}
      </View>
    );
  };

  /* --- render --- */

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView>
          <View style={styles.headerBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Historial de Riego
            </Text>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Nombre de planta */}
      <View style={styles.plantHeader}>
        <Ionicons name="leaf" size={20} color={Colors.primaryLight} />
        <Text style={styles.plantHeaderText}>
          {params.plantName || 'Mi planta'}
        </Text>
        {sessions.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{sessions.length}</Text>
          </View>
        )}
      </View>

      {/* Contenido */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centeredText}>Cargando historial...</Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🌵</Text>
          <Text style={styles.emptyTitle}>Aún no has regado esta planta</Text>
          <Text style={styles.emptySubtitle}>
            Cuando registres un riego desde la pantalla de riego, aparecerá aquí con todos los detalles.
          </Text>
          <TouchableOpacity
            style={styles.goBackBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.goBackBtnText}>Volver al detalle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSession}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

/* -------------------------------------------------- */
/*  Estilos                                           */
/* -------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    textAlign: 'center',
  },
  plantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  plantHeaderText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  countBadge: {
    backgroundColor: Colors.primary,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },

  /* --- estados --- */
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  centeredText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
  },

  /* --- empty state --- */
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  goBackBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
  },
  goBackBtnText: {
    color: Colors.white,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },

  /* --- lista --- */
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  /* --- card de sesión --- */
  sessionCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sessionDate: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  sessionTime: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: Spacing.md,
  },

  /* --- stats dentro de card --- */
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  sessionStat: {
    alignItems: 'center',
    gap: 2,
  },
  sessionStatValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  sessionStatLabel: {
    fontSize: Typography.sizes.xs - 1,
    color: Colors.textMuted,
  },

  /* --- mini gauge --- */
  miniGaugeTrack: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.backgroundLighter,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  miniGaugeFillStart: {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'rgba(100,181,246,0.3)',
    borderRadius: BorderRadius.full,
  },
  miniGaugeFillEnd: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  deltaText: {
    fontSize: Typography.sizes.xs,
    color: Colors.success,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
});
