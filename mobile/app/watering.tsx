/**
 * Pantalla de Riego en Tiempo Real
 *
 * - Hace polling cada 1s al sensor real para obtener soil_moisture
 * - Si no hay sensor asignado, muestra mensaje para conectar uno
 * - Guarda las sesiones de riego en AsyncStorage para el historial
 * - NO simula datos: todo viene del sensor real
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { plantsAPI, sensorsAPI } from '../services/api';
import { PlantResponse } from '../types';
import {
  Colors,
  Gradients,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../constants/DesignSystem';

/* -------------------------------------------------- */
/*  Constantes                                        */
/* -------------------------------------------------- */

const WATERING_POLLING_INTERVAL = 1000; // 1s durante riego activo
const DROP_COUNT = 5;
const STORAGE_KEY = 'plantcare_watering_sessions';

/* -------------------------------------------------- */
/*  Tipo de sesión almacenada localmente              */
/* -------------------------------------------------- */

export interface StoredWateringSession {
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
/*  Helper: guardar sesión en AsyncStorage            */
/* -------------------------------------------------- */

async function saveWateringSession(session: StoredWateringSession) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const sessions: StoredWateringSession[] = raw ? JSON.parse(raw) : [];
    sessions.unshift(session); // más reciente primero
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Error guardando sesión de riego:', e);
  }
}

/* -------------------------------------------------- */
/*  Componente de gota animada                        */
/* -------------------------------------------------- */

function WaterDrop({ delay, left }: { delay: number; left: number }) {
  const translateY = useRef(new Animated.Value(-30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 180,
            duration: 1200,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.delay(700),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.timing(translateY, {
          toValue: -30,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [delay, translateY, opacity]);

  return (
    <Animated.Text
      style={[
        styles.waterDrop,
        { left: `${left}%`, transform: [{ translateY }], opacity },
      ]}
    >
      💧
    </Animated.Text>
  );
}

/* -------------------------------------------------- */
/*  Pantalla principal                                */
/* -------------------------------------------------- */

export default function WateringScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plantId: string; plantName: string }>();

  const [plant, setPlant] = useState<PlantResponse | null>(null);
  const [isWatering, setIsWatering] = useState(false);
  const [currentHumidity, setCurrentHumidity] = useState<number | null>(null);
  const [humidityStart, setHumidityStart] = useState<number>(0);
  const [targetHumidity, setTargetHumidity] = useState(80);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [sensorError, setSensorError] = useState(false);
  const [noSensor, setNoSensor] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  /* --- carga planta --- */

  useEffect(() => {
    if (!params.plantId) return;
    (async () => {
      try {
        const data = await plantsAPI.getPlant(parseInt(params.plantId, 10));
        setPlant(data);
        setTargetHumidity(data.optimal_humidity_max ?? 80);

        if (!data.sensor_id) {
          setNoSensor(true);
          return;
        }

        // Lectura inicial del sensor
        try {
          const reading = await sensorsAPI.getLatestReading(data.sensor_id.toString());
          setCurrentHumidity(reading.soil_moisture);
        } catch {
          setSensorError(true);
        }
      } catch (e) {
        console.error('Error cargando planta en riego:', e);
      }
    })();
  }, [params.plantId]);

  /* --- animación de pulso en el botón --- */

  useEffect(() => {
    if (!isWatering) {
      pulseAnim.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [isWatering, pulseAnim]);

  /* --- polling sensor real --- */

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const fetchHumidity = useCallback(async () => {
    if (!plant?.sensor_id) return;
    try {
      const reading = await sensorsAPI.getLatestReading(plant.sensor_id.toString());
      setCurrentHumidity(reading.soil_moisture);
      setSensorError(false);
    } catch {
      setSensorError(true);
    }
  }, [plant]);

  const startWatering = useCallback(() => {
    if (!plant?.sensor_id) return;

    setHumidityStart(currentHumidity ?? 0);
    setIsWatering(true);
    setSessionStart(new Date());

    // Polling cada 1s al sensor real
    pollingRef.current = setInterval(fetchHumidity, WATERING_POLLING_INTERVAL);
  }, [currentHumidity, fetchHumidity, plant]);

  const stopWatering = useCallback(async () => {
    stopPolling();
    setIsWatering(false);

    if (plant && sessionStart) {
      const endTime = new Date();
      const durationSeconds = Math.round((endTime.getTime() - sessionStart.getTime()) / 1000);

      const session: StoredWateringSession = {
        id: `${plant.id}-${sessionStart.getTime()}`,
        plantId: plant.id,
        plantName: plant.plant_name || params.plantName || 'Planta',
        sensorId: plant.sensor_id?.toString() ?? '',
        startTime: sessionStart.toISOString(),
        endTime: endTime.toISOString(),
        durationSeconds,
        humidityStart,
        humidityEnd: currentHumidity ?? 0,
        targetHumidity,
      };

      await saveWateringSession(session);
      Alert.alert('Riego registrado', `Duración: ${formatDuration(durationSeconds)}\nHumedad: ${humidityStart}% → ${currentHumidity}%`);
    }
  }, [plant, sessionStart, currentHumidity, targetHumidity, humidityStart, stopPolling, params.plantName]);

  /* --- detener automáticamente si llega al límite --- */

  useEffect(() => {
    if (isWatering && currentHumidity != null && currentHumidity >= targetHumidity) {
      stopWatering();
    }
  }, [currentHumidity, targetHumidity, isWatering, stopWatering]);

  /* --- limpiar al desmontar --- */

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  /* --- helpers --- */

  const reachedLimit = currentHumidity != null && currentHumidity >= targetHumidity;

  const speechText = noSensor
    ? 'Necesito un sensor para monitorear mi humedad'
    : sensorError
    ? 'No puedo leer el sensor... ¿está encendido?'
    : !isWatering && !reachedLimit
    ? 'Presiona para comenzar el riego'
    : isWatering
    ? '¡Qué rica agua! 💧'
    : '¡Deja de regarme! Ya estoy feliz 🌱';

  const progressPercent = currentHumidity != null
    ? Math.min((currentHumidity / targetHumidity) * 100, 100)
    : 0;

  const imageUri =
    plant?.character_image_url ||
    plant?.default_render_url ||
    plant?.original_photo_url ||
    undefined;

  const canStartWatering = !noSensor && !sensorError && !reachedLimit;

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
              onPress={() => {
                if (isWatering) stopWatering();
                router.back();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Riego en Tiempo Real</Text>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.body}>
        {/* Planta + gotas */}
        <View style={styles.plantArea}>
          {isWatering &&
            Array.from({ length: DROP_COUNT }).map((_, i) => (
              <WaterDrop key={i} delay={i * 220} left={20 + i * 14} />
            ))}

          <View style={styles.plantCircle}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.plantImg} resizeMode="cover" />
            ) : (
              <Ionicons name="leaf" size={60} color={Colors.primaryLight} />
            )}
          </View>

          <Text style={styles.plantName}>
            {params.plantName || plant?.plant_name || 'Mi planta'}
          </Text>
        </View>

        {/* Burbuja de diálogo */}
        <View style={[styles.speechBubble, noSensor && styles.speechBubbleWarning]}>
          <Text style={styles.speechText}>{speechText}</Text>
        </View>

        {/* Aviso sin sensor */}
        {noSensor && (
          <View style={styles.noSensorBox}>
            <Ionicons name="hardware-chip-outline" size={24} color={Colors.accent} />
            <Text style={styles.noSensorText}>
              Esta planta no tiene un sensor asignado. Asigna un sensor desde la pantalla de dispositivos para ver datos de humedad en tiempo real.
            </Text>
          </View>
        )}

        {/* Gauge de humedad (solo si hay sensor) */}
        {!noSensor && (
          <View style={styles.gaugeContainer}>
            <Text style={styles.gaugeLabel}>Humedad del suelo (sensor real)</Text>
            <View style={styles.gaugeTrack}>
              <LinearGradient
                colors={['#64B5F6', '#4CAF50']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gaugeFill, { width: `${progressPercent}%` }]}
              />
            </View>
            <View style={styles.gaugeValues}>
              <Text style={styles.gaugeValueText}>
                {currentHumidity != null ? `${currentHumidity}%` : '--'}
              </Text>
              <Text style={styles.gaugeTargetText}>Meta: {targetHumidity}%</Text>
            </View>
            {sensorError && (
              <View style={styles.sensorErrorRow}>
                <Ionicons name="warning-outline" size={14} color={Colors.warning} />
                <Text style={styles.sensorErrorText}>
                  Error leyendo sensor. Reintentando...
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Botón principal */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          {noSensor ? (
            <TouchableOpacity
              style={[styles.waterButton, { backgroundColor: Colors.accent }]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back-circle" size={28} color={Colors.white} />
              <Text style={styles.waterButtonText}>Volver y asignar sensor</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.waterButton,
                reachedLimit && styles.waterButtonDone,
                isWatering && styles.waterButtonActive,
                !canStartWatering && !isWatering && styles.waterButtonDisabled,
              ]}
              onPress={
                isWatering
                  ? stopWatering
                  : reachedLimit
                  ? () => router.back()
                  : canStartWatering
                  ? startWatering
                  : undefined
              }
              activeOpacity={0.8}
              disabled={!canStartWatering && !isWatering && !reachedLimit}
            >
              <Ionicons
                name={reachedLimit ? 'checkmark-circle' : isWatering ? 'pause-circle' : 'water'}
                size={28}
                color={Colors.white}
              />
              <Text style={styles.waterButtonText}>
                {reachedLimit
                  ? 'Riego completado - Volver'
                  : isWatering
                  ? 'Detener Riego'
                  : 'Comenzar Riego'}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Info de sesión */}
        {(isWatering || reachedLimit) && sessionStart && (
          <Text style={styles.sessionInfo}>
            Inicio: {sessionStart.toLocaleTimeString()} | Humedad: {humidityStart}% → {currentHumidity ?? '--'}%
          </Text>
        )}
      </View>
    </View>
  );
}

/* -------------------------------------------------- */
/*  Helpers                                           */
/* -------------------------------------------------- */

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
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
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    alignItems: 'center',
  },

  /* --- planta --- */
  plantArea: {
    alignItems: 'center',
    position: 'relative',
    width: '100%',
    minHeight: 200,
  },
  plantCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: Colors.primaryLight,
    ...Shadows.md,
  },
  plantImg: {
    width: '100%',
    height: '100%',
  },
  plantName: {
    marginTop: Spacing.sm,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },

  /* --- gotas --- */
  waterDrop: {
    position: 'absolute',
    top: -20,
    fontSize: 22,
    zIndex: 10,
  },

  /* --- speech bubble --- */
  speechBubble: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
    maxWidth: '90%',
  },
  speechBubbleWarning: {
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  speechText: {
    fontSize: Typography.sizes.base,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: Typography.weights.medium,
  },

  /* --- sin sensor --- */
  noSensorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.backgroundLighter,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    width: '100%',
  },
  noSensorText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  /* --- gauge --- */
  gaugeContainer: {
    width: '100%',
    marginTop: Spacing.xl,
  },
  gaugeLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  gaugeTrack: {
    width: '100%',
    height: 16,
    backgroundColor: Colors.backgroundLighter,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  gaugeValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  gaugeValueText: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  gaugeTargetText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    alignSelf: 'flex-end',
  },
  sensorErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  sensorErrorText: {
    fontSize: Typography.sizes.xs,
    color: Colors.warning,
  },

  /* --- botón de riego --- */
  waterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
    ...Shadows.lg,
  },
  waterButtonActive: {
    backgroundColor: Colors.warning,
  },
  waterButtonDone: {
    backgroundColor: Colors.success,
  },
  waterButtonDisabled: {
    opacity: 0.5,
  },
  waterButtonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },

  /* --- info sesión --- */
  sessionInfo: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
  },
});
