/**
 * Gestión de sonidos para el scanner PlantCare
 * Usa expo-av para reproducir efectos
 * Si assets/sounds/*.mp3 no existen, funciona en silencio
 */
import { Audio } from 'expo-av';

let beepSound: Audio.Sound | null = null;
let completeSound: Audio.Sound | null = null;
let isPreloaded = false;
let beepInterval: ReturnType<typeof setInterval> | null = null;

const BEEP_INTERVAL_MS = 400;

async function loadSound(module: number | null): Promise<Audio.Sound | null> {
  if (!module) return null;
  try {
    const { sound } = await Audio.Sound.createAsync(module, { shouldPlay: false });
    return sound;
  } catch {
    return null;
  }
}

/**
 * Precarga los sonidos. Llamar al iniciar el scanner.
 */
export async function preloadSounds(): Promise<void> {
  if (isPreloaded) return;

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      interruptionModeAndroid: 2, // DuckOthers
      interruptionModeIOS: 0, // MixWithOthers
    });

    try {
      beepSound = await loadSound(require('../assets/sounds/scanner-beep.mp3'));
      completeSound = await loadSound(require('../assets/sounds/scanner-complete.mp3'));
    } catch {
      // Archivos no encontrados - silencio
    }

    isPreloaded = true;
  } catch (error) {
    console.warn('SoundManager: Error preloading', error);
  }
}

/**
 * Reproduce el beep del scanner (una vez)
 */
export async function playBeep(): Promise<void> {
  try {
    if (beepSound) await beepSound.replayAsync();
  } catch {
    /* silencio */
  }
}

/**
 * Inicia el loop de beeps del scanner
 */
export function startBeepLoop(): void {
  stopBeepLoop();
  playBeep();
  beepInterval = setInterval(playBeep, BEEP_INTERVAL_MS);
}

/**
 * Detiene el loop de beeps
 */
export function stopBeepLoop(): void {
  if (beepInterval) {
    clearInterval(beepInterval);
    beepInterval = null;
  }
}

/**
 * Reproduce el sonido de completado (DING!)
 */
export async function playComplete(): Promise<void> {
  stopBeepLoop();
  try {
    if (completeSound) await completeSound.replayAsync();
  } catch {
    /* silencio */
  }
}

/**
 * Libera recursos
 */
export async function unloadSounds(): Promise<void> {
  stopBeepLoop();
  try {
    if (beepSound) {
      await beepSound.unloadAsync();
      beepSound = null;
    }
    if (completeSound) {
      await completeSound.unloadAsync();
      completeSound = null;
    }
    isPreloaded = false;
  } catch {
    /* ignorar */
  }
}
