/**
 * Pantalla de Chat con IA - Con memoria y streaming
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { aiAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';

interface AIMessage {
  id: string | number;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface Conversation {
  id: number | string;
  title: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

const defaultWelcomeMessage = (): AIMessage => ({
  id: `welcome_${Date.now()}`,
  type: 'ai',
  content: '🌱 ¡Hola! Soy PlantCare AI, tu asistente experto en cuidado de plantas. Puedo ayudarte a identificar plantas, dar consejos de cuidado y responder tus preguntas. ¿Con qué te ayudo hoy?',
  timestamp: new Date().toISOString(),
});

export default function AIChatScreen() {
  const { theme } = useTheme();
  const { logout } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const streamingMessageRef = useRef<string>('');
  const streamingMessageIdRef = useRef<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const styles = createStyles(theme.colors);

  useEffect(() => {
    loadConversations();
    loadDevices();
  }, []);

  const loadConversations = async () => {
    try {
      const convs = await aiAPI.getConversations();
      if (convs && convs.length > 0) {
        const formattedConvs: Conversation[] = await Promise.all(
          convs.map(async (conv: any) => {
            const fullConv = await aiAPI.getConversation(conv.id);
            return {
              id: conv.id,
              title: conv.title,
              messages: fullConv.messages.map((msg: any) => ({
                id: msg.id,
                type: msg.role === 'user' ? 'user' : 'ai',
                content: msg.content,
                timestamp: msg.created_at,
              })),
              createdAt: conv.created_at,
              updatedAt: conv.updated_at,
            };
          })
        );
        setConversations(formattedConvs);
        if (formattedConvs.length > 0 && !activeConversationId) {
          setActiveConversationId(formattedConvs[0].id as number);
        }
      } else {
        const newConv: Conversation = {
          id: 'new',
          title: 'Nuevo chat',
          messages: [defaultWelcomeMessage()],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setConversations([newConv]);
        setActiveConversationId(null);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      const fallbackConv: Conversation = {
        id: 'new',
        title: 'Nuevo chat',
        messages: [defaultWelcomeMessage()],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConversations([fallbackConv]);
      setActiveConversationId(null);
    }
  };

  const loadDevices = async () => {
    try {
      const deviceList = await aiAPI.getMyDevices();
      setDevices(deviceList);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const activeConversation = conversations.find(
    (conv) => conv.id === activeConversationId
  ) || conversations[0] || null;

  const appendMessage = useCallback((conversationId: number | string, message: AIMessage) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== conversationId) return conv;
        return {
          ...conv,
          messages: [...conv.messages, message],
          updatedAt: message.timestamp,
        };
      })
    );
  }, []);

  const updateStreamingMessage = useCallback((conversationId: number | string, content: string) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== conversationId) return conv;
        const messages = [...conv.messages];
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage && lastMessage.type === 'ai' && lastMessage.id === streamingMessageIdRef.current) {
          messages[messages.length - 1] = { ...lastMessage, content };
        } else {
          messages.push({
            id: streamingMessageIdRef.current || Date.now(),
            type: 'ai',
            content,
            timestamp: new Date().toISOString(),
          });
        }

        return { ...conv, messages };
      })
    );
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || isStreaming) return;

    let conversationId = activeConversationId;
    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    if (!conversationId || conversationId === 'new') {
      conversationId = null;
    }

    const userMessage: AIMessage = {
      id: Date.now(),
      type: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    if (!conversationId) {
      const newConv: Conversation = {
        id: 'new',
        title: messageText.length > 40 ? `${messageText.slice(0, 40)}…` : messageText,
        messages: [defaultWelcomeMessage(), userMessage],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId('new' as any);
    } else {
      appendMessage(conversationId, userMessage);
    }

    try {
      setIsLoading(true);
      let finalConversationId = conversationId;

      // Usar endpoint normal (sin streaming) por ahora, ya que React Native no soporta getReader() directamente
      const response = await aiAPI.chat(
        messageText,
        typeof conversationId === 'number' ? conversationId : undefined,
        selectedDevice || undefined
      );

      const aiMessage: AIMessage = {
        id: response.message_id || Date.now(),
        type: 'ai',
        content: response.response,
        timestamp: response.timestamp || new Date().toISOString(),
      };

      appendMessage(finalConversationId || 'new', aiMessage);
      
      // Recargar conversaciones para obtener IDs reales
      await loadConversations();
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      setIsStreaming(false);
      setIsLoading(false);
      
      // Manejar errores de autenticación
      if (error.response?.status === 401 || error.message?.includes('expired') || error.message?.includes('401')) {
        Alert.alert(
          'Sesión Expirada',
          'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await logout();
                router.replace('/(auth)/login');
              }
            }
          ]
        );
        return;
      }
      
      const errorMessage: AIMessage = {
        id: Date.now(),
        type: 'ai',
        content: `❌ Error: ${error.message || 'No se pudo procesar tu consulta. Por favor intenta de nuevo.'}`,
        timestamp: new Date().toISOString(),
      };
      appendMessage(conversationId || 'new', errorMessage);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleNewChat = () => {
    const newConv: Conversation = {
      id: 'new',
      title: 'Nuevo chat',
      messages: [defaultWelcomeMessage()],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId('new' as any);
  };

  const handleDeleteConversation = async (conversationId: number | string) => {
    if (typeof conversationId === 'number') {
      try {
        await aiAPI.deleteConversation(conversationId);
        await loadConversations();
      } catch (error) {
        console.error('Error deleting conversation:', error);
      }
    } else {
      setConversations((prev) => {
        const filtered = prev.filter((conv) => conv.id !== conversationId);
        if (!filtered.length) {
          const fallback: Conversation = {
            id: 'new',
            title: 'Nuevo chat',
            messages: [defaultWelcomeMessage()],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setActiveConversationId('new' as any);
          return [fallback];
        }
        if (conversationId === activeConversationId) {
          setActiveConversationId(filtered[0].id as number);
        }
        return filtered;
      });
    }
  };

  const renderMessage = ({ item }: { item: AIMessage }) => (
    <View
      style={[
        styles.messageContainer,
        item.type === 'user' ? styles.userMessage : styles.aiMessage,
      ]}
    >
      <Text style={item.type === 'user' ? styles.userText : styles.aiText}>
        {item.content}
      </Text>
      <Text style={styles.timestamp}>
        {new Date(item.timestamp).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>🤖 PlantCare AI</Text>
          </View>
          <TouchableOpacity onPress={handleNewChat} style={styles.newChatButton}>
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {activeConversation && (
          <KeyboardAvoidingView
            style={styles.chatContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <FlatList
              ref={flatListRef}
              data={activeConversation.messages}
              renderItem={renderMessage}
              keyExtractor={(item) => String(item.id)}
              style={styles.messagesList}
              contentContainerStyle={[
                styles.messagesContent,
                activeConversation.messages.length <= 1 && styles.emptyContent
              ]}
              showsVerticalScrollIndicator={true}
              onContentSizeChange={() => {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
              onLayout={() => {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }, 100);
              }}
              ListFooterComponent={
                (isLoading || isStreaming) ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Pensando...</Text>
                  </View>
                ) : null
              }
            />

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputMessage}
                onChangeText={setInputMessage}
                placeholder="Haz una pregunta sobre tus plantas..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                editable={!isLoading && !isStreaming}
              />
              <TouchableOpacity
                onPress={sendMessage}
                disabled={!inputMessage.trim() || isLoading || isStreaming}
                style={[
                  styles.sendButton,
                  (!inputMessage.trim() || isLoading || isStreaming) && styles.sendButtonDisabled,
                ]}
              >
                {(isLoading || isStreaming) ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    chatContainer: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      minHeight: 50,
      backgroundColor: colors.background,
    },
    backButton: {
      padding: 8,
      width: 40,
      alignItems: 'center',
    },
    headerTitleContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    newChatButton: {
      padding: 8,
      width: 40,
      alignItems: 'center',
    },
    messagesList: {
      flex: 1,
    },
    messagesContent: {
      padding: 16,
      paddingBottom: 8,
    },
    emptyContent: {
      flexGrow: 1,
      justifyContent: 'flex-end',
    },
    messageContainer: {
      marginVertical: 8,
      padding: 12,
      borderRadius: 12,
      maxWidth: '80%',
    },
    userMessage: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
    },
    aiMessage: {
      alignSelf: 'flex-start',
      backgroundColor: colors.card,
    },
    userText: {
      color: '#fff',
      fontSize: 16,
    },
    aiText: {
      color: colors.text,
      fontSize: 16,
    },
    timestamp: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 4,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    loadingText: {
      marginLeft: 8,
      color: colors.textSecondary,
    },
    inputContainer: {
      flexDirection: 'row',
      padding: 16,
      paddingBottom: Platform.OS === 'ios' ? 16 : 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: 'flex-end',
      backgroundColor: colors.background,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      maxHeight: 100,
      color: colors.text,
      backgroundColor: colors.card,
    },
    sendButton: {
      marginLeft: 8,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
  });
