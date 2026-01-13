/**
 * Servicio de API para PlantCare Mobile
 * Cliente Axios con interceptores para autenticación JWT
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/Config';
import {
  UserResponse,
  AuthResponse,
  LoginCredentials,
  UserRegistration,
  PlantResponse,
  PlantIdentify,
  SensorResponse,
  SensorReadingResponse,
  NotificationResponse,
  AIResponse,
  AdminStats,
  UserAdminResponse,
  DeviceAdminResponse,
  DeviceCodeBatch,
  DeviceCodeResponse,
  PokedexEntryResponse,
} from '../types';

// Log de configuración de API al iniciar
console.log('🔌 API Configuration:');
console.log('  Base URL:', Config.API_URL);
console.log('  Timeout: 30s');

// Crear instancia de Axios
const api: AxiosInstance = axios.create({
  baseURL: Config.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 segundos
});

// Interceptor de requests - Agrega token automáticamente
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Log para debug (solo en desarrollo)
      if (__DEV__) {
        console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
      }
    } catch (error) {
      console.error('Error obteniendo token:', error);
    }
    return config;
  },
  (error) => {
    console.error('❌ Error en request interceptor:', error);
    return Promise.reject(error);
  }
);

// Interceptor de respuestas - Maneja expiración de tokens
api.interceptors.response.use(
  (response) => {
    // Log para debug (solo en desarrollo)
    if (__DEV__) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error) => {
    // Manejo mejorado de errores de red
    if (!error.response) {
      // Error de red (sin respuesta del servidor)
      const errorMessage = error.message || 'Network Error';
      console.error('❌ Network Error:', {
        message: errorMessage,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
      });
      
      // Mensaje más descriptivo y útil
      const baseURL = error.config?.baseURL || Config.API_URL;
      const networkError: any = new Error(
        `No se pudo conectar al servidor en ${baseURL}`
      );
      networkError.name = 'NetworkError';
      networkError.isNetworkError = true;
      networkError.baseURL = baseURL;
      networkError.originalError = error;
      networkError.userMessage = `No se pudo conectar al servidor.\n\nVerifica que:\n• El backend esté corriendo (docker-compose up)\n• La IP sea correcta: ${baseURL}\n• Estés en la misma red WiFi\n• El firewall no esté bloqueando`;
      
      console.error('❌ Network Error Details:', {
        message: error.message,
        code: error.code,
        baseURL,
        url: error.config?.url,
        method: error.config?.method,
      });
      
      return Promise.reject(networkError);
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expirado o no autorizado: limpiar storage
      try {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
        // No loguear el error aquí, solo limpiar la sesión
        // Los componentes manejarán la redirección
      } catch (e) {
        console.error('Error limpiando storage:', e);
      }
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTH API
// ============================================

export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: UserRegistration): Promise<UserResponse> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getCurrentUser: async (): Promise<UserResponse> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateMe: async (fullName: string): Promise<UserResponse> => {
    const response = await api.put('/auth/me', { full_name: fullName });
    return response.data;
  },

  verifyCode: async (email: string, code: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/verify-code', { email, code });
    return response.data;
  },

  resendCode: async (email: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/resend-code', { email });
    return response.data;
  },

  requestEmailChange: async (newEmail: string): Promise<{ message: string; new_email: string }> => {
    const response = await api.post('/auth/change-email', { new_email: newEmail });
    return response.data;
  },

  confirmEmailChange: async (newEmail: string, code: string): Promise<UserResponse> => {
    const response = await api.post('/auth/confirm-email-change', { new_email: newEmail, code });
    return response.data;
  },

  loginWithGoogle: async (credential: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/google', { credential });
    return response.data;
  },
};

// ============================================
// PLANTS API
// ============================================

export const plantsAPI = {
  getPlantSpecies: async (): Promise<string[]> => {
    const response = await api.get('/plants/species');
    return response.data;
  },

  identifyPlant: async (file: { uri: string; type: string; name: string }, plantSpecies?: string): Promise<PlantIdentify> => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);
    if (plantSpecies) {
      formData.append('plant_species', plantSpecies);
    }

    const response = await api.post('/plants/identify', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  createPlant: async (file: { uri: string; type: string; name: string }, plantName: string, plantSpecies?: string): Promise<PlantResponse> => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);
    formData.append('plant_name', plantName);
    if (plantSpecies) {
      formData.append('plant_species', plantSpecies);
    }

    const response = await api.post('/plants/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getMyPlants: async (): Promise<PlantResponse[]> => {
    const response = await api.get('/plants/');
    return response.data;
  },

  getPlant: async (plantId: number): Promise<PlantResponse> => {
    const response = await api.get(`/plants/${plantId}`);
    return response.data;
  },

  uploadRender: async (plantId: number, file: { uri: string; type: string; name: string }): Promise<{ character_image_url: string }> => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);

    const response = await api.post(`/plants/${plantId}/upload-render`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// ============================================
// POKEDEX API
// ============================================

export const pokedexAPI = {
  scanPokedex: async (file: { uri: string; type: string; name: string }, plantSpecies?: string): Promise<PokedexEntryResponse> => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);
    if (plantSpecies) {
      formData.append('plant_species', plantSpecies);
    }

    const response = await api.post('/plants/pokedex/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getPokedexEntries: async (): Promise<PokedexEntryResponse[]> => {
    const response = await api.get('/plants/pokedex/');
    return response.data;
  },

  getPokedexEntry: async (entryId: number): Promise<PokedexEntryResponse> => {
    const response = await api.get(`/plants/pokedex/${entryId}`);
    return response.data;
  },

  deletePokedexEntry: async (entryId: number): Promise<void> => {
    await api.delete(`/plants/pokedex/${entryId}`);
  },
};

// ============================================
// SENSORS API
// ============================================

export const sensorsAPI = {
  registerSensor: async (deviceId: string, deviceType: string, name: string): Promise<SensorResponse> => {
    const response = await api.post('/sensors/register', {
      device_id: deviceId,
      device_type: deviceType,
      name: name,
    });
    return response.data;
  },

  assignSensor: async (sensorId: string, plantId: number): Promise<{ message: string }> => {
    const response = await api.post(`/sensors/${sensorId}/assign`, {
      plant_id: plantId,
    });
    return response.data;
  },

  getMySensors: async (): Promise<SensorResponse[]> => {
    const response = await api.get('/sensors/');
    return response.data;
  },

  getLatestReading: async (sensorId: string): Promise<SensorReadingResponse> => {
    const response = await api.get(`/sensors/${sensorId}/latest`);
    return response.data;
  },

  getSensorReadings: async (sensorId: string, limit: number = 100): Promise<SensorReadingResponse[]> => {
    const response = await api.get(`/sensors/${sensorId}/readings`, {
      params: { limit },
    });
    return response.data;
  },

  getDailyAverage: async (sensorId: string, date: string): Promise<any> => {
    const response = await api.get(`/sensors/${sensorId}/daily-avg`, {
      params: { date },
    });
    return response.data;
  },

  toggleSensor: async (sensorId: string, status: 'active' | 'inactive' | 'maintenance'): Promise<{ message: string }> => {
    const response = await api.put(`/sensors/${sensorId}/toggle`, null, {
      params: { status },
    });
    return response.data;
  },
};

// ============================================
// NOTIFICATIONS API
// ============================================

export const notificationsAPI = {
  getNotifications: async (unreadOnly: boolean = false): Promise<NotificationResponse[]> => {
    const response = await api.get('/notifications/', {
      params: { unread_only: unreadOnly },
    });
    return response.data;
  },

  markAsRead: async (notificationId: number): Promise<{ message: string }> => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<{ message: string; count: number }> => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },
};

// ============================================
// AI API
// ============================================

export const aiAPI = {
  // Legacy endpoints
  askGeneral: async (question: string): Promise<AIResponse> => {
    const response = await api.post('/ai/ask', { question });
    return response.data;
  },

  analyzeDevice: async (deviceId: number, question?: string): Promise<AIResponse> => {
    const payload: any = { device_id: deviceId };
    if (question) payload.question = question;
    const response = await api.post('/ai/analyze-device', payload);
    return response.data;
  },

  getMyDevices: async (): Promise<any[]> => {
    const response = await api.get('/ai/my-devices');
    return response.data;
  },

  // New endpoints with memory
  chat: async (message: string, conversationId?: number, deviceId?: number): Promise<any> => {
    const response = await api.post('/ai/chat', {
      message,
      conversation_id: conversationId,
      device_id: deviceId,
    });
    return response.data;
  },

  chatStream: async (
    message: string,
    conversationId: number | undefined,
    deviceId: number | undefined,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (error: string) => void
  ): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${Config.API_URL}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
          device_id: deviceId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                onError(data.error);
                return;
              }
              if (data.done) {
                onDone();
                return;
              }
              if (data.content) {
                onChunk(data.content);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error: any) {
      onError(error.message || 'Error en streaming');
    }
  },

  getConversations: async (): Promise<any[]> => {
    const response = await api.get('/ai/conversations');
    return response.data;
  },

  getConversation: async (conversationId: number): Promise<any> => {
    const response = await api.get(`/ai/conversations/${conversationId}`);
    return response.data;
  },

  deleteConversation: async (conversationId: number): Promise<void> => {
    await api.delete(`/ai/conversations/${conversationId}`);
  },
};

// ============================================
// ADMIN API
// ============================================

export const adminAPI = {
  // Obtener estadísticas del sistema
  getStats: async (): Promise<AdminStats> => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // Obtener todos los usuarios
  getUsers: async (): Promise<UserAdminResponse[]> => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  // Obtener usuario por ID
  getUserById: async (userId: number): Promise<UserAdminResponse> => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  // Activar/desactivar usuario
  toggleUserStatus: async (userId: number): Promise<void> => {
    await api.put(`/admin/users/${userId}/toggle-status`);
  },

  // Obtener todos los sensores
  getSensors: async (): Promise<DeviceAdminResponse[]> => {
    const response = await api.get('/admin/sensors');
    return response.data;
  },

  // Obtener sensor por ID
  getSensorById: async (sensorId: string): Promise<DeviceAdminResponse> => {
    const response = await api.get(`/admin/sensors/${sensorId}`);
    return response.data;
  },
};

export default api;
