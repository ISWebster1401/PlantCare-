import Constants from 'expo-constants';

const BACKEND_PORT = 8000;
// Último recurso si no hay override ni se puede derivar el host de Metro.
const FALLBACK_IP = '172.20.10.2';

/**
 * Deriva la IP del backend a partir del host al que Metro ya conectó
 * el teléfono (Constants.expoConfig.hostUri). Como el teléfono necesitó
 * esa IP para cargar el bundle de JS, sabemos que es alcanzable ahora
 * mismo, sin necesidad de actualizar Config.ts cada vez que cambia la red.
 *
 * No aplica en modo túnel (host tipo *.exp.direct / *.ngrok.io), ahí solo
 * el bundler pasa por el túnel, no el backend.
 */
function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  const isLanIp = !!host && /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

  if (isLanIp) {
    return `http://${host}:${BACKEND_PORT}/api`;
  }

  return `http://${FALLBACK_IP}:${BACKEND_PORT}/api`;
}

/**
 * Configuración de la aplicación móvil PlantCare
 *
 * La IP del backend se detecta sola en modo LAN (ver resolveApiUrl).
 * En modo túnel, o si quieres forzar una URL (staging, prod), define
 * EXPO_PUBLIC_API_URL en mobile/.env.
 */
export const Config = {
  API_URL: resolveApiUrl(),

  // Google OAuth Client ID para autenticación
  // Obtén el Client ID desde Google Cloud Console: https://console.cloud.google.com/
  // IMPORTANTE: En Expo, las variables de entorno deben empezar con EXPO_PUBLIC_
  // Si tienes GOOGLE_CLIENT_ID en .env, cámbialo a EXPO_PUBLIC_GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '873045856404-ccvsiag0i9reie03n4ic12pcgs28dq1u.apps.googleusercontent.com'
};
