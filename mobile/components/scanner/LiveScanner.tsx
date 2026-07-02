/**
 * Scanner en vivo: cámara + 4-step photo flow + pinch-to-zoom
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/DesignSystem';
import { useThemeColors, useThemeGradients } from '../../context/ThemeContext';
import { GrassFooter } from '../decorative';
import { ScannerOverlay } from './ScannerOverlay';
import { ScannerProgressBar } from './ScannerProgress';

const { width } = Dimensions.get('window');

type ScanStep = 'ready' | 'front' | 'side' | 'back' | 'top' | 'processing';

const STEP_ORDER: ScanStep[] = ['ready', 'front', 'side', 'back', 'top', 'processing'];

const STEP_INFO: Record<ScanStep, { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; progress: number }> = {
  ready: { title: 'Prepárate', subtitle: 'Coloca tu planta frente a la cámara', icon: 'camera-outline', progress: 0 },
  front: { title: 'Foto frontal', subtitle: 'Captura la parte delantera de tu planta', icon: 'arrow-forward-circle-outline', progress: 25 },
  side: { title: 'Foto lateral', subtitle: 'Ahora muestra un costado', icon: 'arrow-forward-outline', progress: 50 },
  back: { title: 'Foto trasera', subtitle: 'Gira y muestra la parte de atrás', icon: 'arrow-back-circle-outline', progress: 75 },
  top: { title: 'Foto superior', subtitle: 'Muestra la parte de arriba', icon: 'arrow-up-circle-outline', progress: 100 },
  processing: { title: 'Analizando...', subtitle: 'Identificando tu planta', icon: 'search-outline', progress: 100 },
};

const PHOTO_STEPS: ScanStep[] = ['front', 'side', 'back', 'top'];

interface LiveScannerProps {
  onComplete: (uri: string) => void;
  onCancel: () => void;
}

export function LiveScanner({ onComplete, onCancel }: LiveScannerProps) {
  const colors = useThemeColors();
  const gradients = useThemeGradients();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanStep, setScanStep] = useState<ScanStep>('ready');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // Zoom state
  const zoom = useSharedValue(0);
  const savedZoom = useSharedValue(0);
  const [zoomDisplay, setZoomDisplay] = useState(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newZoom = Math.min(Math.max(savedZoom.value + (event.scale - 1) * 0.5, 0), 1);
      zoom.value = newZoom;
      setZoomDisplay(newZoom);
    })
    .onEnd(() => {
      savedZoom.value = zoom.value;
    });

  const adjustZoom = (delta: number) => {
    const newZoom = Math.min(Math.max(zoom.value + delta, 0), 1);
    zoom.value = newZoom;
    savedZoom.value = newZoom;
    setZoomDisplay(newZoom);
  };

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (!photo?.uri) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (scanStep === 'ready' || scanStep === 'front') {
        setCapturedUri(photo.uri);
      }

      const currentIndex = STEP_ORDER.indexOf(scanStep);
      const nextStep = STEP_ORDER[currentIndex + 1];

      if (nextStep) {
        setScanStep(nextStep);

        if (nextStep === 'processing') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => {
            const uri = capturedUri || photo.uri;
            if (uri) onComplete(uri);
          }, 1200);
        }
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'No se pudo capturar la foto');
    }
  }, [scanStep, capturedUri, onComplete]);

  const handleStart = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permisos', 'Necesitamos acceso a la cámara');
        return;
      }
    }
    setScanStep('front');
  }, [permission, requestPermission]);

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
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Conceder permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentInfo = STEP_INFO[scanStep];
  const isPhotoStep = PHOTO_STEPS.includes(scanStep);
  const isProcessing = scanStep === 'processing';

  return (
    <View style={styles.container}>
      <GestureDetector gesture={pinchGesture}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          zoom={zoomDisplay}
        />
      </GestureDetector>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Ionicons name="close" size={28} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Escanear Planta</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Zoom controls */}
      {!isProcessing && (
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => adjustZoom(-0.1)}
          >
            <Ionicons name="remove" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.zoomText}>
            {(1 + zoomDisplay * 9).toFixed(1)}x
          </Text>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => adjustZoom(0.1)}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {scanStep === 'ready' ? (
        /* Ready state */
        <View style={styles.readyOverlay}>
          <View style={styles.guideFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.instruction}>Enfoca tu planta</Text>
          <TouchableOpacity activeOpacity={0.9} onPress={handleStart} style={styles.startBtnWrap}>
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
        /* Scanning / processing overlay */
        <View style={styles.scanningOverlay}>
          {/* Guide frame for photo steps */}
          {isPhotoStep && (
            <View style={styles.guideFrameCenter}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          )}

          {/* Progress section at bottom */}
          <View style={styles.progressContainer}>
            {/* Progress bar */}
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${currentInfo.progress}%` },
                ]}
              />
            </View>

            {/* Step dots */}
            <View style={styles.stepsRow}>
              {PHOTO_STEPS.map((step, index) => {
                const stepProgress = (index + 1) * 25;
                const completed = currentInfo.progress >= stepProgress;
                const isCurrent = step === scanStep;
                return (
                  <View key={step} style={styles.stepDotCol}>
                    <View
                      style={[
                        styles.dot,
                        completed && styles.dotCompleted,
                        isCurrent && styles.dotCurrent,
                      ]}
                    >
                      {completed && (
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      )}
                    </View>
                    <Text style={[styles.stepLabel, isCurrent && styles.stepLabelActive]}>
                      {step === 'front' ? 'Frente' :
                       step === 'side' ? 'Lado' :
                       step === 'back' ? 'Atrás' : 'Arriba'}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Current instruction */}
            <Animated.View
              key={scanStep}
              entering={FadeInDown.duration(300)}
              style={styles.instructionBlock}
            >
              <Text style={styles.instructionTitle}>{currentInfo.title}</Text>
              <Text style={styles.instructionSubtitle}>{currentInfo.subtitle}</Text>
            </Animated.View>

            {/* Capture button */}
            {isPhotoStep && (
              <TouchableOpacity
                style={styles.captureButton}
                onPress={capturePhoto}
                activeOpacity={0.8}
              >
                <View style={styles.captureButtonInner}>
                  <Ionicons name="camera" size={32} color="#fff" />
                </View>
              </TouchableOpacity>
            )}

            {isProcessing && (
              <View style={styles.processingIndicator}>
                <Ionicons name="search" size={32} color={colors.primary} />
              </View>
            )}
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
  permButton: {
    backgroundColor: colors.primary,
    padding: Spacing.md,
    borderRadius: 12,
  },
  permButtonText: {
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    color: colors.white,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  /* Zoom */
  zoomControls: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
  },
  zoomButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 6,
    minWidth: 36,
    textAlign: 'center',
  },
  /* Ready state */
  readyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: width - 48,
    height: (width - 48) * 0.75,
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  guideFrameCenter: {
    position: 'absolute',
    top: '25%',
    alignSelf: 'center',
    width: width - 80,
    height: (width - 80) * 0.65,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.scanner || '#4CAF50',
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
  /* Scanning overlay */
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Spacing.lg,
  },
  stepDotCol: {
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dotCompleted: {
    backgroundColor: '#4CAF50',
  },
  dotCurrent: {
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(76, 175, 80, 0.5)',
  },
  stepLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#fff',
    fontWeight: '700',
  },
  instructionBlock: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  instructionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  instructionSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingIndicator: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
