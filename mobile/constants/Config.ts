/**
 * Configuración de la aplicación móvil PlantCare
 */
export const Config = {
  // Para dispositivo físico, usa tu IP local (no localhost)
  // Para simulador iOS, puedes usar 'http://localhost:8000/api'
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://10.20.252.184:8000/api',
};
