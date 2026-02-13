/**
 * Context de autenticación para PlantCare Mobile
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
import { UserResponse, LoginCredentials, UserRegistration, AuthResponse } from '../types';
import { registerForPushNotificationsAsync, getExpoPushTokenAsync } from '../services/notificationsService';

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (userData: UserRegistration) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar sesión al iniciar
  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const [storedToken, storedUser] = await AsyncStorage.multiGet([
        'access_token',
        'user_data',
      ]);

      if (storedToken[1] && storedUser[1]) {
        setToken(storedToken[1]);
        setUser(JSON.parse(storedUser[1]));
        
        // Registrar permisos de notificaciones si el usuario ya está autenticado
        registerForPushNotificationsAsync().then((hasPermissions) => {
          if (hasPermissions) {
            getExpoPushTokenAsync().then((token) => {
              if (token) {
                console.log('Token de push notificaciones obtenido:', token);
              }
            });
          }
        });
      } else {
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Error cargando sesión:', error);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const persistSession = async (response: AuthResponse, rememberMe: boolean = false) => {
    try {
      await AsyncStorage.multiSet([
        ['access_token', response.access_token],
        ['refresh_token', response.refresh_token],
        ['user_data', JSON.stringify(response.user)],
      ]);

      setUser(response.user);
      setToken(response.access_token);

      // Registrar permisos de notificaciones después de login exitoso
      registerForPushNotificationsAsync().then((hasPermissions) => {
        if (hasPermissions) {
          getExpoPushTokenAsync().then((token) => {
            if (token) {
              console.log('Token de push notificaciones obtenido:', token);
              // El token se guarda automáticamente en AsyncStorage por getExpoPushTokenAsync
            }
          });
        }
      });
    } catch (error) {
      console.error('Error guardando sesión:', error);
      throw error;
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authAPI.login(credentials);
      await persistSession(response, credentials.remember_me || false);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al iniciar sesión');
    }
  };

  const loginWithGoogle = async (credential: string) => {
    try {
      const response = await authAPI.loginWithGoogle(credential);
      await persistSession(response, false);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al iniciar sesión con Google');
    }
  };

  const register = async (userData: UserRegistration) => {
    try {
      await authAPI.register(userData);
      // Después del registro, el usuario debe verificar su email
      // No iniciamos sesión automáticamente
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al registrar usuario');
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const updatedUser = await authAPI.getCurrentUser();
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      // Si falla, podría ser que el token expiró, así que limpiar sesión
      await logout();
    }
  };

  // Verificar periódicamente si el token sigue existiendo (por si fue limpiado por el interceptor)
  useEffect(() => {
    if (!isLoading && (user || token)) {
      const checkToken = async () => {
        try {
          const storedToken = await AsyncStorage.getItem('access_token');
          if (!storedToken && (user || token)) {
            // Token fue eliminado (probablemente por el interceptor de axios)
            setUser(null);
            setToken(null);
          }
        } catch (error) {
          // Ignorar errores de verificación
        }
      };
      
      // Verificar cada 1 segundo si hay token (solo cuando está autenticado)
      const interval = setInterval(checkToken, 1000);
      return () => clearInterval(interval);
    }
  }, [isLoading, user, token]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    loginWithGoogle,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
