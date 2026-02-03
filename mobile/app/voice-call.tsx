/**
 * Pantalla de llamada de voz con la planta (API Realtime de OpenAI).
 * UI amigable para niños: botón grande, estados claros y aviso si el audio no responde.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { aiAPI } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Gradients, Shadows } from '../constants/DesignSystem';

const REALTIME_WS_URL = 'wss://api.openai.com/v1/realtime?model=gpt-realtime';

type CallStatus = 'idle' | 'requesting_permission' | 'getting_token' | 'connecting' | 'ready' | 'in_call' | 'error';

interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function VoiceCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plantId?: string; plantName?: string; conversationId?: string }>();
  const plantId = params.plantId ? parseInt(params.plantId, 10) : undefined;
  const plantName = params.plantName || 'Planta';
  const conversationId = params.conversationId ? parseInt(params.conversationId, 10) : undefined;

  const [status, setStatus] = useState<CallStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlantSpeaking, setIsPlantSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const transcriptRef = useRef<TranscriptMessage[]>([]);
  const currentAssistantRef = useRef<string>('');
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      const { status: permStatus } = await Audio.requestPermissionsAsync();
      return permStatus === 'granted';
    } catch (e) {
      console.warn('expo-av permission request failed:', e);
      return false;
    }
  };

  const startCall = async () => {
    setErrorMessage(null);
    setStatus('requesting_permission');

    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      setStatus('error');
      setErrorMessage('Necesitamos permiso del micrófono para hablar con la planta.');
      return;
    }

    setStatus('getting_token');
    try {
      const { client_secret } = await aiAPI.getRealtimeToken(conversationId, plantId);
      setStatus('connecting');

      const protocols = ['realtime', `openai-insecure-api-key.${client_secret}`];
      const ws = new WebSocket(REALTIME_WS_URL, protocols);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            type: 'realtime',
            model: 'gpt-realtime',
            audio: {
              input: { format: 'm4a' },
              output: { voice: 'marin' },
            },
          },
        }));
        setStatus('ready');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const t = data.type;
          if (t === 'response.output_audio.delta' || t === 'response.output_audio.done') {
            setIsPlantSpeaking(t === 'response.output_audio.delta');
          }
          if (t === 'response.output_text.delta' && data.delta) {
            currentAssistantRef.current += data.delta;
          }
          if (t === 'response.done' || t === 'response.output_text.done') {
            if (currentAssistantRef.current.trim()) {
              transcriptRef.current.push({ role: 'assistant', content: currentAssistantRef.current.trim() });
              currentAssistantRef.current = '';
            }
          }
          if (t === 'conversation.item.input_audio_transcription.completed' && data.transcript) {
            transcriptRef.current.push({ role: 'user', content: data.transcript });
          }
        } catch (_) {}
      };

      ws.onerror = () => {
        setStatus('error');
        setErrorMessage('Error de conexión. Intenta de nuevo.');
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (status !== 'error' && transcriptRef.current.length > 0 && conversationId) {
          aiAPI.syncVoiceTranscript(conversationId, transcriptRef.current).catch(() => {});
        }
      };
    } catch (e: unknown) {
      setStatus('error');
      setErrorMessage(e instanceof Error ? e.message : 'No se pudo conectar. Intenta de nuevo.');
    }
  };

  const hangUp = () => {
    if (currentAssistantRef.current.trim()) {
      transcriptRef.current.push({ role: 'assistant', content: currentAssistantRef.current.trim() });
      currentAssistantRef.current = '';
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (transcriptRef.current.length > 0 && conversationId) {
      aiAPI.syncVoiceTranscript(conversationId, transcriptRef.current).catch(() => {});
    }
    router.back();
  };

  const startRecording = async () => {
    if (!wsRef.current) {
      setErrorMessage('Primero conecta la llamada antes de grabar.');
      return;
    }
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      setErrorMessage('Necesitamos permiso del micrófono para grabar tu voz.');
      return;
    }
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (e) {
      console.warn('Error iniciando grabación de audio', e);
      setErrorMessage('No pudimos iniciar la grabación. Intenta de nuevo.');
    }
  };

  const stopRecordingAndSend = async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
    } catch (e) {
      // ya detenida, ignorar
    }
    recordingRef.current = null;
    setIsRecording(false);

    const uri = rec.getURI();
    if (!uri || !wsRef.current) {
      return;
    }
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Enviar audio al modelo Realtime
      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64,
      }));
      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.commit',
      }));
      wsRef.current.send(JSON.stringify({
        type: 'response.create',
      }));

      setStatus('in_call');
    } catch (e) {
      console.warn('Error enviando audio a Realtime', e);
      setErrorMessage('No pudimos enviar tu audio. Intenta de nuevo.');
    }
  };

  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const statusLabel = {
    idle: '¡Conecta con tu planta por voz!',
    requesting_permission: 'Solicitando micrófono...',
    getting_token: 'Preparando la llamada...',
    connecting: 'Conectando...',
    ready: `Conectado con ${plantName}`,
    in_call: `${plantName} te está hablando`,
    error: 'Algo falló',
  }[status];

  const showCallButton = status === 'idle' || status === 'error';
  const showHangUpButton = ['ready', 'in_call', 'connecting', 'getting_token', 'requesting_permission'].includes(status);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <LinearGradient
        colors={Gradients.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, Shadows.md]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Llamada con {plantName}</Text>
          <Text style={styles.headerSubtitle}>Habla y escucha a tu planta</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={[styles.illustrationCard, Shadows.lg]}>
          <View style={styles.illustrationCircle}>
            <Ionicons name="leaf" size={56} color={Colors.primaryLight} />
            <View style={styles.phoneBadge}>
              <Ionicons name="call" size={24} color={Colors.white} />
            </View>
          </View>
        </View>

        <View style={[styles.statusCard, Shadows.md]}>
          {status === 'ready' || status === 'in_call' ? (
            <View style={styles.plantSpeakingRow}>
              <View style={[styles.micCircle, isPlantSpeaking && styles.micCircleActive]}>
                <Ionicons
                  name={isPlantSpeaking ? 'mic' : 'mic-outline'}
                  size={40}
                  color={isPlantSpeaking ? Colors.white : Colors.primary}
                />
              </View>
              <Text style={styles.statusText}>
                {isPlantSpeaking ? `${plantName} te está hablando...` : 'Habla cerca del micrófono'}
              </Text>
              <Text style={styles.hintText}>
                Si no escuchas respuesta por voz, usa el chat por texto en la pantalla anterior.
              </Text>
            </View>
          ) : (
            <>
              {(status === 'getting_token' || status === 'connecting' || status === 'requesting_permission') && (
                <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
              )}
              <Text style={styles.statusText}>{statusLabel}</Text>
              {status === 'idle' && (
                <Text style={styles.hintText}>
                  Toca el botón verde para conectar. La planta te escuchará y te responderá.
                </Text>
              )}
            </>
          )}
        </View>

        {errorMessage && (
          <View style={[styles.errorBox, Shadows.sm]}>
            <Ionicons name="warning" size={24} color={Colors.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.buttons}>
          {showCallButton && (
            <TouchableOpacity
              onPress={startCall}
              style={[styles.mainButton, Shadows.glow(Colors.primary)]}
              activeOpacity={0.8}
              disabled={status === 'getting_token' || status === 'connecting'}
            >
              <LinearGradient
                colors={Gradients.primary as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.mainButtonGradient}
              >
                <Ionicons name="call" size={44} color={Colors.white} />
                <Text style={styles.mainButtonLabel}>Llamar</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {showHangUpButton && (
            <TouchableOpacity
              onPress={hangUp}
              style={[styles.hangUpButton, Shadows.md]}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={44} color={Colors.white} />
              <Text style={styles.hangUpButtonLabel}>Colgar</Text>
            </TouchableOpacity>
          )}

          {status === 'ready' || status === 'in_call' ? (
            <TouchableOpacity
              onPress={isRecording ? stopRecordingAndSend : startRecording}
              style={styles.recordButton}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isRecording ? 'stop-circle' : 'mic'}
                size={24}
                color={isRecording ? Colors.white : Colors.primary}
              />
              <Text style={styles.recordButtonLabel}>
                {isRecording ? 'Detener y enviar' : 'Grabar mensaje'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    alignItems: 'center',
  },
  illustrationCard: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  illustrationCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary + '40',
    position: 'relative',
  },
  phoneBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.lg,
  },
  spinner: {
    marginBottom: Spacing.md,
  },
  statusText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  hintText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  plantSpeakingRow: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  micCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary + '25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micCircleActive: {
    backgroundColor: Colors.primary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '18',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.error,
  },
  buttons: {
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  mainButton: {
    width: 168,
    height: 168,
    borderRadius: 84,
    overflow: 'hidden',
  },
  mainButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  mainButtonLabel: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  hangUpButton: {
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  hangUpButtonLabel: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  recordButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  recordButtonLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
});
