# 🎬 Explicación: Animaciones de Modelos 3D

## 📚 Conceptos Básicos

### 1. **¿Dónde viven las animaciones?**

Las animaciones **vienen embebidas dentro del archivo 3D mismo** (`.glb` o `.fbx`). NO necesitas archivos separados para animaciones.

- **Formato .glb** (recomendado): Es un formato binario que incluye:
  - Geometría (mesh, vértices)
  - Texturas
  - Materiales
  - **Animaciones** (todas en el mismo archivo)
  - Esqueleto (bones/skeleton) para animaciones

- **Ejemplo:** `cactus_default.glb` contiene:
  - El modelo 3D del cactus
  - Animación "idle" (movimiento suave, respiración)
  - Animación "happy" (más movimiento, alegre)
  - Animación "sad" (caído, triste)
  - Animación "sick" (poco movimiento, enfermo)
  - Animación "watering" (cuando se riega)

### 2. **¿Cómo se controlan las animaciones?**

El **backend NO reproduce animaciones**. El backend solo:
- Almacena la URL del modelo 3D (`model_3d_url`)
- Almacena el estado de la planta (`character_mood`, `health_status`)
- Proporciona esta información al cliente (frontend/mobile)

El **cliente (frontend/mobile) es quien**:
- Descarga el modelo 3D desde la URL
- Carga las animaciones del modelo
- **Reproduce la animación correcta** según el `character_mood` de la planta

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                     │
├─────────────────────────────────────────────────────────┤
│  • Almacena URL del modelo 3D (model_3d_url)           │
│  • Almacena estado de planta (character_mood)          │
│  • Proporciona API: GET /api/plants/{id}               │
│  • Respuesta incluye:                                   │
│    - model_3d_url: "https://.../cactus_default.glb"    │
│    - character_mood: "happy"                           │
│    - health_status: "healthy"                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ HTTP Request
                   │
┌──────────────────▼──────────────────────────────────────┐
│              CLIENTE (Frontend/Mobile)                  │
├─────────────────────────────────────────────────────────┤
│  1. Descarga modelo 3D desde model_3d_url              │
│  2. Carga modelo con biblioteca 3D (Three.js, etc.)    │
│  3. Extrae animaciones del modelo                      │
│  4. Lee character_mood de la respuesta                 │
│  5. Reproduce animación correspondiente:               │
│     - "happy" → Animación "happy" del modelo           │
│     - "sad" → Animación "sad" del modelo               │
│     - "sick" → Animación "sick" del modelo             │
└─────────────────────────────────────────────────────────┘
```

## 🎯 Flujo Completo

### Paso 1: Crear el Modelo 3D con Animaciones

Cuando crees el modelo 3D (en Blender, Maya, etc.):

1. **Crea el modelo base** (el cactus, monstera, etc.)
2. **Agrega animaciones nombradas:**
   - `idle` - Animación por defecto (respiración suave)
   - `happy` - Estado feliz (movimiento más activo)
   - `sad` - Estado triste (caído, lento)
   - `sick` - Estado enfermo (poco movimiento)
   - `watering` - Cuando se riega (animación de crecimiento/felicidad)
   - `growing` - Crecimiento (opcional)

3. **Exporta a .glb** con todas las animaciones incluidas

### Paso 2: Subir el Modelo a Supabase Storage

```bash
# Subir a Supabase Storage
cactus_default.glb → Supabase Storage → URL pública
# Ejemplo: https://xxxxx.supabase.co/storage/v1/object/public/plantcare/models/cactus_default.glb
```

### Paso 3: Guardar en Base de Datos

El backend ya guarda la URL en `plant_models.model_3d_url`:

```sql
INSERT INTO plant_models (plant_type, name, model_3d_url, ...)
VALUES ('Cactus', 'Cactus Default', 'https://.../cactus_default.glb', ...);
```

### Paso 4: Cliente Carga y Anima

**En el Frontend/Mobile:**

```javascript
// Pseudocódigo (con Three.js o React Three Fiber)
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// 1. Cargar modelo
const loader = new GLTFLoader();
const gltf = await loader.load(plant.model_3d_url);

// 2. Obtener animaciones del modelo
const animations = gltf.animations; // Array de animaciones

// 3. Mapear character_mood a nombre de animación
const animationMap = {
  'happy': 'happy',
  'sad': 'sad',
  'sick': 'sick',
  'thirsty': 'sad',
  'healthy': 'idle'
};

// 4. Reproducir animación según character_mood
const animationName = animationMap[plant.character_mood] || 'idle';
const animation = animations.find(anim => anim.name === animationName);

// 5. Reproducir
mixer.clipAction(animation).play();
```

## 📊 Estructura de Datos Actual

### Base de Datos

```sql
-- Tabla plant_models (ya existe)
plant_models:
  - id
  - plant_type: "Cactus"
  - name: "Cactus Default"
  - model_3d_url: "https://.../cactus_default.glb"  ← URL del modelo con animaciones
  - default_render_url: "https://.../cactus_render.jpg"  ← Imagen estática 2D
  - metadata: {"category": "succulent", "scale": 1.0}  ← Puedes agregar info de animaciones aquí

-- Tabla plants (ya existe)
plants:
  - character_mood: "happy" | "sad" | "sick" | "thirsty"  ← Estado que determina animación
  - health_status: "healthy" | "warning" | "critical"
```

### Respuesta de API (PlantResponse)

```json
{
  "id": 1,
  "plant_name": "Mi Cactus",
  "plant_type": "Cactus",
  "character_mood": "happy",  ← El cliente usa esto para seleccionar animación
  "health_status": "healthy",
  "assigned_model_id": 1,
  "model_3d_url": "https://.../cactus_default.glb"  ← El cliente carga este modelo
}
```

## 🔧 Posibles Mejoras al Sistema

### Opción 1: Metadata con Mapeo de Animaciones

Puedes agregar información de animaciones en el campo `metadata` de `plant_models`:

```json
{
  "category": "succulent",
  "scale": 1.0,
  "animations": {
    "idle": "Idle",
    "happy": "Happy",
    "sad": "Sad",
    "sick": "Sick",
    "watering": "Watering"
  }
}
```

### Opción 2: Campo Adicional para Animaciones

Agregar un campo JSONB específico para animaciones:

```sql
ALTER TABLE plant_models 
ADD COLUMN animations JSONB DEFAULT '{"idle": "Idle", "happy": "Happy", "sad": "Sad"}'::jsonb;
```

### Opción 3: Tabla Separada (Más Complejo)

Crear tabla `model_animations` para gestionar animaciones por modelo (probablemente overkill para este caso).

## 📱 Implementación en Mobile (React Native)

Para mostrar modelos 3D animados en React Native, necesitas:

1. **Biblioteca 3D:**
   - `expo-gl` + `expo-three` (para Three.js)
   - O `react-native-3d` (alternativa)
   - O `@react-three/fiber` + `@react-three/drei` (React Three Fiber para RN)

2. **Ejemplo básico:**

```typescript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useFrame } from '@react-three/fiber';

function PlantModel({ modelUrl, mood }) {
  const [gltf, setGltf] = useState(null);
  const mixerRef = useRef(null);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(modelUrl, (loadedGltf) => {
      setGltf(loadedGltf);
      mixerRef.current = new THREE.AnimationMixer(loadedGltf.scene);
    });
  }, [modelUrl]);

  useEffect(() => {
    if (!gltf || !mixerRef.current) return;
    
    const animationMap = {
      happy: 'Happy',
      sad: 'Sad',
      sick: 'Sick',
    };
    
    const animationName = animationMap[mood] || 'Idle';
    const animation = gltf.animations.find(anim => anim.name === animationName);
    
    if (animation) {
      mixerRef.current.clipAction(animation).play();
    }
  }, [mood, gltf]);

  useFrame((state, delta) => {
    mixerRef.current?.update(delta);
  });

  return gltf ? <primitive object={gltf.scene} /> : null;
}
```

## 🌐 Implementación en Frontend Web

Para el frontend web (React), es más simple:

```typescript
import { useGLTF, useAnimations } from '@react-three/drei';

function PlantModel({ modelUrl, mood }) {
  const { scene, animations } = useGLTF(modelUrl);
  const { actions } = useAnimations(animations, scene);

  useEffect(() => {
    const animationMap = {
      happy: 'Happy',
      sad: 'Sad',
      sick: 'Sick',
    };
    
    const animationName = animationMap[mood] || 'Idle';
    if (actions[animationName]) {
      actions[animationName].play();
    }
  }, [mood, actions]);

  return <primitive object={scene} />;
}
```

## ✅ Resumen

1. **Las animaciones viven dentro del archivo .glb** - No necesitas archivos separados
2. **El backend solo almacena URLs y estados** - No reproduce animaciones
3. **El cliente (frontend/mobile) reproduce las animaciones** según el `character_mood`
4. **El sistema actual ya está preparado** - Solo necesitas:
   - Crear modelos 3D con animaciones nombradas
   - Subirlos a Supabase Storage
   - Implementar el reproductor 3D en el cliente
   - Mapear `character_mood` → nombre de animación

## 🎨 Convención de Nombres de Animaciones

Para mantener consistencia, usa estos nombres:

- `Idle` - Por defecto (respiración suave)
- `Happy` - Estado feliz (mood: "happy", health: "healthy")
- `Sad` - Estado triste (mood: "sad" o "thirsty")
- `Sick` - Estado enfermo (mood: "sick", health: "warning"/"critical")
- `Watering` - Cuando se riega (opcional, trigger especial)
- `Growing` - Crecimiento (opcional)

El sistema actual de `character_mood` ya proporciona los estados necesarios para controlar las animaciones.
