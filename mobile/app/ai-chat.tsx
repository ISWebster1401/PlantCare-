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
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { aiAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

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
      setIsStreaming(true);
      streamingMessageRef.current = '';
      streamingMessageIdRef.current = `streaming_${Date.now()}`;

      const tempAiMessage: AIMessage = {
        id: streamingMessageIdRef.current,
        type: 'ai',
        content: '',
        timestamp: new Date().toISOString(),
      };
      appendMessage(conversationId || 'new', tempAiMessage);

      let finalConversationId = conversationId;

      await aiAPI.chatStream(
        messageText,
        typeof conversationId === 'number' ? conversationId : undefined,
        selectedDevice || undefined,
        (chunk: string) => {
          streamingMessageRef.current += chunk;
          updateStreamingMessage(finalConversationId || 'new', streamingMessageRef.current);
          // Auto-scroll to bottom
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        },
        async () => {
          setIsStreaming(false);
          await loadConversations();
        },
        (error: string) => {
          setIsStreaming(false);
          setIsLoading(false);
          const errorMessage: AIMessage = {
            id: Date.now(),
            type: 'ai',
            content: `❌ Error: ${error}`,
            timestamp: new Date().toISOString(),
          };
          appendMessage(finalConversationId || 'new', errorMessage);
        }
      );
    } catch (error: any) {
      setIsStreaming(false);
      setIsLoading(false);
      const errorMessage: AIMessage = {
        id: Date.now(),
        type: 'ai',
        content: '❌ Lo siento, hubo un error procesando tu consulta.',
        timestamp: new Date().toISOString(),
      };
      appendMessage(conversationId || 'new', errorMessage);
    } finally {
      setIsLoading(false);
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🤖 PlantCare AI</Text>
        <TouchableOpacity onPress={handleNewChat} style={styles.newChatButton}>
          <Ionicons name="add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {activeConversation && (
        <>
          <FlatList
            ref={flatListRef}
            data={activeConversation.messages}
            renderItem={renderMessage}
            keyExtractor={(item) => String(item.id)}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
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
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    newChatButton: {
      padding: 8,
    },
    messagesList: {
      flex: 1,
    },
    messagesContent: {
      padding: 16,
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
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: 'flex-end',
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
