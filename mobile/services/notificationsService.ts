/**
 * Servicio para manejar notificaciones push
 * Registra permisos y obtiene tokens de Expo
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurar cómo se manejan las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,    // ✅ Agregado
    shouldShowList: true,      // ✅ Agregado
  }),
});

/**
 * Registra permisos para notificaciones push
 * Retorna true si los permisos fueron otorgados, false en caso contrario
 */
export async function registerForPushNotificationsAsync(): Promise<boolean> {
  try {
    // Solicitar permisos
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Si no hay permisos, solicitarlos
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Si los permisos fueron denegados, retornar false
    if (finalStatus !== 'granted') {
      console.warn('Permisos de notificaciones denegados');
      return false;
    }

    // Configuraciones adicionales para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4caf50',
      });
    }

    return true;
  } catch (error) {
    console.error('Error registrando permisos de notificaciones:', error);
    return false;
  }
}

/**
 * Obtiene el token de Expo Push Notifications
 * Retorna el token como string o null si hay error
 */
export async function getExpoPushTokenAsync(): Promise<string | null> {
  try {
    // Verificar permisos primero
    const hasPermissions = await registerForPushNotificationsAsync();
    if (!hasPermissions) {
      return null;
    }

    // Obtener el token
    // En Expo Go, projectId puede no estar disponible, manejar error silenciosamente
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;
      
      // Guardar el token en AsyncStorage para uso posterior
      await AsyncStorage.setItem('expo_push_token', token);
      
      return token;
    } catch (tokenError: any) {
      // En Expo Go, el error de projectId es esperado, no mostrar error
      if (tokenError?.message?.includes('projectId')) {
        // Expo Go no soporta push notifications completamente, solo mostrar warning
        return null;
      }
      throw tokenError; // Re-lanzar otros errores
    }
  } catch (error) {
    // Solo loggear errores que no sean de projectId
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes('projectId')) {
      console.error('Error obteniendo token de push:', error);
    }
    return null;
  }
}

/**
 * Obtiene el token guardado de AsyncStorage
 */
export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('expo_push_token');
  } catch (error) {
    console.error('Error obteniendo token guardado:', error);
    return null;
  }
}

/**
 * Limpia el token guardado (útil para logout)
 */
export async function clearStoredPushToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem('expo_push_token');
  } catch (error) {
    console.error('Error limpiando token:', error);
  }
}