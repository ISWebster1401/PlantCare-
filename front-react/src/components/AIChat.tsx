import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './AIChat.css';

interface AIMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  deviceInfo?: any;
}

interface Conversation {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

const defaultWelcomeMessage = (): AIMessage => ({
  id: `welcome_${Date.now()}`,
  type: 'ai',
  content: '🌱 ¡Hola! Soy PlantCare AI, tu asistente experto en cuidado de plantas. Puedo ayudarte a identificar plantas, dar consejos de cuidado y responder tus preguntas. ¿Con qué te ayudo hoy?',
  timestamp: new Date().toISOString()
});

const createConversation = (title?: string): Conversation => {
  const now = new Date().toISOString();
  return {
    id: `chat_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    title: title ?? 'Nuevo chat',
    messages: [defaultWelcomeMessage()],
    createdAt: now,
    updatedAt: now,
  };
};

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
  const historyKey = useMemo(
    () => (user ? `plantcare_ai_history_${user.id}` : 'plantcare_ai_history_guest'),
    [user]
  );
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(historyKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length && parsed[0]?.messages) {
          setConversations(parsed);
          setActiveConversationId(parsed[0].id);
          return;
        }
        if (Array.isArray(parsed) && parsed.length && !parsed[0]?.messages) {
          const legacyConversation = createConversation('Chat guardado');
          legacyConversation.messages = parsed as AIMessage[];
          legacyConversation.updatedAt =
            legacyConversation.messages[legacyConversation.messages.length - 1]?.timestamp ??
            legacyConversation.createdAt;
          setConversations([legacyConversation]);
          setActiveConversationId(legacyConversation.id);
          return;
        }
      }
      const freshConversation = createConversation('Chat 1');
      setConversations([freshConversation]);
      setActiveConversationId(freshConversation.id);
      localStorage.setItem(historyKey, JSON.stringify([freshConversation]));
    } catch (error) {
      console.error('Error loading chat history:', error);
      const fallbackChat = createConversation('Chat 1');
      setConversations([fallbackChat]);
      setActiveConversationId(fallbackChat.id);
    }
  }, [historyKey]);

  useEffect(() => {
    if (!conversations.length) {
      return;
    }
    try {
      localStorage.setItem(historyKey, JSON.stringify(conversations));
    } catch (error) {
      console.error('Error storing chat history:', error);
    }
  }, [historyKey, conversations]);

  useEffect(() => {
    if (!conversations.length) {
      setActiveConversationId(null);
      return;
    }
    if (!activeConversationId || !conversations.some((conversation) => conversation.id === activeConversationId)) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const appendMessageToConversation = useCallback((conversationId: string, message: AIMessage) => {
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }

        const updatedMessages = [...conversation.messages, message];
        let updatedTitle = conversation.title;
        if (message.type === 'user') {
          const previousUserMessages = conversation.messages.filter((msg) => msg.type === 'user').length;
          if (previousUserMessages === 0) {
            const trimmed = message.content.trim();
            if (trimmed) {
              updatedTitle = trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
            }
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

  const resetActiveConversation = () => {
    if (!activeConversation) {
      return;
    }
    const welcome = defaultWelcomeMessage();
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === activeConversation.id
          ? { ...conversation, messages: [welcome], updatedAt: welcome.timestamp }
          : conversation
      )
    );
  };

  const loadDevices = async () => {
    try {
      const deviceList = await aiAPI.getMyDevices();
      setDevices(deviceList);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    let conversationId = activeConversation?.id ?? null;
    if (!conversationId) {
      const newConversation = createConversation(`Chat ${conversations.length + 1}`);
      conversationId = newConversation.id;
      setConversations((prev) => [newConversation, ...prev]);
      setActiveConversationId(newConversation.id);
    }

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    appendMessageToConversation(conversationId, userMessage);
    setInputMessage('');
    setIsLoading(true);

    try {
      let response;
      if (selectedDevice) {
        response = await aiAPI.analyzeDevice(selectedDevice, inputMessage);
      } else {
        response = await aiAPI.askGeneral(inputMessage);
      }

      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.response,
        timestamp: response.timestamp,
        deviceInfo: response.device_info
      };

      appendMessageToConversation(conversationId, aiMessage);
    } catch (error: any) {
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '❌ Lo siento, hubo un error procesando tu consulta. Por favor intenta de nuevo.',
        timestamp: new Date().toISOString()
      };
      appendMessageToConversation(conversationId, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setConversations((prev) => {
      const newConversation = createConversation(`Chat ${prev.length + 1}`);
      setActiveConversationId(newConversation.id);
      return [newConversation, ...prev];
    });
  };

  const handleDeleteConversation = (conversationId: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((conversation) => conversation.id !== conversationId);
      if (!filtered.length) {
        const fallbackConversation = createConversation('Chat 1');
        setActiveConversationId(fallbackConversation.id);
        return [fallbackConversation];
      }
      if (conversationId === activeConversationId) {
        setActiveConversationId(filtered[0].id);
      }
      return filtered;
    });
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
            <button className="clear-history-btn" onClick={resetActiveConversation} disabled={!activeConversation}>
              🧹 Limpiar conversación
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
                onClick={() => setActiveConversationId(conversation.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    setActiveConversationId(conversation.id);
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
            {isLoading && (
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
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="send-btn"
            >
              {isLoading ? '⏳' : '🚀'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
