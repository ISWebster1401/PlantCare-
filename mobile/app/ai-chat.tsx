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
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Model3DViewer } from '../components/Model3DViewer';
import { PlantAIIcon } from '../components/PlantAIIcon';
import { Button } from '../components/ui';
import { Colors, Typography, Spacing, BorderRadius, Gradients, Shadows } from '../constants/DesignSystem';

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
const MessageAvatar: React.FC<{ type: 'user' | 'ai' }> = ({ type }) => {
  const userAvatarStyle = {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
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

  if (type === 'user') {
    return (
      <View style={userAvatarStyle}>
        <Ionicons name="person" size={16} color={Colors.white} />
      </View>
    );
  }
  return (
    <LinearGradient
      colors={Gradients.primary as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={aiAvatarStyle}
    >
      <PlantAIIcon size={16} color={Colors.white} />
    </LinearGradient>
  );
};

export default function AIChatScreen() {
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
  const sendButtonScale = useRef(new Animated.Value(1)).current;
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
        setConversations((prev) => {
          const updated = formattedConvs;
          // Preservar conversaciones locales que aún no están en el backend (como 'new')
          const localConvs = prev.filter((c) => c.id === 'new' || (typeof c.id === 'string' && !formattedConvs.find(fc => String(fc.id) === String(c.id))));
          return [...updated, ...localConvs];
        });
        if (formattedConvs.length > 0 && !activeConversationId) {
          setActiveConversationId(formattedConvs[0].id as number);
        }
      } else {
        // Preservar conversaciones locales si no hay conversaciones en el backend
        setConversations((prev) => {
          return prev.filter((c) => c.id === 'new' || typeof c.id === 'string');
        });
        setActiveConversationId(null);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Preservar conversaciones locales en caso de error
      setConversations((prev) => {
        return prev.filter((c) => c.id === 'new' || typeof c.id === 'string');
      });
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
    
    Animated.spring(animValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
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

      // Si la conversación era 'new' y ahora tenemos un ID real del backend, actualizar
      const realConversationId = response.conversation_id;
      if (realConversationId && (finalConversationId === null || finalConversationId === 'new')) {
        // Actualizar la conversación local para usar el ID real del backend
        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.id === 'new' || conv.id === finalConversationId) {
              // Preservar el mensaje de bienvenida si existe
              const welcomeMessage = conv.messages.find(
                (msg) => msg.type === 'ai' && (msg.content.includes('¡Hola!') || String(msg.id).startsWith('welcome_'))
              );
              
              // Obtener todos los mensajes existentes (incluyendo userMessage que ya se agregó)
              const existingMessages = conv.messages.filter(m => m.id !== aiMessage.id);
              
              // Si hay mensaje de bienvenida, asegurarse de que esté al inicio
              const allMessages = welcomeMessage 
                ? [welcomeMessage, ...existingMessages.filter(m => m.id !== welcomeMessage.id), aiMessage]
                : [...existingMessages, aiMessage];
              
              return {
                ...conv,
                id: realConversationId,
                messages: allMessages,
                updatedAt: new Date().toISOString(),
              };
            }
            return conv;
          })
        );
        setActiveConversationId(realConversationId);
      } else {
        // Si ya tenía un ID real, solo agregar el mensaje
        appendMessage(finalConversationId || 'new', aiMessage);
      }
      
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

  const handleSelectPlant = async (plant: PlantResponse) => {
    setSelectedPlant(plant);
    setShowPlantSelector(false);
    setIsLoading(true);
    
    try {
      // Buscar si ya existe una conversación para esta planta
      const existingConv = await aiAPI.getConversationByPlant(plant.id);
      
      if (existingConv) {
        // Cargar conversación existente
        const formattedConv: Conversation = {
          id: existingConv.id,
          title: existingConv.title,
          messages: existingConv.messages.map((msg: any) => ({
            id: msg.id,
            type: msg.role === 'user' ? 'user' : 'ai',
            content: msg.content,
            timestamp: msg.created_at,
          })),
          createdAt: existingConv.created_at,
          updatedAt: existingConv.updated_at,
        };
        setConversations([formattedConv]);
        setActiveConversationId(formattedConv.id as number);
      } else {
        // No existe conversación, crear una nueva local (se creará en el backend al enviar el primer mensaje)
        const newConv: Conversation = {
          id: 'new',
          title: `Chat con ${plant.plant_name}`,
          messages: [getWelcomeMessage(plant.plant_name)],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setConversations([newConv]);
        setActiveConversationId('new');
      }
    } catch (error) {
      console.error('Error cargando conversación de planta:', error);
      // Si hay error, crear conversación local de todas formas
      const newConv: Conversation = {
        id: 'new',
        title: `Chat con ${plant.plant_name}`,
        messages: [getWelcomeMessage(plant.plant_name)],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConversations([newConv]);
      setActiveConversationId('new');
    } finally {
      setIsLoading(false);
    }
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
            {!isUser && <MessageAvatar type="ai" />}
            {isUser ? (
              <LinearGradient
                colors={Gradients.primary as any}
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
            {isUser && <MessageAvatar type="user" />}
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
          <Ionicons name="leaf-outline" size={64} color={Colors.textSecondary} />
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
              <View style={styles.plantCardImageContainer}>
                {item.model_3d_url ? (
                  <Model3DViewer
                    modelUrl={item.model_3d_url}
                    style={styles.plantCardImage}
                    autoRotate={true}
                    characterMood={item.character_mood}
                  />
                ) : item.character_image_url ? (
                  <Image
                    source={{ uri: item.character_image_url }}
                    style={styles.plantCardImage}
                    resizeMode="cover"
                  />
                ) : item.default_render_url ? (
                  <Image
                    source={{ uri: item.default_render_url }}
                    style={styles.plantCardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.plantCardImagePlaceholder}>
                    <Ionicons name="leaf" size={32} color={Colors.primary} />
                  </View>
                )}
              </View>
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
              <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
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
        <LinearGradient
          colors={Gradients.primary as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {!selectedPlant && <PlantAIIcon size={20} color={Colors.white} />}
              <Text style={styles.headerTitle}>
                {selectedPlant ? `💬 ${selectedPlant.plant_name}` : 'PlantCare AI'}
              </Text>
            </View>
            {(isLoading || isStreaming) && (
              <View style={styles.statusIndicator}>
                <View style={[styles.statusDot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.statusText}>Pensando...</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={handleNewChat}
            style={styles.newChatButton}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={28} color={Colors.white} />
          </TouchableOpacity>
        </LinearGradient>

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
                    <MessageAvatar type="ai" />
                    <View style={styles.typingBubble}>
                      <TypingIndicator color={Colors.primary} />
                    </View>
                  </View>
                ) : null
              }
            />

            <View style={styles.inputSafeArea}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={inputMessage}
                  onChangeText={setInputMessage}
                  placeholder="Haz una pregunta sobre tus plantas..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  editable={!isLoading && !isStreaming}
                  onFocus={() => {
                    setTimeout(() => {
                      flatListRef.current?.scrollToEnd({ animated: true });
                    }, 300);
                  }}
                />
                <Animated.View
                  style={{
                    transform: [{ scale: sendButtonScale }],
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      // Animación de scale al presionar
                      Animated.sequence([
                        Animated.spring(sendButtonScale, {
                          toValue: 0.9,
                          useNativeDriver: true,
                          tension: 300,
                          friction: 10,
                        }),
                        Animated.spring(sendButtonScale, {
                          toValue: 1,
                          useNativeDriver: true,
                          tension: 300,
                          friction: 10,
                        }),
                      ]).start();
                      sendMessage();
                    }}
                    disabled={!inputMessage.trim() || isLoading || isStreaming}
                    style={[
                      styles.sendButton,
                      (!inputMessage.trim() || isLoading || isStreaming) && styles.sendButtonDisabled,
                    ]}
                    activeOpacity={1}
                  >
                    <LinearGradient
                      colors={inputMessage.trim() && !isLoading && !isStreaming
                        ? (Gradients.primary as any)
                        : [Colors.textMuted, Colors.textSecondary]}
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
                </Animated.View>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Shadows.md,
  },
  backButton: {
    padding: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  newChatButton: {
    padding: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.sm,
    maxWidth: '100%',
    ...Shadows.glow(Colors.primary),
  },
  aiBubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.sm,
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    maxWidth: '100%',
    ...Shadows.sm,
  },
  userText: {
    color: Colors.white,
    fontSize: Typography.sizes.base,
    lineHeight: 22,
    fontWeight: Typography.weights.medium,
  },
  aiText: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    lineHeight: 22,
  },
  userTimestamp: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  aiTimestamp: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'left',
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.sm,
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary + '50',
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
    backgroundColor: Colors.backgroundLight,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xs : Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundLighter,
    alignItems: 'flex-end',
    backgroundColor: Colors.backgroundLight,
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    maxHeight: 100,
    color: Colors.text,
    backgroundColor: Colors.background,
    fontSize: Typography.sizes.base,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    ...Shadows.glow(Colors.primary),
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
    backgroundColor: Colors.background,
  },
  plantSelectorHeader: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundLighter,
  },
  plantSelectorTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  plantSelectorSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  plantListContent: {
    padding: 16,
  },
  plantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.backgroundLighter,
    ...Shadows.sm,
  },
  plantCardImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  plantCardImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  plantCardImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plantCardContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  plantCardName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  plantCardType: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
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
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },
  emptyPlantsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyPlantsText: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyPlantsSubtext: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  addPlantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  addPlantButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
});
