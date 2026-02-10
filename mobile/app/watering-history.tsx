/**
 * Pantalla de Historial de Riego
 *
 * - Muestra lecturas del sensor agrupadas por fecha
 * - Si no hay sensor ni datos, muestra un empty state amigable
 * - Preparada para conectar con endpoint real de historial de riego
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { sensorsAPI, wateringAPI } from '../services/api';
import { SensorReadingResponse } from '../types';
import {
  Colors,
  Gradients,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../constants/DesignSystem';

/* -------------------------------------------------- */
/*  Tipos auxiliares                                  */
/* -------------------------------------------------- */

interface GroupedReadings {
  date: string; // YYYY-MM-DD
  readings: SensorReadingResponse[];
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

  const [groups, setGroups] = useState<GroupedReadings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      if (params.sensorId) {
        // Obtener lecturas reales del sensor
        const readings = await sensorsAPI.getSensorReadings(params.sensorId, 50);
        setGroups(groupByDate(readings));
      } else {
        // Sin sensor: intentar stub de historial de riego
        // TODO: conectar con endpoint real cuando exista
        await wateringAPI.getHistory(parseInt(params.plantId, 10));
        setGroups([]);
      }
    } catch (e) {
      console.error('Error cargando historial:', e);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const groupByDate = (readings: SensorReadingResponse[]): GroupedReadings[] => {
    const map: Record<string, SensorReadingResponse[]> = {};
    for (const r of readings) {
      const date = r.timestamp?.split('T')[0] ?? r.created_at?.split('T')[0] ?? 'Sin fecha';
      if (!map[date]) map[date] = [];
      map[date].push(r);
    }
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, readings]) => ({ date, readings }));
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

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    } catch {
      return dateStr;
    }
  };

  const getHumidityColor = (moisture: number): string => {
    if (moisture >= 70) return Colors.success;
    if (moisture >= 40) return Colors.warning;
    return Colors.error;
  };

  /* --- render items --- */

  const renderReading = ({ item }: { item: SensorReadingResponse }) => (
    <View style={styles.readingRow}>
      <View style={styles.readingTime}>
        <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.readingTimeText}>{formatTime(item.timestamp)}</Text>
      </View>

      <View style={styles.readingStats}>
        <View style={styles.readingStat}>
          <View
            style={[
              styles.indicator,
              { backgroundColor: getHumidityColor(item.soil_moisture) },
            ]}
          />
          <Text style={styles.readingStatValue}>{item.soil_moisture}%</Text>
          <Text style={styles.readingStatLabel}>Humedad</Text>
        </View>

        <View style={styles.readingStat}>
          <Ionicons name="thermometer-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.readingStatValue}>{item.temperature}°C</Text>
          <Text style={styles.readingStatLabel}>Temp</Text>
        </View>

        {item.air_humidity != null && (
          <View style={styles.readingStat}>
            <Ionicons name="water-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.readingStatValue}>{item.air_humidity}%</Text>
            <Text style={styles.readingStatLabel}>Aire</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderGroup = ({ item }: { item: GroupedReadings }) => (
    <View style={styles.dateGroup}>
      <Text style={styles.dateTitle}>{formatDate(item.date)}</Text>
      {item.readings.map((r) => (
        <View key={r.id}>{renderReading({ item: r })}</View>
      ))}
    </View>
  );

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
      </View>

      {/* Contenido */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centeredText}>Cargando historial...</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🌵</Text>
          <Text style={styles.emptyTitle}>Aún no has regado esta planta</Text>
          <Text style={styles.emptySubtitle}>
            Los datos de riego aparecerán aquí una vez que registres tu primer riego.
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
          data={groups}
          keyExtractor={(item) => item.date}
          renderItem={renderGroup}
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
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
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

  /* --- grupo por fecha --- */
  dateGroup: {
    marginBottom: Spacing.lg,
  },
  dateTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
    marginBottom: Spacing.sm,
  },

  /* --- fila de lectura --- */
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  readingTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 70,
  },
  readingTimeText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
  },
  readingStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  readingStat: {
    alignItems: 'center',
    gap: 2,
  },
  readingStatValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  readingStatLabel: {
    fontSize: Typography.sizes.xs - 1,
    color: Colors.textMuted,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
