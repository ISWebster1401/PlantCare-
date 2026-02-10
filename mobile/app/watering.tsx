/**
 * Pantalla de Riego en Tiempo Real
 *
 * - Muestra animación de gotas de agua cayendo sobre la planta
 * - Gauge de humedad en tiempo real (polling cada 1s al sensor)
 * - Burbuja de diálogo de la planta con mensajes dinámicos
 * - Si no hay sensor, simula humedad subiendo para demo
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { plantsAPI, sensorsAPI, wateringAPI } from '../services/api';
import { PlantResponse, WateringSession } from '../types';
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

const WATERING_POLLING_INTERVAL = 1000; // 1 s durante riego activo
const NORMAL_POLLING_INTERVAL = 600_000; // 10 min normal
const SIMULATION_INCREMENT = 1.5; // % de humedad que sube cada tick en demo
const DROP_COUNT = 5;

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
  const [currentHumidity, setCurrentHumidity] = useState(30);
  const [targetHumidity, setTargetHumidity] = useState(80);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const humiditySimRef = useRef(30);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  /* --- carga planta --- */

  useEffect(() => {
    if (!params.plantId) return;
    (async () => {
      try {
        const data = await plantsAPI.getPlant(parseInt(params.plantId, 10));
        setPlant(data);
        setTargetHumidity(data.optimal_humidity_max ?? 80);
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

  /* --- polling / simulación --- */

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const fetchHumidity = useCallback(async () => {
    if (!plant) return;

    if (plant.sensor_id) {
      // Sensor real disponible
      try {
        const reading = await sensorsAPI.getLatestReading(plant.sensor_id.toString());
        setCurrentHumidity(reading.soil_moisture);
      } catch {
        // Si falla, simula
        humiditySimRef.current = Math.min(
          humiditySimRef.current + SIMULATION_INCREMENT,
          targetHumidity,
        );
        setCurrentHumidity(Math.round(humiditySimRef.current));
      }
    } else {
      // Sin sensor: simulación demo
      humiditySimRef.current = Math.min(
        humiditySimRef.current + SIMULATION_INCREMENT,
        targetHumidity,
      );
      setCurrentHumidity(Math.round(humiditySimRef.current));
    }
  }, [plant, targetHumidity]);

  const startWatering = useCallback(() => {
    humiditySimRef.current = currentHumidity;
    setIsWatering(true);
    setSessionStart(new Date());

    pollingRef.current = setInterval(() => {
      fetchHumidity();
    }, WATERING_POLLING_INTERVAL);
  }, [currentHumidity, fetchHumidity]);

  const stopWatering = useCallback(async () => {
    stopPolling();
    setIsWatering(false);

    if (plant && sessionStart) {
      const session: Omit<WateringSession, 'plantId'> = {
        startTime: sessionStart.toISOString(),
        endTime: new Date().toISOString(),
        humidityStart: 30,
        humidityEnd: currentHumidity,
        targetHumidity,
        isActive: false,
      };
      await wateringAPI.recordWatering(plant.id, session);
    }
  }, [plant, sessionStart, currentHumidity, targetHumidity, stopPolling]);

  /* --- detener automáticamente si llega al límite --- */

  useEffect(() => {
    if (isWatering && currentHumidity >= targetHumidity) {
      stopWatering();
    }
  }, [currentHumidity, targetHumidity, isWatering, stopWatering]);

  /* --- limpiar al desmontar --- */

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  /* --- helpers de texto --- */

  const reachedLimit = currentHumidity >= targetHumidity;
  const speechText = !isWatering && !reachedLimit
    ? 'Presiona para comenzar el riego'
    : isWatering
    ? '¡Qué rica agua! 💧'
    : '¡Deja de regarme! Ya estoy feliz 🌱';

  const progressPercent = Math.min((currentHumidity / targetHumidity) * 100, 100);

  const imageUri =
    plant?.character_image_url ||
    plant?.default_render_url ||
    plant?.original_photo_url ||
    undefined;

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
            <Text style={styles.headerTitle}>Riego en Tiempo Real</Text>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.body}>
        {/* Planta + gotas */}
        <View style={styles.plantArea}>
          {/* Gotas animadas solo si está regando */}
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
        <View style={styles.speechBubble}>
          <Text style={styles.speechText}>{speechText}</Text>
        </View>

        {/* Gauge de humedad */}
        <View style={styles.gaugeContainer}>
          <Text style={styles.gaugeLabel}>Humedad del suelo</Text>
          <View style={styles.gaugeTrack}>
            <LinearGradient
              colors={['#64B5F6', '#4CAF50']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.gaugeFill, { width: `${progressPercent}%` }]}
            />
          </View>
          <View style={styles.gaugeValues}>
            <Text style={styles.gaugeValueText}>{currentHumidity}%</Text>
            <Text style={styles.gaugeTargetText}>Meta: {targetHumidity}%</Text>
          </View>
        </View>

        {/* Botón principal */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[
              styles.waterButton,
              reachedLimit && styles.waterButtonDone,
              isWatering && styles.waterButtonActive,
            ]}
            onPress={isWatering ? stopWatering : reachedLimit ? () => router.back() : startWatering}
            activeOpacity={0.8}
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
        </Animated.View>

        {/* Info de sesión */}
        {(isWatering || reachedLimit) && sessionStart && (
          <Text style={styles.sessionInfo}>
            Inicio: {sessionStart.toLocaleTimeString()} | Humedad: {currentHumidity}%
          </Text>
        )}
      </View>
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
  speechText: {
    fontSize: Typography.sizes.base,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: Typography.weights.medium,
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
