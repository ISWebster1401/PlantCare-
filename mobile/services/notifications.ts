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
  /** Titulo ya agendado, para no reprogramar si el texto no cambio */
  lastText?: string;
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

/** Lo minimo que necesitamos de una planta para redactar el recordatorio. */
export interface ReminderPlant {
  plant_name: string;
  last_watered: string | null;
}

export interface ReminderText {
  title: string;
  body: string;
}

const GENERIC_TEXT: ReminderText = {
  title: '🌿 Tus plantas te esperan',
  body: 'Riega hoy para no perder tu racha 🔥',
};

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

/**
 * Redacta el recordatorio nombrando a la planta mas sedienta. Un aviso que dice
 * "Pepito lleva 4 dias sin agua" mueve mucho mas que uno generico.
 */
export function buildReminderText(plants: ReminderPlant[]): ReminderText {
  if (!plants.length) return GENERIC_TEXT;

  // Nunca regada pesa mas que cualquier cantidad de dias sin agua
  const nunca = plants.find((p) => !p.last_watered);
  if (nunca) {
    return {
      title: `🌱 ${nunca.plant_name} espera su primer riego`,
      body: 'Riégala hoy y arranca tu racha 🔥',
    };
  }

  let peor: ReminderPlant | null = null;
  let peorDias = -1;
  for (const p of plants) {
    const d = daysSince(p.last_watered);
    if (d !== null && d > peorDias) {
      peorDias = d;
      peor = p;
    }
  }

  if (!peor || peorDias < 2) return GENERIC_TEXT;

  return {
    title: `💧 ${peor.plant_name} lleva ${peorDias} días sin agua`,
    body: 'Riégala hoy para no perder tu racha 🔥',
  };
}

/**
 * Agenda el recordatorio diario. Cancela los anteriores primero para que no se
 * acumulen si el usuario cambia la hora varias veces.
 */
export async function scheduleWateringReminder(
  hour: number,
  minute: number,
  text: ReminderText = GENERIC_TEXT,
): Promise<boolean> {
  const ok = await ensurePermission();
  if (!ok) return false;

  await ensureAndroidChannel();
  await cancelWateringReminder();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: text.title,
      body: text.body,
      data: { type: 'watering_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL_ID,
    },
  });

  await savePrefs({ enabled: true, hour, minute, lastText: text.title });
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
export async function sendTestReminder(
  text: ReminderText = GENERIC_TEXT,
): Promise<boolean> {
  const ok = await ensurePermission();
  if (!ok) return false;
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: text.title,
      body: text.body,
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

/**
 * Vuelve a agendar el recordatorio con el estado actual de las plantas.
 *
 * Una notificación local lleva su texto fijo desde el momento en que se agenda:
 * cuando suena no puede consultar nada. Por eso el texto se refresca cada vez
 * que el usuario abre la app, y así el aviso de mañana ya sabe qué planta está
 * más sedienta. Si el texto no cambió, no se reprograma nada.
 */
export async function refreshReminderContent(plants: ReminderPlant[]): Promise<void> {
  try {
    const prefs = await getPrefs();
    if (!prefs.enabled) return;

    const text = buildReminderText(plants);
    if (text.title === prefs.lastText) return;

    await scheduleWateringReminder(prefs.hour, prefs.minute, text);
  } catch {
    // El recordatorio es accesorio: nunca debe romper la pantalla que lo llama
  }
}
