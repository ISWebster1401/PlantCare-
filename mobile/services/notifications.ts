/**
 * Recordatorios de riego (notificaciones LOCALES).
 *
 * Se usan locales a propósito: las push remotas ya no funcionan en Expo Go
 * (removidas en SDK 53) y además un recordatorio diario no necesita servidor —
 * lo agenda el propio teléfono y funciona sin internet.
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'watering_reminder';
const CHANNEL_ID = 'riego';

export interface ReminderPrefs {
  enabled: boolean;
  hour: number;
  minute: number;
}

export const DEFAULT_PREFS: ReminderPrefs = { enabled: false, hour: 9, minute: 0 };

/** Muestra la notificación aunque la app esté abierta. Llamar una vez al inicio. */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      // Compatibilidad con versiones previas del SDK
      shouldShowAlert: true,
    }),
  });
}

/** Pide permiso solo si aún no lo tenemos. Devuelve si quedó concedido. */
export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

async function ensureAndroidChannel() {
  if (Notifications.setNotificationChannelAsync) {
    try {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Recordatorios de riego',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    } catch {
      // En iOS no existen los canales; ignorar
    }
  }
}

export async function getPrefs(): Promise<ReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

async function savePrefs(prefs: ReminderPrefs) {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

/**
 * Agenda el recordatorio diario. Cancela los anteriores primero para que no se
 * acumulen si el usuario cambia la hora varias veces.
 */
export async function scheduleWateringReminder(
  hour: number,
  minute: number,
): Promise<boolean> {
  const ok = await ensurePermission();
  if (!ok) return false;

  await ensureAndroidChannel();
  await cancelWateringReminder();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌿 Tus plantas te esperan',
      body: 'Riega hoy para no perder tu racha 🔥',
      data: { type: 'watering_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL_ID,
    },
  });

  await savePrefs({ enabled: true, hour, minute });
  return true;
}

export async function cancelWateringReminder() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content?.data?.type === 'watering_reminder') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
  const prefs = await getPrefs();
  await savePrefs({ ...prefs, enabled: false });
}

/**
 * Notificación de prueba a los 5 segundos: sirve para demostrar que funciona
 * sin esperar hasta la hora agendada.
 */
export async function sendTestReminder(): Promise<boolean> {
  const ok = await ensurePermission();
  if (!ok) return false;
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌿 Tus plantas te esperan',
      body: 'Riega hoy para no perder tu racha 🔥',
      data: { type: 'watering_reminder_test' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });
  return true;
}
