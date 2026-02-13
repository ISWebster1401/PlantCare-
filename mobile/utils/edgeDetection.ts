/**
 * Utilidad de detección de bordes para el scanner
 * SIMULADA: dibuja líneas de escaneo animadas sobre la imagen
 * (Edge detection real con Canvas requiere WebView - no compatible con Expo Go)
 *
 * Retorna datos para dibujar el overlay de líneas verdes.
 */
export interface ScanLine {
  id: string;
  y: number; // 0-1, posición vertical
  opacity: number;
  width: number; // grosor relativo
}

/**
 * Genera líneas de escaneo simuladas (patrón horizontal que baja)
 * Usar con ScannerOverlay para el efecto visual
 */
export function generateScanLines(count: number = 12): ScanLine[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `line-${i}`,
    y: i / (count - 1 || 1),
    opacity: 0.4 + (i % 3) * 0.2,
    width: 2 + (i % 2),
  }));
}

/**
 * Genera puntos para efecto de partículas sobre la silueta
 * Simula bordes detectados como puntos brillantes
 */
export function generateEdgePoints(count: number = 80): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const centerX = 0.5;
  const centerY = 0.5;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
    const r = 0.2 + (i % 5) * 0.12 + Math.random() * 0.05;
    points.push({
      x: centerX + Math.cos(angle) * r,
      y: centerY + Math.sin(angle) * r,
    });
  }

  return points;
}
