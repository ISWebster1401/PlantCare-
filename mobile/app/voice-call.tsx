/**
 * Pantalla de llamada de voz con la planta (API Realtime de OpenAI).
 * 
 * NOTA: La reproducción de audio de respuesta requiere decodificar PCM16.
 * Por ahora mostramos transcripciones y un indicador visual.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { aiAPI } from '../services/api';
import { Colors, Typography, Spacing, BorderRadius, Gradients, Shadows } from '../constants/DesignSystem';

const REALTIME_WS_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';

type CallStatus = 'idle' | 'requesting_permission' | 'getting_token' | 'connecting' | 'ready' | 'recording' | 'processing' | 'speaking' | 'error';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function VoiceCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plantId?: string; plantName?: string; conversationId?: string }>();
  const plantId = params.plantId ? parseInt(params.plantId, 10) : undefined;
  const plantName = params.plantName || 'Planta';
  const conversationId = params.conversationId ? parseInt(params.conversationId, 10) : undefined;

  const [status, setStatus] = useState<CallStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const messagesRef = useRef<Message[]>([]);

  // Sincronizar mensajes con ref para el cleanup
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      const { status: permStatus } = await Audio.requestPermissionsAsync();
      return permStatus === 'granted';
    } catch (e) {
      console.warn('Error solicitando permiso de micrófono:', e);
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

      // Conectar al WebSocket de OpenAI Realtime
      const ws = new WebSocket(REALTIME_WS_URL, [
        'realtime',
        `openai-insecure-api-key.${client_secret}`,
      ]);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket conectado');
        // Configurar la sesión para habilitar transcripción
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            input_audio_transcription: {
              model: 'whisper-1',
            },
          },
        }));
        setStatus('ready');
        // Mensaje de bienvenida
        setMessages([{
          role: 'assistant',
          content: `¡Hola! Soy ${plantName}. Mantén presionado el botón del micrófono para hablarme.`,
          timestamp: new Date(),
        }]);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealtimeEvent(data);
        } catch (e) {
          console.warn('Error parseando mensaje WS:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('❌ WebSocket error:', e);
        setStatus('error');
        setErrorMessage('Error de conexión. Intenta de nuevo.');
      };

      ws.onclose = (e) => {
        console.log('WebSocket cerrado:', e.code, e.reason);
        wsRef.current = null;
        // Sincronizar transcripciones al backend
        if (messagesRef.current.length > 0 && conversationId) {
          const toSync = messagesRef.current.map(m => ({ role: m.role, content: m.content }));
          aiAPI.syncVoiceTranscript(conversationId, toSync).catch(() => {});
        }
      };
    } catch (e: unknown) {
      console.error('Error iniciando llamada:', e);
      setStatus('error');
      setErrorMessage(e instanceof Error ? e.message : 'No se pudo conectar. Intenta de nuevo.');
    }
  };

  const handleRealtimeEvent = (data: any) => {
    const eventType = data.type;

    // Transcripción del usuario completada
    if (eventType === 'conversation.item.input_audio_transcription.completed') {
      const transcript = data.transcript?.trim();
      if (transcript) {
        setMessages(prev => [...prev, {
          role: 'user',
          content: transcript,
          timestamp: new Date(),
        }]);
      }
      setCurrentTranscript('');
    }

    // Respuesta de texto (delta)
    if (eventType === 'response.audio_transcript.delta') {
      setCurrentTranscript(prev => prev + (data.delta || ''));
      setStatus('speaking');
    }

    // Respuesta completada
    if (eventType === 'response.audio_transcript.done') {
      const fullText = data.transcript?.trim() || currentTranscript.trim();
      if (fullText) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: fullText,
          timestamp: new Date(),
        }]);
      }
      setCurrentTranscript('');
      setStatus('ready');
    }

    // Audio de salida (la planta está hablando)
    if (eventType === 'response.audio.delta') {
      setStatus('speaking');
    }

    if (eventType === 'response.audio.done') {
      setStatus('ready');
    }

    // Error de la API
    if (eventType === 'error') {
      console.error('Error de Realtime API:', data.error);
      setErrorMessage(data.error?.message || 'Error en la conversación');
    }
  };

  const startRecording = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setErrorMessage('Primero conecta la llamada.');
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const recording = new Audio.Recording();
      // Usar formato que podamos convertir o enviar
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

      await recording.startAsync();
      recordingRef.current = recording;
      setStatus('recording');
      setErrorMessage(null);
    } catch (e) {
      console.error('Error iniciando grabación:', e);
      setErrorMessage('No pudimos iniciar la grabación.');
    }
  };

  const stopRecordingAndSend = async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
    } catch (e) {
      // Ya detenida
    }
    recordingRef.current = null;
    setStatus('processing');

    const uri = recording.getURI();
    if (!uri || !wsRef.current) {
      setStatus('ready');
      return;
    }

    try {
      // Leer el archivo como base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Enviar audio al modelo
      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64Audio,
      }));

      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.commit',
      }));

      wsRef.current.send(JSON.stringify({
        type: 'response.create',
      }));

    } catch (e) {
      console.error('Error enviando audio:', e);
      setErrorMessage('No pudimos enviar tu mensaje.');
      setStatus('ready');
    }
  };

  const hangUp = () => {
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    router.back();
  };

  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const getStatusInfo = () => {
    switch (status) {
      case 'idle':
        return { text: 'Toca para conectar', icon: 'call-outline' as const, color: Colors.primary };
      case 'requesting_permission':
        return { text: 'Solicitando micrófono...', icon: 'mic' as const, color: Colors.warning };
      case 'getting_token':
        return { text: 'Preparando...', icon: 'hourglass' as const, color: Colors.warning };
      case 'connecting':
        return { text: 'Conectando...', icon: 'wifi' as const, color: Colors.warning };
      case 'ready':
        return { text: 'Listo para hablar', icon: 'checkmark-circle' as const, color: Colors.success };
      case 'recording':
        return { text: 'Grabando...', icon: 'mic' as const, color: Colors.error };
      case 'processing':
        return { text: 'Procesando...', icon: 'hourglass' as const, color: Colors.warning };
      case 'speaking':
        return { text: `${plantName} está respondiendo...`, icon: 'volume-high' as const, color: Colors.primary };
      case 'error':
        return { text: 'Error', icon: 'alert-circle' as const, color: Colors.error };
      default:
        return { text: '', icon: 'help' as const, color: Colors.textMuted };
    }
  };

  const statusInfo = getStatusInfo();
  const isConnected = ['ready', 'recording', 'processing', 'speaking'].includes(status);
  const isLoading = ['requesting_permission', 'getting_token', 'connecting', 'processing'].includes(status);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <LinearGradient
        colors={Gradients.primary as [string, string]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{plantName}</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
            <Text style={styles.statusText}>{statusInfo.text}</Text>
          </View>
        </View>
        {isConnected ? (
          <TouchableOpacity onPress={hangUp} style={styles.hangUpButtonSmall}>
            <Ionicons name="call" size={20} color={Colors.white} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerPlaceholder} />
        )}
      </LinearGradient>

      {/* Mensajes */}
      <ScrollView 
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((msg, idx) => (
          <View
            key={idx}
            style={[
              styles.messageBubble,
              msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            {msg.role === 'assistant' && (
              <Ionicons name="leaf" size={16} color={Colors.primary} style={styles.messageIcon} />
            )}
            <Text style={[
              styles.messageText,
              msg.role === 'user' && styles.userMessageText,
            ]}>
              {msg.content}
            </Text>
          </View>
        ))}

        {/* Transcripción en progreso */}
        {currentTranscript && (
          <View style={[styles.messageBubble, styles.assistantBubble, styles.typingBubble]}>
            <Ionicons name="leaf" size={16} color={Colors.primary} style={styles.messageIcon} />
            <Text style={styles.messageText}>{currentTranscript}</Text>
            <Text style={styles.typingIndicator}>...</Text>
          </View>
        )}

        {/* Estado de grabación */}
        {status === 'recording' && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Grabando tu mensaje...</Text>
          </View>
        )}
      </ScrollView>

      {/* Error */}
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={18} color={Colors.error} />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={() => setErrorMessage(null)}>
            <Ionicons name="close" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      )}

      {/* Controles */}
      <View style={styles.controls}>
        {!isConnected && status !== 'error' ? (
          <TouchableOpacity
            onPress={startCall}
            style={styles.callButton}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} size="large" />
            ) : (
              <>
                <Ionicons name="call" size={32} color={Colors.white} />
                <Text style={styles.callButtonText}>Llamar</Text>
              </>
            )}
          </TouchableOpacity>
        ) : status === 'error' ? (
          <TouchableOpacity onPress={startCall} style={styles.retryButton}>
            <Ionicons name="refresh" size={28} color={Colors.white} />
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.connectedControls}>
            {/* Botón de micrófono (mantener presionado) */}
            <TouchableOpacity
              onPressIn={startRecording}
              onPressOut={stopRecordingAndSend}
              style={[
                styles.micButton,
                status === 'recording' && styles.micButtonRecording,
              ]}
              disabled={status === 'processing' || status === 'speaking'}
            >
              <Ionicons
                name={status === 'recording' ? 'mic' : 'mic-outline'}
                size={36}
                color={status === 'recording' ? Colors.white : Colors.primary}
              />
            </TouchableOpacity>
            <Text style={styles.micHint}>
              {status === 'recording' 
                ? 'Suelta para enviar' 
                : status === 'speaking'
                ? 'Escuchando respuesta...'
                : 'Mantén presionado para hablar'}
            </Text>
          </View>
        )}
      </View>

      {/* Aviso de audio */}
      <View style={styles.audioNotice}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
        <Text style={styles.audioNoticeText}>
          Las respuestas se muestran como texto. La reproducción de voz está en desarrollo.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255,255,255,0.9)',
  },
  hangUpButtonSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.backgroundLight,
  },
  typingBubble: {
    opacity: 0.8,
  },
  messageIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  messageText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    color: Colors.text,
    lineHeight: 22,
  },
  userMessageText: {
    color: Colors.white,
  },
  typingIndicator: {
    color: Colors.textMuted,
    marginLeft: 4,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.error,
    marginRight: 8,
  },
  recordingText: {
    color: Colors.error,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '15',
    padding: Spacing.sm,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.error,
  },
  controls: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  callButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  callButtonText: {
    color: Colors.white,
    fontWeight: '700',
    marginTop: 4,
  },
  retryButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: '700',
    marginTop: 4,
  },
  connectedControls: {
    alignItems: 'center',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  micButtonRecording: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  micHint: {
    marginTop: Spacing.sm,
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  audioNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: 6,
  },
  audioNoticeText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
