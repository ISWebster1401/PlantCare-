import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './AIChat.css';

interface AIMessage {
  id: string | number;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  deviceInfo?: any;
}

interface Conversation {
  id: number | string;
  title: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

const defaultWelcomeMessage = (): AIMessage => ({
  id: `welcome_${Date.now()}`,
  type: 'ai',
  content: '🌱 ¡Hola! Soy PlantCare AI, tu asistente experto en cuidado de plantas. Puedo ayudarte a identificar plantas, dar consejos de cuidado y responder tus preguntas. ¿Con qué te ayudo hoy?',
  timestamp: new Date().toISOString()
});

const formatConversationTime = (iso: string) => {
  try {
    const date = new Date(iso);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

const getConversationPreview = (conversation: Conversation) => {
  if (!conversation.messages.length) {
    return 'Conversación vacía';
  }
  const lastUserMessage = [...conversation.messages]
    .reverse()
    .find((message) => message.type === 'user');

  const candidate = lastUserMessage ?? conversation.messages[conversation.messages.length - 1];
  const text = candidate.content.replace(/\s+/g, ' ').trim();
  if (!text) {
    return 'Sin contenido';
  }
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
};

const AIChat: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  // Puede ser ID numérico de backend, 'new' para conversaciones locales, o null
  const [activeConversationId, setActiveConversationId] = useState<number | string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const streamingMessageRef = useRef<string>('');
  const streamingMessageIdRef = useRef<string | null>(null);

  // Cargar conversaciones desde backend
  const loadConversations = useCallback(async () => {
    try {
      const convs = await aiAPI.getConversations();
      if (convs && convs.length > 0) {
        // Convertir conversaciones del backend al formato local
        const formattedConvs: Conversation[] = await Promise.all(
          convs.map(async (conv: any) => {
            // Cargar mensajes de cada conversación
            const fullConv = await aiAPI.getConversation(conv.id);
            return {
              id: conv.id,
              title: conv.title,
              messages: fullConv.messages.map((msg: any) => ({
                id: msg.id,
                type: msg.role === 'user' ? 'user' : 'ai',
                content: msg.content,
                timestamp: msg.created_at
              })),
              createdAt: conv.created_at,
              updatedAt: conv.updated_at,
              messageCount: conv.message_count
            };
          })
        );
        setConversations(formattedConvs);
        if (formattedConvs.length > 0 && !activeConversationId) {
          setActiveConversationId(formattedConvs[0].id as number);
        }
      } else {
        // Si no hay conversaciones, crear una nueva con mensaje de bienvenida
        const newConv: Conversation = {
          id: 'new',
          title: 'Nuevo chat',
          messages: [defaultWelcomeMessage()],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setConversations([newConv]);
        setActiveConversationId(null);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Fallback: crear conversación local
      const fallbackConv: Conversation = {
        id: 'new',
        title: 'Nuevo chat',
        messages: [defaultWelcomeMessage()],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setConversations([fallbackConv]);
      setActiveConversationId(null);
    }
  }, [activeConversationId]);

  const loadDevices = useCallback(async () => {
    try {
      const deviceList = await aiAPI.getMyDevices();
      setDevices(deviceList);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadConversations();
      loadDevices();
    }
  }, [user, loadConversations, loadDevices]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const appendMessageToConversation = useCallback((conversationId: number | string, message: AIMessage) => {
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }

        const updatedMessages = [...conversation.messages, message];
        let updatedTitle = conversation.title;
        if (message.type === 'user' && conversation.messages.filter((msg) => msg.type === 'user').length === 0) {
          const trimmed = message.content.trim();
          if (trimmed) {
            updatedTitle = trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
          }
        }

        return {
          ...conversation,
          messages: updatedMessages,
          updatedAt: message.timestamp,
          title: updatedTitle
        };
      })
    );
  }, []);

  const updateStreamingMessage = useCallback((conversationId: number | string, content: string) => {
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }

        const messages = [...conversation.messages];
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage && lastMessage.type === 'ai' && lastMessage.id === streamingMessageIdRef.current) {
          // Actualizar mensaje existente
          messages[messages.length - 1] = {
            ...lastMessage,
            content: content
          };
        } else {
          // Crear nuevo mensaje si no existe
          messages.push({
            id: streamingMessageIdRef.current || Date.now(),
            type: 'ai',
            content: content,
            timestamp: new Date().toISOString()
          });
        }

        return {
          ...conversation,
          messages: messages
        };
      })
    );
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || isStreaming) return;

    let conversationId = activeConversationId;
    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Si no hay conversación activa o es 'new', crear una nueva
    if (!conversationId || conversationId === 'new') {
      conversationId = null;
    }

    const userMessage: AIMessage = {
      id: Date.now(),
      type: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    // Si no hay conversación activa, crear una temporal
    if (!conversationId) {
      const newConv: Conversation = {
        id: 'new',
        title: messageText.length > 40 ? `${messageText.slice(0, 40)}…` : messageText,
        messages: [defaultWelcomeMessage(), userMessage],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId('new' as any);
    } else {
      appendMessageToConversation(conversationId, userMessage);
    }

    try {
      // Usar streaming para mejor UX
      setIsStreaming(true);
      streamingMessageRef.current = '';
      streamingMessageIdRef.current = `streaming_${Date.now()}`;

      // Agregar mensaje de IA vacío para mostrar mientras stream
      const tempAiMessage: AIMessage = {
        id: streamingMessageIdRef.current,
        type: 'ai',
        content: '',
        timestamp: new Date().toISOString()
      };
      appendMessageToConversation(conversationId || 'new', tempAiMessage);

      let finalConversationId = conversationId;

      await aiAPI.chatStream(
        messageText,
        typeof conversationId === 'number' ? conversationId : undefined,
        selectedDevice || undefined,
        (chunk: string) => {
          streamingMessageRef.current += chunk;
          updateStreamingMessage(finalConversationId || 'new', streamingMessageRef.current);
        },
        async () => {
          setIsStreaming(false);
          // Recargar conversaciones para obtener IDs reales
          await loadConversations();
        },
        (error: string) => {
          setIsStreaming(false);
          setIsLoading(false);
          const errorMessage: AIMessage = {
            id: Date.now(),
            type: 'ai',
            content: `❌ Error: ${error}`,
            timestamp: new Date().toISOString()
          };
          appendMessageToConversation(finalConversationId || 'new', errorMessage);
        }
      );
    } catch (error: any) {
      setIsStreaming(false);
      setIsLoading(false);
      const errorMessage: AIMessage = {
        id: Date.now(),
        type: 'ai',
        content: '❌ Lo siento, hubo un error procesando tu consulta. Por favor intenta de nuevo.',
        timestamp: new Date().toISOString()
      };
      appendMessageToConversation(conversationId || 'new', errorMessage);
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
      updatedAt: new Date().toISOString()
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
      // Si es conversación local ('new'), solo eliminarla del estado
      setConversations((prev) => {
        const filtered = prev.filter((conversation) => conversation.id !== conversationId);
        if (!filtered.length) {
          const fallbackConversation: Conversation = {
            id: 'new',
            title: 'Nuevo chat',
            messages: [defaultWelcomeMessage()],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setActiveConversationId('new' as any);
          return [fallbackConversation];
        }
        if (conversationId === activeConversationId) {
          setActiveConversationId(filtered[0].id as number);
        }
        return filtered;
      });
    }
  };

  const activeMessages = activeConversation?.messages ?? [];

  return (
    <div className="ai-chat">
      <div className="chat-header">
        <div className="header-main">
          <h2>🤖 PlantCare AI Assistant</h2>
          <div className="chat-actions">
            <button className="new-chat-btn" onClick={handleNewChat}>
              ➕ Nuevo chat
            </button>
          </div>
        </div>
        <div className="device-selector">
          <label>Dispositivo (opcional):</label>
          <select
            value={selectedDevice || ''}
            onChange={(e) => setSelectedDevice(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Consulta general</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} ({device.device_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="chat-layout">
        <aside className="chat-sidebar">
          <h3>Mis chats</h3>
          <div className="conversation-list">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`conversation-item ${conversation.id === activeConversationId ? 'active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => setActiveConversationId(conversation.id as number)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    setActiveConversationId(conversation.id as number);
                  }
                }}
              >
                <div className="conversation-top">
                  <div className="conversation-title">{conversation.title}</div>
                  <div className="conversation-time">{formatConversationTime(conversation.updatedAt)}</div>
                </div>
                <div className="conversation-preview">{getConversationPreview(conversation)}</div>
                <button
                  type="button"
                  className="conversation-delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteConversation(conversation.id);
                  }}
                  title="Eliminar chat"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </aside>

        <div className="chat-main">
          <div className="chat-messages">
            {activeMessages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                  {message.deviceInfo && (
                    <div className="device-context">
                      📱 Dispositivo: {message.deviceInfo.name} ({message.deviceInfo.plant_type})
                    </div>
                  )}
                  <div className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
            {(isLoading || isStreaming) && (
              <div className="message ai loading">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="chat-input">
            <input
              type="text"
              placeholder={
                selectedDevice
                  ? 'Pregunta sobre tu dispositivo...'
                  : 'Haz una pregunta sobre tus plantas...'
              }
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isLoading || isStreaming}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || isStreaming || !inputMessage.trim()}
              className="send-btn"
            >
              {(isLoading || isStreaming) ? '⏳' : '🚀'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
