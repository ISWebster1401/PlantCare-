import axios from 'axios';
import Cookies from 'js-cookie';
import { UserRegistration, AuthResponse, LoginCredentials, UserResponse } from '../types/User';

/**
 * 🌐 CONFIGURACIÓN DE API CON AUTENTICACIÓN AUTOMÁTICA
 * Interceptores que manejan tokens JWT desde cookies automáticamente
 */

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔄 INTERCEPTOR DE REQUESTS - AGREGA TOKEN AUTOMÁTICAMENTE
api.interceptors.request.use(
  (config) => {
    // Busca token en cookies y lo agrega al header Authorization
    const token = Cookies.get('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🛡️ INTERCEPTOR DE RESPUESTAS - MANEJA EXPIRACIÓN DE TOKENS
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado: limpia cookies y redirige
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
      Cookies.remove('user_data');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  // Registro de usuario
  register: async (userData: UserRegistration): Promise<UserResponse> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Login de usuario
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Login con Google
  loginWithGoogle: async (credential: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/google', { credential });
    return response.data;
  },

  // Obtener información del usuario actual
  getCurrentUser: async (): Promise<UserResponse> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Refrescar token
  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },

  // Reenviar verificación de correo
  resendCode: async (email: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/resend-code', { email });
    return response.data;
  },

  // Verificar código de 4 dígitos
  verifyCode: async (email: string, code: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/verify-code', { email, code });
    return response.data;
  },
};

export const deviceAPI = {
  // Conectar dispositivo
  connectDevice: async (deviceData: { device_code: string; name: string; location?: string; plant_type?: string }) => {
    const response = await api.post('/devices/connect', deviceData);
    return response.data;
  },

  // Obtener mis dispositivos
  getMyDevices: async () => {
    const response = await api.get('/devices/my-devices');
    return response.data;
  },

  // Obtener estadísticas de dispositivo
  getDeviceStats: async (deviceId: number) => {
    const response = await api.get(`/devices/${deviceId}/stats`);
    return response.data;
  },

  // Actualizar dispositivo
  updateDevice: async (deviceId: number, data: { name?: string; location?: string; plant_type?: string }) => {
    const response = await api.put(`/devices/${deviceId}`, data);
    return response.data;
  },

  // Desconectar dispositivo
  disconnectDevice: async (deviceId: number) => {
    const response = await api.delete(`/devices/${deviceId}`);
    return response.data;
  },
};

export const humedadAPI = {
  // Obtener datos de humedad
  getHumedadData: async (deviceCode: string, limit: number = 20) => {
    const response = await api.get('/lector-humedad', {
      headers: {
        'X-Device-Code': deviceCode
      },
      params: { limit }
    });
    return response.data;
  },

  // Obtener análisis de IA (legacy - mantenido por compatibilidad)
  getAIAnalysis: async (deviceId: number, question?: string) => {
    const response = await api.get(`/humedad/analisis-ia/${deviceId}`, {
      params: { pregunta: question }
    });
    return response.data;
  },

  // Obtener recomendaciones de IA (legacy - mantenido por compatibilidad)
  getAIRecommendations: async (deviceId: number) => {
    const response = await api.get(`/humedad/recomendaciones-ia/${deviceId}`);
    return response.data;
  },

  // Obtener alertas inteligentes
  getSmartAlerts: async (deviceId: number) => {
    const response = await api.get(`/humedad/alertas-inteligentes/${deviceId}`);
    return response.data;
  },
};

export const quotesAPI = {
  // Obtener mis cotizaciones
  getMyQuotes: async () => {
    const response = await api.get('/quotes/my-quotes');
    return response.data;
  },

  // Crear nueva cotización
  createQuote: async (quoteData: any) => {
    const response = await api.post('/quotes', quoteData);
    return response.data;
  },
};

export const aiAPI = {
  // Hacer pregunta general sobre plantas
  askGeneral: async (question: string) => {
    const response = await api.post('/ai/ask', { question });
    return response.data;
  },

  // Analizar dispositivo específico
  analyzeDevice: async (deviceId: number, question?: string) => {
    const payload: any = { device_id: deviceId };
    if (question) payload.question = question;
    
    const response = await api.post('/ai/analyze-device', payload);
    return response.data;
  },

  // Obtener dispositivos disponibles para IA
  getMyDevices: async () => {
    const response = await api.get('/ai/my-devices');
    return response.data;
  },

  // Health check del servicio de IA
  healthCheck: async () => {
    const response = await api.get('/ai/health');
    return response.data;
  },
};

export const healthAPI = {
  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export const plantsAPI = {
  // Identificar planta con imagen
  identifyPlant: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/plants/identify', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Generar personaje
  generateCharacter: async (plantType: string, plantName: string, mood: string = 'happy') => {
    const response = await api.post('/plants/generate-character', {
      plant_type: plantType,
      plant_name: plantName,
      mood
    });
    return response.data;
  },

  // Crear planta completa
  createPlant: async (file: File, plantName: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('plant_name', plantName);
    const response = await api.post('/plants/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Listar plantas del usuario
  getMyPlants: async () => {
    const response = await api.get('/plants/');
    return response.data;
  },

  // Obtener detalle de planta
  getPlant: async (plantId: number) => {
    const response = await api.get(`/plants/${plantId}`);
    return response.data;
  },

  // Actualizar salud de planta
  updatePlantHealth: async (plantId: number) => {
    const response = await api.put(`/plants/${plantId}/health`);
    return response.data;
  },

  // Actualizar planta
  updatePlant: async (plantId: number, data: { plant_name?: string; last_watered?: string }) => {
    const response = await api.put(`/plants/${plantId}`, data);
    return response.data;
  },
};

// ============================================
// ADMIN API
// ============================================

export const adminAPI = {
  // Obtener estadísticas del sistema
  getStats: async (): Promise<any> => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // Obtener todos los usuarios
  getUsers: async (): Promise<any[]> => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  // Obtener usuario por ID
  getUserById: async (userId: number): Promise<any> => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  // Activar/desactivar usuario
  toggleUserStatus: async (userId: number): Promise<void> => {
    await api.put(`/admin/users/${userId}/toggle-status`);
  },

  // Obtener todos los sensores
  getSensors: async (): Promise<any[]> => {
    const response = await api.get('/admin/sensors');
    return response.data;
  },

  // Obtener sensor por ID
  getSensorById: async (sensorId: string): Promise<any> => {
    const response = await api.get(`/admin/sensors/${sensorId}`);
    return response.data;
  },

  // Obtener todas las plantas
  getPlants: async (): Promise<any[]> => {
    const response = await api.get('/admin/plants');
    return response.data;
  },

  // Obtener planta por ID
  getPlantById: async (plantId: number): Promise<any> => {
    const response = await api.get(`/admin/plants/${plantId}`);
    return response.data;
  },

  // Eliminar planta
  deletePlant: async (plantId: number): Promise<void> => {
    await api.delete(`/admin/plants/${plantId}`);
  },
};

export const sensorsAPI = {
  // Registrar nuevo sensor
  registerSensor: async (deviceKey: string, deviceType: string = 'esp8266') => {
    const response = await api.post('/sensors/register', {
      device_key: deviceKey,
      device_type: deviceType
    });
    return response.data;
  },

  // Asignar sensor a planta
  assignSensor: async (sensorId: number, plantId: number) => {
    const response = await api.post(`/sensors/${sensorId}/assign`, {
      plant_id: plantId
    });
    return response.data;
  },

  // Listar sensores del usuario
  getMySensors: async () => {
    const response = await api.get('/sensors/');
    return response.data;
  },

  // Activar/Desactivar sensor
  toggleSensor: async (sensorId: number, isActive: boolean) => {
    const response = await api.put(`/sensors/${sensorId}/toggle?is_active=${isActive}`);
    return response.data;
  },

  // Obtener lecturas de un sensor
  getSensorReadings: async (sensorId: number, limit: number = 100) => {
    const response = await api.get(`/sensors/${sensorId}/readings`, {
      params: { limit }
    });
    return response.data;
  },
};

export const notificationsAPI = {
  // Listar notificaciones
  getNotifications: async (unreadOnly: boolean = false) => {
    const response = await api.get('/notifications/', {
      params: { unread_only: unreadOnly }
    });
    return response.data;
  },

  // Marcar notificación como leída
  markAsRead: async (notificationId: number) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  // Marcar todas como leídas
  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },
};

export default api;
