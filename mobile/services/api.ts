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
} from '../types';

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
    } catch (error) {
      console.error('Error obteniendo token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuestas - Maneja expiración de tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado: limpiar storage
      try {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
        // TODO: Redirigir a login (se manejará en el componente)
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

  verifyCode: async (email: string, code: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/verify-code', { email, code });
    return response.data;
  },

  resendCode: async (email: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/resend-code', { email });
    return response.data;
  },
};

// ============================================
// PLANTS API
// ============================================

export const plantsAPI = {
  identifyPlant: async (file: { uri: string; type: string; name: string }): Promise<PlantIdentify> => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);

    const response = await api.post('/plants/identify', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  createPlant: async (file: { uri: string; type: string; name: string }, plantName: string): Promise<PlantResponse> => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);
    formData.append('plant_name', plantName);

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
};

export default api;
