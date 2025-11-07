import React, { useState } from 'react';
import { aiAPI } from '../services/api';
import './AIChat.css';

interface AIMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  deviceInfo?: any;
}

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: '¡Hola! Soy PlantCare AI, tu asistente experto en cuidado de plantas. Puedo ayudarte con preguntas generales sobre plantas o analizar datos específicos de tus dispositivos. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [devices, setDevices] = useState<any[]>([]);

  React.useEffect(() => {
    loadDevices();
  }, []);

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

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
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

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '❌ Lo siento, hubo un error procesando tu consulta. Por favor intenta de nuevo.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-chat">
      <div className="chat-header">
        <h2>🤖 PlantCare AI Assistant</h2>
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

      <div className="chat-messages">
        {messages.map((message) => (
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
          placeholder={selectedDevice 
            ? "Pregunta sobre tu dispositivo..." 
            : "Haz una pregunta sobre plantas..."
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
  );
};

export default AIChat;
