import axios from 'axios';
import Cookies from 'js-cookie';
import { UserRegistration, AuthResponse, LoginCredentials, UserResponse } from '../types/User';

/**
 * 🌐 CONFIGURACIÓN DE API CON AUTENTICACIÓN AUTOMÁTICA
 * Interceptores que manejan tokens JWT desde cookies automáticamente
 */

const api = axios.create({
  baseURL: 'http://127.0.0.1:5000/api',
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
    const response = await api.delete(`/devices/${deviceId}/disconnect`);
    return response.data;
  },
};

export const humedadAPI = {
  // Obtener datos de humedad
  getHumedadData: async (deviceId?: number, limit: number = 20) => {
    const params = new URLSearchParams();
    if (deviceId) params.append('device_id', deviceId.toString());
    params.append('limit', limit.toString());
    
    const response = await api.get(`/humedad?${params.toString()}`);
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

export default api;
