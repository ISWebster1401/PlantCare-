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
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://10.20.250.77:8000/api',
};
