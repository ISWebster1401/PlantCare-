import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { UserResponse, LoginCredentials, UserRegistration, AuthResponse } from '../types/User';
import { authAPI } from '../services/api';

/**
 * 🔐 CONTEXTO DE AUTENTICACIÓN - PERSISTENCIA CON COOKIES
 * Maneja el estado global de autenticación usando cookies seguras
 */
interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (userData: UserRegistration) => Promise<UserResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
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

  // 🔄 RESTAURACIÓN AUTOMÁTICA DE SESIÓN AL CARGAR LA APP
  useEffect(() => {
    // Busca tokens guardados en cookies del navegador
    const savedToken = Cookies.get('access_token');
    const userData = Cookies.get('user_data');

    if (savedToken && userData) {
      try {
        // Restaura la sesión sin necesidad de login
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setToken(savedToken);
        console.log('✅ Sesión restaurada para:', parsedUser.email);
      } catch (error) {
        // Limpia cookies corruptas
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        Cookies.remove('user_data');
      }
    }
    setIsLoading(false);
  }, []);

  const persistSession = (response: AuthResponse, rememberMe: boolean = false) => {
    // Si remember_me está activado, cookies duran 30 días, sino 7 días
    const cookieExpires = rememberMe ? 30 : 7;
    
    const cookieOptions = {
      expires: cookieExpires,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
    };

    Cookies.set('access_token', response.access_token, cookieOptions);
    Cookies.set('refresh_token', response.refresh_token, cookieOptions);
    Cookies.set('user_data', JSON.stringify(response.user), cookieOptions);

    setUser(response.user);
    setToken(response.access_token);
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authAPI.login(credentials);
      persistSession(response, credentials.remember_me || false);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al iniciar sesión');
    }
  };

  const loginWithGoogle = async (credential: string) => {
    try {
      const response = await authAPI.loginWithGoogle(credential);
      persistSession(response);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al iniciar sesión con Google');
    }
  };

  const register = async (userData: UserRegistration): Promise<UserResponse> => {
    try {
      const response = await authAPI.register(userData);
      // Redirigir a verificación por código inmediatamente
      const emailParam = encodeURIComponent(userData.email);
      const url = `/?verify=code&email=${emailParam}`;
      if (typeof window !== 'undefined') {
        window.location.href = url; // navegación explícita asegura render inmediato
      }
      return response;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.response?.data?.detail || 'Error al registrar usuario');
    }
  };

  const logout = () => {
    // 🧹 LIMPIAR TODAS LAS COOKIES - ELIMINA LA PERSISTENCIA
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    Cookies.remove('user_data');
    setUser(null);
    setToken(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
