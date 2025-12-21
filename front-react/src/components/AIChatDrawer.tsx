import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { aiAPI } from '../services/api';
import './AIChatDrawer.css';

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

interface DeviceOption {
  id: number;
  name: string;
  device_code: string;
  plant_type?: string;
}

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultWelcomeMessage = (): AIMessage => ({
  id: `welcome_${Date.now()}`,
  type: 'ai',
  content:
    '🌱 ¡Hola! Soy PlantCare AI, tu asistente para el cuidado de plantas. Puedo ayudarte con riego, luz, problemas de hojas y mucho más. ¿Con qué te ayudo hoy?',
  timestamp: new Date().toISOString(),
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

const formatTime = (iso: string) => {
  try {
    const date = new Date(iso);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const getPreview = (conversation: Conversation) => {
  if (!conversation.messages.length) return 'Conversación vacía';
  const last = conversation.messages[conversation.messages.length - 1];
  const text = last.content.replace(/\s+/g, ' ').trim();
  if (!text) return 'Sin contenido';
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
};

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({ isOpen, onClose }) => {
  const historyKey = useMemo(() => 'plantcare_ai_history', []);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<number | ''>('');

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  // Cargar historial desde localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(historyKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) {
          setConversations(parsed);
          setActiveConversationId(parsed[0].id);
          return;
        }
      }
      const first = createConversation('Chat 1');
      setConversations([first]);
      setActiveConversationId(first.id);
      localStorage.setItem(historyKey, JSON.stringify([first]));
    } catch {
      const first = createConversation('Chat 1');
      setConversations([first]);
      setActiveConversationId(first.id);
    }
  }, [historyKey]);

  // Persistir historial
  useEffect(() => {
    if (!conversations.length) return;
    try {
      localStorage.setItem(historyKey, JSON.stringify(conversations));
    } catch (err) {
      console.error('Error guardando historial de IA:', err);
    }
  }, [conversations, historyKey]);

  // Cargar dispositivos para el dropdown
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const list = await aiAPI.getMyDevices();
        setDevices(list || []);
      } catch (err) {
        console.error('Error cargando dispositivos para IA:', err);
      }
    };
    if (isOpen) loadDevices();
  }, [isOpen]);

  const appendMessage = useCallback((conversationId: string, message: AIMessage) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: [...c.messages, message],
              updatedAt: message.timestamp,
              title:
                message.type === 'user' && c.messages.filter((m) => m.type === 'user').length === 0
                  ? (message.content.trim().slice(0, 40) || c.title)
                  : c.title,
            }
          : c
      )
    );
  }, []);

  const handleNewChat = () => {
    setConversations((prev) => {
      const newConv = createConversation(`Chat ${prev.length + 1}`);
      setActiveConversationId(newConv.id);
      return [newConv, ...prev];
    });
  };

  const handleClearConversation = () => {
    if (!activeConversation) return;
    const welcome = defaultWelcomeMessage();
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, messages: [welcome], updatedAt: welcome.timestamp }
          : c
      )
    );
  };

  const handleDeleteConversation = (conversationId: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== conversationId);
      if (!filtered.length) {
        const first = createConversation('Chat 1');
        setActiveConversationId(first.id);
        return [first];
      }
      if (conversationId === activeConversationId) {
        setActiveConversationId(filtered[0].id);
      }
      return filtered;
    });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    let convId = activeConversation?.id ?? null;
    if (!convId) {
      const newConv = createConversation(`Chat ${conversations.length + 1}`);
      convId = newConv.id;
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
    }

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    appendMessage(convId!, userMsg);
    setInputMessage('');
    setIsLoading(true);

    try {
      let response;
      if (selectedDevice) {
        response = await aiAPI.analyzeDevice(Number(selectedDevice), inputMessage);
      } else {
        response = await aiAPI.askGeneral(inputMessage);
      }

      const aiMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.response,
        timestamp: response.timestamp,
        deviceInfo: response.device_info,
      };

      appendMessage(convId!, aiMsg);
    } catch (err) {
      console.error('Error enviando mensaje a IA:', err);
      const errorMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content:
          '❌ Lo siento, hubo un problema al procesar tu consulta. Intenta de nuevo en unos segundos.',
        timestamp: new Date().toISOString(),
      };
      appendMessage(convId!, errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const activeMessages = activeConversation?.messages ?? [];

  return (
    <div className={`ai-drawer ${isOpen ? 'open' : ''}`}>
      <div className="ai-drawer-header">
        <div className="ai-drawer-title">
          <span className="ai-drawer-icon">🤖</span>
          <div>
            <h2>PlantCare AI Assistant</h2>
            <p>Cuidado inteligente para tus plantas, en tiempo real.</p>
          </div>
        </div>
        <button className="ai-drawer-close" onClick={onClose} aria-label="Cerrar chat">
          ×
        </button>
      </div>

      <div className="ai-drawer-controls">
        <div className="ai-drawer-buttons">
          <button className="btn-primary" onClick={handleNewChat}>
            ➕ Nuevo chat
          </button>
          <button
            className="btn-secondary"
            onClick={handleClearConversation}
            disabled={!activeConversation}
          >
            🧹 Limpiar conversación
          </button>
        </div>
        <div className="ai-drawer-device">
          <label>Dispositivo (opcional):</label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Consulta general</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.device_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ai-drawer-content">
        <aside className="ai-drawer-sidebar">
          <h3>MIS CHATS</h3>
          <div className="ai-conversation-list">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`ai-conversation-item ${
                  conv.id === activeConversationId ? 'active' : ''
                }`}
                onClick={() => setActiveConversationId(conv.id)}
              >
                <div className="ai-conversation-top">
                  <span className="ai-conversation-title">{conv.title}</span>
                  <span className="ai-conversation-time">{formatTime(conv.updatedAt)}</span>
                </div>
                <div className="ai-conversation-preview">{getPreview(conv)}</div>
                <button
                  className="ai-conversation-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conv.id);
                  }}
                  title="Eliminar chat"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="ai-drawer-chat">
          <div className="ai-messages">
            {activeMessages.map((msg) => (
              <div
                key={msg.id}
                className={`ai-message ai-message-${msg.type}`}
              >
                {msg.type === 'ai' && <div className="ai-avatar">🤖</div>}
                <div className="ai-message-bubble">
                  <div className="ai-message-text">{msg.content}</div>
                  {msg.deviceInfo && (
                    <div className="ai-message-device">
                      📡 {msg.deviceInfo.name} ({msg.deviceInfo.plant_type})
                    </div>
                  )}
                  <div className="ai-message-time">
                    {new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="ai-message ai-message-ai">
                <div className="ai-avatar">🤖</div>
                <div className="ai-message-bubble">
                  <div className="ai-typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="ai-input-bar">
            <input
              type="text"
              placeholder="¿Con qué te ayudo hoy?"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isLoading}
            />
            <button
              className="ai-send-btn"
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
            >
              ➤
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AIChatDrawer;
