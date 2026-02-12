/**
 * Scanner en vivo: cámara + animación + detección de movimiento
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/DesignSystem';
import { useThemeColors, useThemeGradients } from '../../context/ThemeContext';
import { GrassFooter } from '../decorative';
import { ScannerOverlay } from './ScannerOverlay';
import { ScannerProgressBar } from './ScannerProgress';
import { useMotionDetection } from '../../utils/motionDetection';
import { preloadSounds, startBeepLoop, stopBeepLoop, playComplete } from '../../utils/soundManager';

const { width } = Dimensions.get('window');
const SCAN_DURATION_MS = 4000; // ~4 segundos con movimiento
const PROGRESS_PER_MOTION = 0.15; // incremento por unidad de intensity

interface LiveScannerProps {
  onComplete: (uri: string) => void;
  onCancel: () => void;
}

export function LiveScanner({ onComplete, onCancel }: LiveScannerProps) {
  const colors = useThemeColors();
  const gradients = useThemeGradients();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<'ready' | 'scanning'>('ready');
  const [progress, setProgress] = useState(0);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const capturedUriRef = useRef<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const lastUpdate = useRef(Date.now());
  const progressRef = useRef(0);

  const { intensity, isMoving } = useMotionDetection(phase === 'scanning');

  const handleComplete = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    stopBeepLoop();
    await playComplete();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const uri = capturedUriRef.current;
    if (uri) onComplete(uri);
  }, [onComplete]);

  useEffect(() => {
    preloadSounds();
    return () => {
      stopBeepLoop();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'scanning') return;

    lastUpdate.current = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastUpdate.current;
      lastUpdate.current = now;

      const motionIncrement = intensity * PROGRESS_PER_MOTION * (delta / 100);
      const timeIncrement = (delta / SCAN_DURATION_MS) * 20;
      const increment = Math.max(motionIncrement, timeIncrement * 0.3);
      progressRef.current = Math.min(100, progressRef.current + increment);
      setProgress(progressRef.current);

      if (progressRef.current >= 100) {
        clearInterval(interval);
        handleComplete();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [phase, intensity, handleComplete]);

  const handleStartScan = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permisos', 'Necesitamos acceso a la cámara');
        return;
      }
    }

    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        capturedUriRef.current = photo.uri;
        setCapturedUri(photo.uri);
        setPhase('scanning');
        startBeepLoop();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const completedRef = useRef(false);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Solicitando permisos...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Se necesita permiso de cámara</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Conceder permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Ionicons name="close" size={28} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Escanear Planta</Text>
      </View>

      {phase === 'ready' ? (
        <View style={styles.readyOverlay}>
          <View style={styles.guideFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.instruction}>Enfoca tu planta</Text>
          <TouchableOpacity activeOpacity={0.9} onPress={handleStartScan} style={styles.startBtnWrap}>
            <LinearGradient
              colors={gradients.scanner as unknown as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startBtn}
            >
              <Ionicons name="scan" size={28} color={colors.white} />
              <Text style={styles.startBtnText}>Iniciar escaneo</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.scanningOverlay}>
          <ScannerOverlay scanning progress={progress} />
          <View style={styles.progressWrap}>
            <ScannerProgressBar progress={progress} height={10} />
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            <Text style={styles.hint}>
              {isMoving ? 'Escaneando... mueve el teléfono' : '¡Sigue moviendo el teléfono!'}
            </Text>
          </View>
        </View>
      )}

      <GrassFooter />
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    color: colors.text,
    marginBottom: Spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    padding: Spacing.md,
    borderRadius: 12,
  },
  buttonText: {
    color: colors.white,
    fontWeight: Typography.weights.bold,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    zIndex: 10,
  },
  cancelBtn: {
    padding: Spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.white,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  readyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: width - 48,
    height: (width - 48) * 0.75,
    borderWidth: 0,
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.scanner,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  instruction: {
    color: colors.white,
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.xl,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  startBtnWrap: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  startBtnText: {
    color: colors.white,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  progressWrap: {
    position: 'absolute',
    bottom: 60,
    left: Spacing.lg,
    right: Spacing.lg,
  },
  progressText: {
    color: colors.white,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  hint: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
