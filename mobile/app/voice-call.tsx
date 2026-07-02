/**
 * Pantalla de llamada de voz estilo iPhone
 * LLAMADA REAL - VAD simulado (detección de silencio)
 * Sin push-to-talk: habla y se envía automáticamente
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { aiAPI, plantsAPI } from '../services/api';
import { Typography, Spacing } from '../constants/DesignSystem';
import { useThemeColors } from '../context/ThemeContext';
import { Model3DViewer } from '../components/Model3DViewer';

const { width, height } = Dimensions.get('window');

const REALTIME_WS_URL = 'wss://api.openai.com/v1/realtime?model=gpt-realtime';
const SILENCE_THRESHOLD = -20; // dB - Aún menos sensible - solo detecta voz clara
const SILENCE_DURATION_TO_SEND = 3000; // 3 segundos de silencio antes de enviar
const MIN_VOICE_DURATION = 300; // ms - Mínimo de sonido continuo para considerar "voz"
const VOICE_CONFIRM_THRESHOLD = 3; // Número de lecturas consecutivas con sonido

/** Quita cabecera WAV (44 bytes) y devuelve solo PCM en base64 para la API. */
function stripWavHeaderAndGetBase64Pcm(base64Wav: string): string | null {
  try {
    const binary = atob(base64Wav);
    const headerBytes = 44;
    if (binary.length <= headerBytes) return null;
    const pcmBinary = binary.slice(headerBytes);
    return btoa(pcmBinary);
  } catch {
    return null;
  }
}

/** Crear header WAV para PCM 24kHz mono 16bit. dataLength = bytes de PCM. */
function createWavHeader(dataLength: number): string {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataLength, true);
  view.setUint32(8, 0x57415645, false);  // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataLength, true);

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** Crear header WAV en bytes (para concatenar con PCM). */
function createWavHeaderBytes(dataLength: number): Uint8Array {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataLength, true);
  view.setUint32(8, 0x57415645, false);  // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataLength, true);

  return new Uint8Array(buffer);
}

type CallStatus =
  | 'idle' | 'connecting' | 'ringing' | 'connected' | 'listening'
  | 'processing' | 'speaking' | 'ended' | 'error';

export default function VoiceCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    plantId?: string;
    plantName?: string;
    conversationId?: string;
    model3dUrl?: string;
    characterMood?: string;
  }>();
  const plantId = params.plantId ? parseInt(params.plantId, 10) : undefined;
  const plantName = params.plantName || 'Planta';
  const conversationId = params.conversationId ? parseInt(params.conversationId, 10) : undefined;

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [status, setStatus] = useState<CallStatus>('idle');
  const [plantImage, setPlantImage] = useState<string | null>(null);
  const [plantModel3D, setPlantModel3D] = useState<string | null>(null);
  const [plantMood, setPlantMood] = useState<string>('happy');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const pulseScale = useSharedValue(1);
  const waveScale1 = useSharedValue(1);
  const waveScale2 = useSharedValue(1);
  const waveScale3 = useSharedValue(1);
  const micPulse = useSharedValue(1);

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isListeningRef = useRef(false);
  const lastSoundTimeRef = useRef<number>(Date.now());
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const consecutiveSoundCountRef = useRef(0);
  const hasDetectedVoiceRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    const url = params.model3dUrl;
    const mood = params.characterMood;
    if (url) setPlantModel3D(url);
    if (mood) setPlantMood(mood);
    if (plantId) {
      plantsAPI.getPlant(plantId).then((plant) => {
        setPlantImage(
          plant.character_image_url ||
            plant.default_render_url ||
            (plant as any).original_photo_url ||
            null
        );
        if (!url && plant.model_3d_url) setPlantModel3D(plant.model_3d_url);
        if (!mood && plant.character_mood) setPlantMood(plant.character_mood);
      }).catch((err) => console.error('Error loading plant:', err));
    }
  }, [plantId, params.model3dUrl, params.characterMood]);

  useEffect(() => {
    if (status === 'listening') {
      waveScale1.value = withRepeat(withSequence(withTiming(1.3, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1, false);
      waveScale2.value = withRepeat(withSequence(withTiming(1.5, { duration: 1200 }), withTiming(1, { duration: 1200 })), -1, false);
      waveScale3.value = withRepeat(withSequence(withTiming(1.7, { duration: 1400 }), withTiming(1, { duration: 1400 })), -1, false);
      micPulse.value = withRepeat(withSequence(withSpring(1.1 + audioLevel * 0.3), withSpring(1)), -1, true);
    } else if (status === 'speaking') {
      pulseScale.value = withRepeat(withSequence(withTiming(1.1, { duration: 400, easing: Easing.inOut(Easing.ease) }), withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) })), -1, true);
    } else if (status === 'connected') {
      pulseScale.value = withRepeat(withSequence(withTiming(1.05, { duration: 2000 }), withTiming(1, { duration: 2000 })), -1, true);
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(waveScale1);
      cancelAnimation(waveScale2);
      cancelAnimation(waveScale3);
      cancelAnimation(micPulse);
      pulseScale.value = withTiming(1);
      waveScale1.value = withTiming(1);
      waveScale2.value = withTiming(1);
      waveScale3.value = withTiming(1);
      micPulse.value = withTiming(1);
    }
  }, [status, audioLevel]);

  useEffect(() => {
    if (['connected', 'listening', 'speaking', 'processing'].includes(status)) {
      timerRef.current = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle': return 'Toca para llamar';
      case 'connecting': return 'Conectando...';
      case 'ringing': return 'Llamando...';
      case 'connected': return formatDuration(callDuration);
      case 'listening': return 'Te escucho...';
      case 'processing': return 'Pensando...';
      case 'speaking': return 'Hablando...';
      case 'ended': return 'Llamada finalizada';
      case 'error': return 'Error de conexión';
      default: return '';
    }
  };

  const getStatusIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'listening': return 'mic';
      case 'processing': return 'hourglass-outline';
      case 'speaking': return 'leaf';
      default: return 'call';
    }
  };

  const stopListening = useCallback(async () => {
    if (!isListeningRef.current) return;
    isListeningRef.current = false;
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch (e) {}
      recordingRef.current = null;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (isListeningRef.current || isMuted || isSpeakingRef.current) return;
    isListeningRef.current = true;
    lastSoundTimeRef.current = Date.now(); // Empezar a contar desde ahora
    consecutiveSoundCountRef.current = 0;
    hasDetectedVoiceRef.current = false;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: !isSpeakerOn,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 24000,
          numberOfChannels: 1,
          bitRate: 384000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 24000,
          numberOfChannels: 1,
          bitRate: 384000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      });

      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.metering !== undefined) {
          const level = Math.max(0, (status.metering + 60) / 60);
          setAudioLevel(level);

          // Debug: ver el nivel de audio real
          // console.log(`[MIC] Metering: ${status.metering?.toFixed(1)} dB, Level: ${level.toFixed(2)}`);

          if (status.metering > SILENCE_THRESHOLD) {
            // HAY SONIDO - actualizar timestamp y contador
            consecutiveSoundCountRef.current++;
            lastSoundTimeRef.current = Date.now(); // SIEMPRE actualizar cuando hay sonido

            if (consecutiveSoundCountRef.current >= VOICE_CONFIRM_THRESHOLD) {
              hasDetectedVoiceRef.current = true;
            }
          } else {
            // SILENCIO - resetear contador de sonido consecutivo
            consecutiveSoundCountRef.current = 0;
            // NO resetear lastSoundTimeRef aquí - queremos medir cuánto tiempo de silencio
          }
        }
      });

      await recording.startAsync();
      recordingRef.current = recording;

      recordingIntervalRef.current = setInterval(async () => {
        if (!isListeningRef.current || !recordingRef.current) return;

        const timeSinceLastSound = Date.now() - lastSoundTimeRef.current;

        // Debug: ver el estado actual
        console.log(`[TIMER] Silencio: ${(timeSinceLastSound / 1000).toFixed(1)}s | Voz detectada: ${hasDetectedVoiceRef.current} | Threshold: ${SILENCE_DURATION_TO_SEND / 1000}s`);

        // Si hay silencio suficiente Y se detectó voz antes, enviar
        if (timeSinceLastSound > SILENCE_DURATION_TO_SEND && hasDetectedVoiceRef.current) {
          console.log('[SEND] Enviando audio...');
          hasDetectedVoiceRef.current = false;
          consecutiveSoundCountRef.current = 0;
          await sendAudioToOpenAI();
        }
      }, 500);
    } catch (error) {
      console.error('Error starting listening:', error);
      isListeningRef.current = false;
    }
  }, [isMuted, isSpeakerOn]);

  const sendAudioToOpenAI = useCallback(async () => {
    if (!recordingRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        const base64Wav = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        const base64Pcm = stripWavHeaderAndGetBase64Pcm(base64Wav);

        if (base64Pcm && base64Pcm.length > 5000) { // Mínimo ~100ms de audio real
          setStatus('processing');
          wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: base64Pcm }));
          wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
          wsRef.current.send(JSON.stringify({ type: 'response.create' }));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (!isSpeakingRef.current && !isMuted) {
          startListening();
        }
      }
    } catch (error) {
      console.error('Error sending audio:', error);
      if (!isSpeakingRef.current && !isMuted) startListening();
    }
  }, [isMuted, startListening]);

  const playAllAudioTogether = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

    isPlayingRef.current = true;
    setStatus('speaking');
    isSpeakingRef.current = true;

    try {
      const chunks = audioQueueRef.current;
      audioQueueRef.current = [];

      let fullPcmBinary = '';
      for (const b64 of chunks) {
        fullPcmBinary += atob(b64);
      }
      const dataLength = fullPcmBinary.length;
      const wavHeader = createWavHeaderBytes(dataLength);

      const audioBytes = new Uint8Array(dataLength);
      for (let i = 0; i < dataLength; i++) {
        audioBytes[i] = fullPcmBinary.charCodeAt(i);
      }
      const fullAudio = new Uint8Array(wavHeader.length + audioBytes.length);
      fullAudio.set(wavHeader, 0);
      fullAudio.set(audioBytes, wavHeader.length);

      let binary = '';
      for (let i = 0; i < fullAudio.length; i++) {
        binary += String.fromCharCode(fullAudio[i]);
      }
      const fullAudioBase64 = btoa(binary);

      const fileUri = FileSystem.cacheDirectory + `full_audio_${Date.now()}.wav`;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: !isSpeakerOn,
      });

      await FileSystem.writeAsStringAsync(fileUri, fullAudioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true, volume: 1.0 }
      );
      soundRef.current = sound;

      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.isLoaded && s.didJustFinish) resolve();
        });
      });

      await sound.unloadAsync();
      try { await FileSystem.deleteAsync(fileUri, { idempotent: true }); } catch (e) {}
    } catch (error) {
      console.error('Error playing full audio:', error);
    }

    isPlayingRef.current = false;
    isSpeakingRef.current = false;
    soundRef.current = null;

    if (wsRef.current?.readyState === WebSocket.OPEN && !isMuted) {
      setStatus('listening');
      startListening();
    } else {
      setStatus('connected');
    }
  }, [isMuted, isSpeakerOn, startListening]);

  const handleRealtimeEvent = useCallback((data: any) => {
    const eventType = data.type;

    switch (eventType) {
      case 'session.created':
      case 'session.updated':
        break;
      case 'input_audio_buffer.speech_started':
        lastSoundTimeRef.current = Date.now();
        break;
      case 'input_audio_buffer.committed':
        setStatus('processing');
        break;
      case 'response.created':
        stopListening();
        break;
      case 'response.audio.delta':
      case 'response.output_audio.delta':
        if (data.delta) {
          audioQueueRef.current.push(data.delta);
          setStatus('speaking');
        }
        break;
      case 'response.audio.done':
      case 'response.output_audio.done':
        if (audioQueueRef.current.length > 0 && !isPlayingRef.current) {
          playAllAudioTogether();
        }
        break;
      case 'response.done':
        break;
      case 'error':
        const code = data.error?.code;
        const msg = data.error?.message || 'Error';
        if (code === 'conversation_already_has_active_response') return;
        setErrorMessage(msg);
        break;
    }
  }, [playAllAudioTogether, stopListening]);

  const startCall = async () => {
    setErrorMessage(null);
    setStatus('connecting');
    setCallDuration(0);
    audioQueueRef.current = [];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { status: permStatus } = await Audio.requestPermissionsAsync();
      if (permStatus !== 'granted') throw new Error('Permiso de micrófono denegado');

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: !isSpeakerOn,
      });

      const { client_secret } = await aiAPI.getRealtimeToken(conversationId, plantId);
      setStatus('ringing');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await new Promise((r) => setTimeout(r, 1500));

      const ws = new WebSocket(REALTIME_WS_URL, ['realtime', `openai-insecure-api-key.${client_secret}`]);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            type: 'realtime',
            model: 'gpt-realtime',
            instructions: `Eres ${plantName}, una planta que puede hablar.

PERSONALIDAD: Amigable, cariñoso/a, un poco gracioso/a. Hablas en primera persona como si fueras la planta.

REGLAS: Responde SIEMPRE en español. Mantén respuestas CORTAS (1-2 oraciones). Habla de forma natural. Si te preguntan cómo estás, habla de tu estado como planta.`,
            output_modalities: ['audio'],
            audio: {
              input: {
                format: { type: 'audio/pcm', rate: 24000 },
                transcription: { model: 'whisper-1' },
                turn_detection: {
                  type: 'server_vad',
                  threshold: 0.5,
                  silence_duration_ms: 1000,
                  prefix_padding_ms: 300,
                },
              },
              output: {
                format: { type: 'audio/pcm', rate: 24000 },
                voice: 'shimmer',
              },
            },
          },
        }));

        setStatus('connected');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        setTimeout(() => {
          if (!isMuted) {
            setStatus('listening');
            startListening();
          }
        }, 500);
      };

      ws.onmessage = (event) => {
        try {
          handleRealtimeEvent(JSON.parse(event.data));
        } catch (e) {
          console.warn('Error parsing message:', e);
        }
      };

      ws.onerror = () => {
        setStatus('error');
        setErrorMessage('Error de conexión');
      };

      ws.onclose = () => {
        wsRef.current = null;
        stopListening();
        if (status !== 'ended') setStatus('ended');
      };
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'No se pudo conectar');
    }
  };

  const hangUp = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    stopListening();
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setStatus('ended');
    setTimeout(() => router.back(), 500);
  }, [stopListening, router]);

  const toggleMute = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (newMuted) {
      await stopListening();
      setStatus('connected');
    } else {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !isSpeakingRef.current) {
        setStatus('listening');
        await startListening();
      }
    }
  }, [isMuted, stopListening, startListening]);

  const toggleSpeaker = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(newSpeakerState);

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: !isSpeakingRef.current,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: !newSpeakerState,
      });

      if (soundRef.current) {
        await soundRef.current.setVolumeAsync(1.0);
      }
    } catch (error) {
      console.error('Error cambiando altavoz:', error);
    }
  }, [isSpeakerOn]);

  const toggleVideoMode = useCallback(() => {
    if (!plantModel3D) {
      setErrorMessage('Sin modelo 3D');
      setTimeout(() => setErrorMessage(null), 2000);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsVideoMode(!isVideoMode);
  }, [plantModel3D, isVideoMode]);

  useEffect(() => {
    return () => {
      stopListening();
      if (soundRef.current) soundRef.current.unloadAsync().catch(() => {});
      if (wsRef.current) wsRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stopListening]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' && status !== 'idle' && status !== 'ended') {
        console.log('App in background, call continues...');
      }
    });
    return () => sub.remove();
  }, [status]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));
  const wave1Style = useAnimatedStyle(() => ({ transform: [{ scale: waveScale1.value }], opacity: 2 - waveScale1.value }));
  const wave2Style = useAnimatedStyle(() => ({ transform: [{ scale: waveScale2.value }], opacity: 2 - waveScale2.value }));
  const wave3Style = useAnimatedStyle(() => ({ transform: [{ scale: waveScale3.value }], opacity: 2 - waveScale3.value }));
  const micStyle = useAnimatedStyle(() => ({ transform: [{ scale: micPulse.value }] }));

  const isConnected = ['connected', 'listening', 'speaking', 'processing'].includes(status);
  const isLoading = ['connecting', 'ringing'].includes(status);

  return (
    <View style={styles.container}>
      {plantImage && !isVideoMode ? (
        <>
          <Image source={{ uri: plantImage }} style={styles.backgroundImage} blurRadius={Platform.OS === 'ios' ? 30 : 15} />
          <View style={styles.backgroundOverlay} />
        </>
      ) : !isVideoMode ? (
        <View style={[styles.backgroundFallback, { backgroundColor: colors.background }]} />
      ) : null}

      {isVideoMode && (
        <View style={[styles.videoModeContainer, { backgroundColor: colors.background }]}>
          <View style={styles.model3DContainer}>
            {plantModel3D ? (
              <Model3DViewer
                modelUrl={plantModel3D}
                style={styles.model3DViewer}
                autoRotate={status === 'speaking'}
                characterMood={status === 'speaking' ? 'talking' : plantMood}
              />
            ) : (
              <View style={styles.noModelContainer}>
                <Ionicons name="leaf" size={80} color={colors.primary} />
                <Text style={[styles.noModelText, { color: colors.textMuted }]}>Sin modelo 3D</Text>
              </View>
            )}
          </View>
          <View style={styles.videoOverlay}>
            <View style={styles.videoTopInfo}>
              <Text style={[styles.videoPlantName, { color: colors.text }]}>{plantName}</Text>
              <View style={styles.statusRow}>
                {(status === 'listening' || status === 'processing' || status === 'speaking') && (
                  <Ionicons name={getStatusIcon()} size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                )}
                <Text style={[styles.videoStatus, { color: colors.textSecondary }]}>{getStatusText()}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      <SafeAreaView style={styles.content} edges={['top', 'bottom']}>
        {!isVideoMode && (
          <View style={styles.topSection}>
            <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
            <Text style={styles.plantName}>{plantName}</Text>
            <View style={styles.statusRow}>
              {(status === 'listening' || status === 'processing' || status === 'speaking') && (
                <Ionicons name={getStatusIcon()} size={16} color="rgba(255, 255, 255, 0.7)" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>
          </View>
        )}

        {!isVideoMode && (
          <View style={styles.centerSection}>
            {status === 'listening' && (
              <>
                <Animated.View style={[styles.wave, wave3Style]} />
                <Animated.View style={[styles.wave, wave2Style]} />
                <Animated.View style={[styles.wave, wave1Style]} />
              </>
            )}
            <Animated.View style={[styles.avatarContainer, pulseStyle]}>
              {plantImage ? (
                <Image source={{ uri: plantImage }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Ionicons name="leaf" size={60} color="#fff" />
                </View>
              )}
            </Animated.View>
            {status === 'listening' && (
              <Animated.View style={[styles.micIndicator, micStyle]}>
                <Ionicons name="mic" size={24} color="#4CAF50" />
              </Animated.View>
            )}
          </View>
        )}

        {isVideoMode && <View style={{ flex: 1 }} />}

        <View style={styles.bottomSection}>
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {isConnected && (
            <View style={styles.controlsRow}>
              <TouchableOpacity style={[styles.controlButton, isMuted && styles.controlButtonActive]} onPress={toggleMute}>
                <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={28} color={isMuted ? '#EF5350' : '#fff'} />
                <Text style={styles.controlLabel}>{isMuted ? 'Silenciado' : 'Mute'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlButton, isVideoMode && styles.controlButtonActive]} onPress={toggleVideoMode}>
                <Ionicons name="videocam-outline" size={28} color={plantModel3D ? '#fff' : '#666'} />
                <Text style={[styles.controlLabel, !plantModel3D && { color: '#666' }]}>Video</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]} onPress={toggleSpeaker}>
                <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-low'} size={28} color={isSpeakerOn ? '#4CAF50' : '#fff'} />
                <Text style={styles.controlLabel}>{isSpeakerOn ? 'Altavoz' : 'Auricular'}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.mainControlsRow}>
            {isConnected ? (
              <>
                <TouchableOpacity style={styles.secondaryButton} disabled>
                  <Ionicons name="ellipsis-horizontal" size={28} color="#fff" />
                  <Text style={styles.controlLabel}>Más</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.hangUpButton} onPress={hangUp}>
                  <Ionicons name="call" size={36} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} disabled>
                  <Ionicons name="keypad" size={28} color="#fff" />
                  <Text style={styles.controlLabel}>Teclado</Text>
                </TouchableOpacity>
              </>
            ) : status === 'idle' || status === 'error' ? (
              <TouchableOpacity style={styles.callButton} onPress={startCall} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" size="large" /> : <Ionicons name="call" size={40} color="#fff" />}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.hangUpButton} onPress={hangUp}>
                <Ionicons name="call" size={36} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
            )}
          </View>

          {isConnected && (
            <View style={styles.statusHintRow}>
              {status === 'listening' && !isMuted ? (
                <>
                  <Ionicons name="mic" size={16} color="rgba(255, 255, 255, 0.6)" style={{ marginRight: 8 }} />
                  <Text style={styles.statusHint}>Habla naturalmente, te estoy escuchando...</Text>
                </>
              ) : status === 'speaking' ? (
                <>
                  <Ionicons name="leaf" size={16} color="rgba(255, 255, 255, 0.6)" style={{ marginRight: 8 }} />
                  <Text style={styles.statusHint}>Escucha mi respuesta...</Text>
                </>
              ) : status === 'processing' ? (
                <>
                  <Ionicons name="hourglass-outline" size={16} color="rgba(255, 255, 255, 0.6)" style={{ marginRight: 8 }} />
                  <Text style={styles.statusHint}>Déjame pensar...</Text>
                </>
              ) : isMuted ? (
                <>
                  <Ionicons name="mic-off" size={16} color="rgba(255, 255, 255, 0.6)" style={{ marginRight: 8 }} />
                  <Text style={styles.statusHint}>Micrófono silenciado</Text>
                </>
              ) : (
                <>
                  <Ionicons name="call" size={16} color="rgba(255, 255, 255, 0.6)" style={{ marginRight: 8 }} />
                  <Text style={styles.statusHint}>Llamada en curso</Text>
                </>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    backgroundImage: { ...StyleSheet.absoluteFillObject, width, height },
    backgroundOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    backgroundFallback: { ...StyleSheet.absoluteFillObject },
    content: { flex: 1, justifyContent: 'space-between' },
    topSection: { alignItems: 'center', paddingTop: Spacing.xl },
    duration: { fontSize: Typography.sizes.sm, color: 'rgba(255, 255, 255, 0.8)', marginBottom: Spacing.xs },
    plantName: { fontSize: 32, fontWeight: '300', color: '#fff', marginBottom: Spacing.xs },
    statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    statusText: { fontSize: Typography.sizes.base, color: 'rgba(255, 255, 255, 0.7)' },
    centerSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    wave: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: 100,
      borderWidth: 2,
      borderColor: 'rgba(76, 175, 80, 0.5)',
    },
    avatarContainer: {
      width: 160,
      height: 160,
      borderRadius: 80,
      overflow: 'hidden',
      borderWidth: 4,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    micIndicator: {
      position: 'absolute',
      bottom: '25%',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#4CAF50',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
    },
    videoModeContainer: { ...StyleSheet.absoluteFillObject },
    model3DContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    model3DViewer: { width, height: height * 0.6 },
    noModelContainer: { justifyContent: 'center', alignItems: 'center' },
    noModelText: { marginTop: Spacing.md, fontSize: Typography.sizes.base },
    videoOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-start', pointerEvents: 'none' },
    videoTopInfo: { alignItems: 'center', paddingTop: 60 },
    videoPlantName: { fontSize: 28, fontWeight: '300' },
    videoStatus: { fontSize: Typography.sizes.sm, marginTop: Spacing.xs },
    bottomSection: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
    errorContainer: { backgroundColor: 'rgba(239, 83, 80, 0.2)', padding: Spacing.md, borderRadius: 12, marginBottom: Spacing.md },
    errorText: { color: '#EF5350', textAlign: 'center', fontSize: Typography.sizes.sm },
    controlsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.lg },
    controlButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center' },
    controlButtonActive: { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
    controlLabel: { color: '#fff', fontSize: 9, marginTop: 4, textAlign: 'center' },
    mainControlsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.xl, marginBottom: Spacing.md },
    secondaryButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center' },
    callButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
    hangUpButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EF5350', justifyContent: 'center', alignItems: 'center', shadowColor: '#EF5350', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
    statusHintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
    statusHint: { color: 'rgba(255, 255, 255, 0.6)', fontSize: Typography.sizes.sm },
  });
}
