/**
 * Configuración de la aplicación móvil PlantCare
 * 
 * IMPORTANTE: Si cambias de red WiFi, actualiza esta IP.
 * Para obtener tu IP: ipconfig getifaddr en0 (macOS)
 */
export const Config = {
  // Para dispositivo físico, usa tu IP local (no localhost)
  // Para simulador iOS, puedes usar 'http://localhost:8000/api'
  // Backend Docker está en puerto 8000
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.184:8000/api',
  
  // Google OAuth Client ID para autenticación
  // Obtén el Client ID desde Google Cloud Console: https://console.cloud.google.com/
  // IMPORTANTE: En Expo, las variables de entorno deben empezar con EXPO_PUBLIC_
  // Si tienes GOOGLE_CLIENT_ID en .env, cámbialo a EXPO_PUBLIC_GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '873045856404-ccvsiag0i9reie03n4ic12pcgs28dq1u.apps.googleusercontent.com'
};
