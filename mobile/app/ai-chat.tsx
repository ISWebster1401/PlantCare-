/**
 * Pantalla de Chat con IA - Con memoria y streaming
 * Mejorado con mejor UX, diseño moderno y funcionalidades adicionales
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
  Animated,
  Pressable,
  Alert,
  Keyboard,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { aiAPI, plantsAPI } from '../services/api';
import { PlantResponse } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
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

const getWelcomeMessage = (plantName?: string): AIMessage => ({
  id: `welcome_${Date.now()}`,
  type: 'ai',
  content: plantName 
    ? `🌱 ¡Hola! Soy ${plantName}, tu planta. Estoy aquí para ayudarte a cuidarme mejor. ¿Qué te gustaría saber sobre mí?`
    : '🌱 ¡Hola! Soy PlantCare AI, tu asistente experto en cuidado de plantas. Puedo ayudarte a identificar plantas, dar consejos de cuidado y responder tus preguntas. ¿Con qué te ayudo hoy?',
  timestamp: new Date().toISOString(),
});

// Componente de indicador de escritura animado
const TypingIndicator: React.FC<{ color: string }> = ({ color }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(dot, {
              toValue: -10,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 400,
              delay: 200,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    const animations = [
      animate(dot1, 0),
      animate(dot2, 200),
      animate(dot3, 400),
    ];

    animations.forEach((anim) => anim.start());

    return () => {
      animations.forEach((anim) => anim.stop());
    };
  }, [dot1, dot2, dot3]);

  const typingContainerStyle = {
    flexDirection: 'row' as const,
    gap: 4,
    alignItems: 'center' as const,
  };

  const typingDotStyle = {
    width: 8,
    height: 8,
    borderRadius: 4,
  };

  return (
    <View style={typingContainerStyle}>
      <Animated.View
        style={[
          typingDotStyle,
          { backgroundColor: color, transform: [{ translateY: dot1 }] },
        ]}
      />
      <Animated.View
        style={[
          typingDotStyle,
          { backgroundColor: color, transform: [{ translateY: dot2 }] },
        ]}
      />
      <Animated.View
        style={[
          typingDotStyle,
          { backgroundColor: color, transform: [{ translateY: dot3 }] },
        ]}
      />
    </View>
  );
};

// Componente de avatar para mensajes
const MessageAvatar: React.FC<{ type: 'user' | 'ai'; colors: any }> = ({ type, colors }) => {
  const userAvatarStyle = {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const aiAvatarStyle = {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const aiAvatarTextStyle = {
    fontSize: 16,
  };

  if (type === 'user') {
    return (
      <View style={userAvatarStyle}>
        <Ionicons name="person" size={16} color="#0f172a" />
      </View>
    );
  }
  return (
    <LinearGradient
      colors={['#4ade80', '#22c55e']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={aiAvatarStyle}
    >
      <Text style={aiAvatarTextStyle}>🤖</Text>
    </LinearGradient>
  );
};

export default function AIChatScreen() {
  const { theme } = useTheme();
  const { logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [plants, setPlants] = useState<PlantResponse[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<PlantResponse | null>(null);
  const [showPlantSelector, setShowPlantSelector] = useState(true);
  const streamingMessageRef = useRef<string>('');
  const streamingMessageIdRef = useRef<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const messageAnimations = useRef<Map<string | number, Animated.Value>>(new Map());

  const styles = createStyles(theme.colors);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Calcular offset del teclado incluyendo header y safe area
  // En iOS necesitamos incluir la altura del header + safe area top
  // Aumentamos el offset para asegurar que el input quede visible
  const headerHeight = 60;
  const keyboardOffset = Platform.OS === 'ios' 
    ? headerHeight + insets.top + 10 // Agregamos 10px extra para asegurar visibilidad
    : 0;

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll al final cuando aparece el teclado
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    loadPlants();
    loadConversations();
    loadDevices();
  }, []);

  const loadPlants = async () => {
    try {
      const plantsList = await plantsAPI.getMyPlants();
      setPlants(plantsList);
    } catch (error) {
      console.error('Error loading plants:', error);
    }
  };

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
        // No crear conversación por defecto si no hay plantas seleccionadas
        setConversations([]);
        setActiveConversationId(null);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
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
    // Crear animación para el nuevo mensaje
    const animValue = new Animated.Value(0);
    messageAnimations.current.set(message.id, animValue);
    
    Animated.timing(animValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

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
      const welcomeMsg = selectedPlant 
        ? getWelcomeMessage(selectedPlant.plant_name)
        : getWelcomeMessage();
      const newConv: Conversation = {
        id: 'new',
        title: selectedPlant 
          ? `Chat con ${selectedPlant.plant_name}`
          : (messageText.length > 40 ? `${messageText.slice(0, 40)}…` : messageText),
        messages: [welcomeMsg, userMessage],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId('new');
    } else {
      appendMessage(conversationId, userMessage);
    }

    try {
      setIsLoading(true);
      let finalConversationId = conversationId;

      const response = await aiAPI.chat(
        messageText,
        typeof conversationId === 'number' ? conversationId : undefined,
        selectedPlant?.id || undefined, // plant_id tiene prioridad
        selectedDevice || undefined
      );

      const aiMessage: AIMessage = {
        id: response.message_id || Date.now(),
        type: 'ai',
        content: response.response,
        timestamp: response.timestamp || new Date().toISOString(),
      };

      appendMessage(finalConversationId || 'new', aiMessage);
      
      await loadConversations();
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      setIsStreaming(false);
      setIsLoading(false);
      
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

  const handleSelectPlant = (plant: PlantResponse) => {
    setSelectedPlant(plant);
    setShowPlantSelector(false);
    // Crear nueva conversación con mensaje de bienvenida personalizado
    const newConv: Conversation = {
      id: 'new',
      title: `Chat con ${plant.plant_name}`,
      messages: [getWelcomeMessage(plant.plant_name)],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations([newConv]);
    setActiveConversationId('new');
  };

  const handleNewChat = () => {
    setSelectedPlant(null);
    setShowPlantSelector(true);
    setConversations([]);
    setActiveConversationId(null);
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
            messages: [getWelcomeMessage()],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setActiveConversationId('new');
          return [fallback];
        }
        if (conversationId === activeConversationId) {
          setActiveConversationId(filtered[0].id as number);
        }
        return filtered;
      });
    }
  };

  const handleCopyMessage = async (content: string) => {
    await Clipboard.setStringAsync(content);
    Alert.alert('Copiado', 'Mensaje copiado al portapapeles');
  };

  const renderMessage = ({ item }: { item: AIMessage }) => {
    const animValue = messageAnimations.current.get(item.id) || new Animated.Value(1);
    const opacity = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    const translateY = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 0],
    });

    const isUser = item.type === 'user';

    return (
      <Pressable
        onLongPress={() => handleCopyMessage(item.content)}
        style={[
          styles.messageWrapper,
          isUser ? styles.userMessageWrapper : styles.aiMessageWrapper,
        ]}
      >
        <Animated.View
          style={[
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View
            style={[
              styles.messageContainer,
              isUser ? styles.userMessageContainer : styles.aiMessageContainer,
            ]}
          >
            {!isUser && <MessageAvatar type="ai" colors={theme.colors} />}
            {isUser ? (
              <LinearGradient
                colors={['#4ade80', '#22c55e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.userBubble}
              >
                <Text style={styles.userText}>{item.content}</Text>
                <Text style={styles.userTimestamp}>
                  {new Date(item.timestamp).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.aiBubble}>
                <Text style={styles.aiText}>{item.content}</Text>
                <Text style={styles.aiTimestamp}>
                  {new Date(item.timestamp).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}
            {isUser && <MessageAvatar type="user" colors={theme.colors} />}
          </View>
        </Animated.View>
      </Pressable>
    );
  };

  const renderPlantSelector = () => (
    <View style={styles.plantSelectorContainer}>
      <View style={styles.plantSelectorHeader}>
        <Text style={styles.plantSelectorTitle}>🌱 Elige una planta para chatear</Text>
        <Text style={styles.plantSelectorSubtitle}>
          Selecciona una de tus plantas para comenzar una conversación
        </Text>
      </View>
      {plants.length === 0 ? (
        <View style={styles.emptyPlantsContainer}>
          <Ionicons name="leaf-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyPlantsText}>No tienes plantas aún</Text>
          <Text style={styles.emptyPlantsSubtext}>
            Agrega plantas a tu jardín para poder chatear con ellas
          </Text>
          <TouchableOpacity
            style={styles.addPlantButton}
            onPress={() => router.push('/scan-plant')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addPlantButtonText}>Agregar Planta</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={plants}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.plantCard}
              onPress={() => handleSelectPlant(item)}
              activeOpacity={0.7}
            >
              {item.character_image_url ? (
                <Image
                  source={{ uri: item.character_image_url }}
                  style={styles.plantCardImage}
                />
              ) : (
                <View style={styles.plantCardImagePlaceholder}>
                  <Ionicons name="leaf" size={32} color={theme.colors.primary} />
                </View>
              )}
              <View style={styles.plantCardContent}>
                <Text style={styles.plantCardName}>{item.plant_name}</Text>
                {item.plant_type && (
                  <Text style={styles.plantCardType}>{item.plant_type}</Text>
                )}
                <View style={styles.plantCardStatus}>
                  <View style={[styles.plantCardStatusDot, { 
                    backgroundColor: item.health_status === 'healthy' ? '#4ade80' : '#ff9800' 
                  }]} />
                  <Text style={styles.plantCardStatusText}>
                    {item.health_status === 'healthy' ? 'Saludable' : 'Necesita atención'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.plantListContent}
        />
      )}
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
            <Text style={styles.headerTitle}>
              {selectedPlant ? `💬 ${selectedPlant.plant_name}` : '🤖 PlantCare AI'}
            </Text>
            {(isLoading || isStreaming) && (
              <View style={styles.statusIndicator}>
                <View style={[styles.statusDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={styles.statusText}>Pensando...</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={handleNewChat}
            style={styles.newChatButton}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {showPlantSelector ? renderPlantSelector() : activeConversation && (
          <KeyboardAvoidingView
            style={styles.chatWrapper}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={keyboardOffset}
          >
            <FlatList
              ref={flatListRef}
              data={activeConversation.messages}
              renderItem={renderMessage}
              keyExtractor={(item) => String(item.id)}
              style={styles.messagesList}
              contentContainerStyle={[
                styles.messagesContent,
                activeConversation.messages.length <= 1 && styles.emptyContent,
                Platform.OS === 'android' && keyboardHeight > 0 && { 
                  paddingBottom: Math.max(keyboardHeight - insets.bottom, 0) 
                }
              ]}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
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
                    <MessageAvatar type="ai" colors={theme.colors} />
                    <View style={styles.typingBubble}>
                      <TypingIndicator color={theme.colors.primary} />
                    </View>
                  </View>
                ) : null
              }
            />

            <SafeAreaView edges={['bottom']} style={styles.inputSafeArea}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={inputMessage}
                  onChangeText={setInputMessage}
                  placeholder="Haz una pregunta sobre tus plantas..."
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  editable={!isLoading && !isStreaming}
                  onFocus={() => {
                    setTimeout(() => {
                      flatListRef.current?.scrollToEnd({ animated: true });
                    }, 300);
                  }}
                />
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={!inputMessage.trim() || isLoading || isStreaming}
                  style={[
                    styles.sendButton,
                    (!inputMessage.trim() || isLoading || isStreaming) && styles.sendButtonDisabled,
                  ]}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={inputMessage.trim() && !isLoading && !isStreaming 
                      ? ['#4ade80', '#22c55e'] 
                      : ['#94a3b8', '#64748b']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sendButtonGradient}
                  >
                    {(isLoading || isStreaming) ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="send" size={22} color="#fff" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  newChatButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  chatWrapper: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyContent: {
    justifyContent: 'flex-end',
  },
  messageWrapper: {
    marginVertical: 6,
    maxWidth: '85%',
  },
  userMessageWrapper: {
    alignSelf: 'flex-end',
  },
  aiMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  userMessageContainer: {
    flexDirection: 'row-reverse',
  },
  aiMessageContainer: {
    flexDirection: 'row',
  },
  userBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    maxWidth: '100%',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  aiBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userText: {
    color: '#0f172a',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  aiText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  userTimestamp: {
    fontSize: 10,
    color: 'rgba(15, 23, 42, 0.6)',
    marginTop: 4,
    textAlign: 'right',
  },
  aiTimestamp: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'left',
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarText: {
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  typingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary + '50',
  },
  typingContainer: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inputSafeArea: {
    backgroundColor: colors.surface,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: 16,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  // Plant Selector Styles
  plantSelectorContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  plantSelectorHeader: {
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  plantSelectorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  plantSelectorSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  plantListContent: {
    padding: 16,
  },
  plantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  plantCardImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  plantCardImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plantCardContent: {
    flex: 1,
    marginLeft: 16,
  },
  plantCardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  plantCardType: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  plantCardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  plantCardStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  plantCardStatusText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyPlantsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyPlantsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyPlantsSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  addPlantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addPlantButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
