import React, { useState, useEffect } from 'react';
import { aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './AIChatMinimal.css';

interface AIMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
}

const defaultWelcomeMessage = (): AIMessage => ({
  id: `welcome_${Date.now()}`,
  type: 'ai',
  content:
    '🌱 ¡Hola! Soy PlantCare AI, tu asistente para el cuidado de plantas. Puedo ayudarte con riego, luz, problemas de hojas y mucho más. ¿Con qué te ayudo hoy?',
  timestamp: new Date().toISOString(),
});

export const AIChatMinimal: React.FC = () => {
  const { user } = useAuth();
  const historyKey = `plantcare_ai_minimal_${user?.id || 'guest'}`;

  const [messages, setMessages] = useState<AIMessage[]>([defaultWelcomeMessage()]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<number | ''>('');
  const [devices, setDevices] = useState<any[]>([]);

  // Cargar historial simple
  useEffect(() => {
    try {
      const stored = localStorage.getItem(historyKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed);
          return;
        }
      }
    } catch (err) {
      console.error('Error cargando historial:', err);
    }
  }, [historyKey]);

  // Guardar historial
  useEffect(() => {
    try {
      localStorage.setItem(historyKey, JSON.stringify(messages));
    } catch (err) {
      console.error('Error guardando historial:', err);
    }
  }, [messages, historyKey]);

  // Cargar dispositivos
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const list = await aiAPI.getMyDevices();
        setDevices(list || []);
      } catch (err) {
        console.error('Error cargando dispositivos:', err);
      }
    };
    loadDevices();
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
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
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Error enviando mensaje:', err);
      const errorMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content:
          '❌ Lo siento, hubo un problema al procesar tu consulta. Intenta de nuevo en unos segundos.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-chat-minimal">
      {/* Selector de dispositivo (opcional, minimalista) */}
      {devices.length > 0 && (
        <div className="ai-minimal-device-selector">
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Consulta general</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Área de mensajes */}
      <div className="ai-minimal-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`ai-minimal-message ai-minimal-message-${msg.type}`}>
            {msg.type === 'ai' && <div className="ai-minimal-avatar">🌱</div>}
            <div className="ai-minimal-bubble">
              <div className="ai-minimal-text">{msg.content}</div>
              <div className="ai-minimal-time">
                {new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="ai-minimal-message ai-minimal-message-ai">
            <div className="ai-minimal-avatar">🌱</div>
            <div className="ai-minimal-bubble">
              <div className="ai-minimal-typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input fijo abajo */}
      <div className="ai-minimal-input-bar">
        <input
          type="text"
          placeholder="¿Con qué te ayudo hoy?"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          disabled={isLoading}
        />
        <button
          className="ai-minimal-send"
          onClick={sendMessage}
          disabled={isLoading || !inputMessage.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  );
};
