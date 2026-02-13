# 🌱 Sistema de Scanner PlantCare

## Resumen

Sistema épico de escaneo de plantas con cards 3D flotantes, scanner en vivo con cámara, y scanner de galería. Todo compatible con **Expo Go**.

## Flow

```
name → selection → (live-scanner | gallery-scanner) → identifying → results → creating → created
```

## Archivos creados

### Componentes
- **`components/scanner/ScannerSelection.tsx`** - Cards 3D apiladas (Scanner vs Galería)
- **`components/scanner/LiveScanner.tsx`** - Cámara en vivo + animación + detección de movimiento
- **`components/scanner/GalleryScanner.tsx`** - Foto estática + animación de escaneo
- **`components/scanner/ScannerOverlay.tsx`** - Marco y líneas verdes de escaneo
- **`components/scanner/ScannerProgress.tsx`** - Barra de progreso
- **`components/scanner/ScannerEffects.tsx`** - Partículas y glow

### Utilidades
- **`utils/soundManager.ts`** - Gestión de sonidos (beep, complete)
- **`utils/motionDetection.ts`** - Detección de movimiento del teléfono (expo-sensors)
- **`utils/edgeDetection.ts`** - Datos para overlay (simulado)

### Sonidos
- **`assets/sounds/scanner-beep.mp3`** - Beep repetitivo (ya incluido)
- **`assets/sounds/scanner-complete.mp3`** - Ding de completado (ya incluido)
- Ver **`assets/sounds/README.md`** para reemplazar con sonidos personalizados

## Dependencias agregadas

- **expo-sensors** - Para detección de movimiento (acelerómetro)

## Uso

1. El usuario ingresa nombre y especie en el paso `name`
2. En `selection` elige "Escanear Planta" (cámara) o "Subir Foto" (galería)
3. **Scanner en vivo**: toma foto secretamente, muestra animación de escaneo, el progreso avanza con el movimiento del teléfono
4. **Scanner galería**: tras elegir foto, animación automática ~3 segundos
5. Continúa al flujo existente de identificación → resultados → crear

## Personalización

- **Colores**: Usa `Colors` y `Gradients` del DesignSystem
- **Duración del scan**: `DURATION_MS` en GalleryScanner, `SCAN_DURATION_MS` en LiveScanner
- **Sensibilidad de movimiento**: `MOVEMENT_THRESHOLD` en motionDetection.ts
