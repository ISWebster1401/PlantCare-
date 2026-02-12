/**
 * Detección de movimiento del teléfono para el scanner en vivo
 * Usa expo-sensors (Accelerometer) - funciona en Expo Go
 */
import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';

const UPDATE_INTERVAL = 100; // ms
const MOVEMENT_THRESHOLD = 0.05; // Sensibilidad

export interface MotionState {
  /** Magnitud del movimiento reciente (0-1+) */
  intensity: number;
  /** Si el teléfono se está moviendo */
  isMoving: boolean;
}

/**
 * Hook para detectar movimiento del teléfono
 * Más movimiento = mayor intensity (para incrementar progreso del scanner)
 */
export function useMotionDetection(enabled: boolean): MotionState {
  const [state, setState] = useState<MotionState>({ intensity: 0, isMoving: false });
  const historyRef = useRef<number[]>([]);
  const lastRef = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (!enabled) {
      setState({ intensity: 0, isMoving: false });
      return;
    }

    const subscription = Accelerometer.addListener((data) => {
      const { x, y, z } = data;
      const prev = lastRef.current;

      const delta = Math.sqrt(
        Math.pow(x - prev.x, 2) + Math.pow(y - prev.y, 2) + Math.pow(z - prev.z, 2)
      );

      lastRef.current = { x, y, z };

      historyRef.current.push(delta);
      if (historyRef.current.length > 10) {
        historyRef.current.shift();
      }

      const avg = historyRef.current.reduce((a, b) => a + b, 0) / historyRef.current.length;
      const intensity = Math.min(1, avg / MOVEMENT_THRESHOLD);
      const isMoving = avg > MOVEMENT_THRESHOLD;

      setState({ intensity, isMoving });
    });

    Accelerometer.setUpdateInterval(UPDATE_INTERVAL);

    return () => subscription.remove();
  }, [enabled]);

  return state;
}

/**
 * Obtiene un incremento de progreso basado en el movimiento
 * @param intensity 0-1
 * @param deltaMs tiempo desde último update
 * @returns incremento sugerido para progreso (0-1)
 */
export function getProgressIncrementFromMotion(
  intensity: number,
  deltaMs: number
): number {
  const baseSpeed = 0.00015; // progreso por ms con movimiento máximo
  return intensity * baseSpeed * deltaMs;
}
