/**
 * Consentimiento para enviar datos a un servicio de IA de terceros.
 *
 * Apple (guía 5.1.2(i)) exige avisar con claridad y pedir permiso explícito
 * antes de compartir datos personales con una IA externa. Las fotos, los
 * mensajes del chat y el audio de la llamada se procesan con OpenAI, así que se
 * pregunta una sola vez, antes del primer uso de cualquiera de esas funciones.
 */
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ai_consent_v1';

export async function ensureAIConsent(): Promise<boolean> {
  try {
    if ((await AsyncStorage.getItem(KEY)) === 'granted') return true;
  } catch {
    // Si no se puede leer, se vuelve a preguntar.
  }

  return new Promise((resolve) => {
    Alert.alert(
      'Uso de inteligencia artificial',
      'Para identificar tu planta y conversar con ella, PlantCare envía la foto, ' +
        'tus mensajes y el audio de la llamada a OpenAI, un servicio de IA de ' +
        'terceros, que los procesa para generar la respuesta. No se usan para ' +
        'publicidad. Puedes ver el detalle en la Política de privacidad ' +
        '(Perfil → Configuración).\n\n¿Permites este uso?',
      [
        { text: 'No permitir', style: 'cancel', onPress: () => resolve(false) },
        {
          text: 'Permitir',
          onPress: async () => {
            try {
              await AsyncStorage.setItem(KEY, 'granted');
            } catch {
              // Sin persistencia solo se volverá a preguntar la próxima vez.
            }
            resolve(true);
          },
        },
      ],
      { cancelable: false },
    );
  });
}
