# 📚 Documentación Completa del Proyecto PlantCare

## 🎯 1. RESUMEN COMPLETO DEL PROYECTO

### ¿Qué es PlantCare?

PlantCare es una plataforma IoT gamificada para el cuidado personal de plantas. Los usuarios pueden:
- 📸 Subir fotos de plantas y obtener identificación automática con IA
- 🌱 Crear un "jardín digital" con sus plantas
- 📊 Conectar sensores IoT (ESP8266/ESP32) para monitorear humedad y temperatura
- 🤖 Recibir recomendaciones de cuidado de un asistente de IA
- 🎮 Ganar logros y mantener plantas saludables
- 📱 Ver sus plantas desde cualquier dispositivo

### Arquitectura General

```
Frontend (React/TypeScript) 
    ↓ HTTP/REST API
Backend (FastAPI/Python)
    ↓
├── PostgreSQL (Base de datos)
├── Supabase Storage (Almacenamiento de imágenes)
├── OpenAI GPT-4o Vision (Identificación de plantas)
└── SendGrid (Emails)
```

### Stack Tecnológico

**Backend:**
- **Framework:** FastAPI (Python 3.9+)
- **Base de Datos:** PostgreSQL (usando `pgdbtoolkit` para ORM)
- **Autenticación:** JWT (JSON Web Tokens) con bcrypt
- **Almacenamiento:** Supabase Storage (antes Cloudinary, ahora migrado)
- **IA:** OpenAI GPT-4o Vision para identificación de plantas
- **Emails:** SendGrid
- **OAuth:** Google Sign-In (opcional)

**Frontend (Web):**
- **Framework:** React 19 con TypeScript
- **Routing:** react-router-dom
- **HTTP Client:** Axios
- **Estado:** React Context API
- **Estilos:** CSS Modules

**IoT:**
- **Dispositivos:** ESP8266/ESP32
- **Protocolo:** HTTP REST API
- **Datos:** Humedad del suelo, temperatura

### Flujo Principal de Usuario

1. **Registro/Login:**
   - Usuario se registra con email, contraseña y nombre completo
   - Recibe código de verificación por email
   - Verifica email con código de 4 dígitos
   - Recibe JWT token (1 hora o 1 mes si "Recordarme" activado)

2. **Agregar Planta:**
   - Usuario sube foto de su planta (JPEG/JPG/PNG)
   - IA identifica la planta usando GPT-4o Vision
   - Sistema guarda información (tipo, cuidados, rangos óptimos)
   - Usuario da nombre a la planta
   - Planta se guarda en "Tu Jardín" (character_image_url se sube manualmente después como render 3D)

3. **Conectar Sensor:**
   - Usuario registra sensor con `device_key` único
   - Asigna sensor a una planta existente de su jardín
   - Sensor envía datos periódicamente (humedad, temperatura)
   - Sistema actualiza estado de salud de la planta

4. **Monitoreo:**
   - Dashboard muestra gráficos de humedad/temperatura
   - Notificaciones cuando planta necesita agua
   - IA Chat para consultas sobre cuidado

### Estados de la Planta

Las plantas tienen estados que se actualizan automáticamente según datos de sensores:

- **health_status:** `healthy` | `warning` | `critical`
- **character_mood:** `happy` | `sad` | `thirsty` | `overwatered` | `sick`

El sistema calcula estos estados comparando lecturas actuales con rangos óptimos de la planta.

---

## 🔌 2. DOCUMENTACIÓN COMPLETA DE LA API

### Base URL
```
http://127.0.0.1:8000/api  (desarrollo)
https://tu-dominio.com/api  (producción)
```

### Autenticación

Todas las rutas protegidas requieren token JWT en el header:
```
Authorization: Bearer <access_token>
```

### Estructura de Respuestas

**Éxito:**
```json
{
  "id": 1,
  "data": {...}
}
```

**Error:**
```json
{
  "detail": "Mensaje de error descriptivo"
}
```

### ENDPOINTS DETALLADOS

---

## 🔐 AUTENTICACIÓN (`/api/auth`)

### POST `/api/auth/register`
Registra un nuevo usuario.

**Request Body:**
```json
{
  "full_name": "Sebastian Vargas",
  "email": "seba@example.com",
  "password": "Password123!",
  "confirm_password": "Password123!"
}
```

**Validaciones:**
- Email único
- Password mínimo 8 caracteres
- Password debe tener: mayúscula, minúscula, número, carácter especial
- `confirm_password` debe coincidir con `password`

**Response (201):**
```json
{
  "id": 1,
  "full_name": "Sebastian Vargas",
  "email": "seba@example.com",
  "role": "user",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00"
}
```

**Errores:**
- `400`: Email ya registrado, contraseñas no coinciden, validación fallida
- `500`: Error interno

**Notas:**
- Envía código de verificación por email automáticamente
- Usuario queda con `is_verified=false` hasta verificar email

---

### POST `/api/auth/login`
Inicia sesión y obtiene token JWT.

**Request Body:**
```json
{
  "email": "seba@example.com",
  "password": "Password123!",
  "remember_me": false  // opcional, default: false
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,  // segundos (3600 = 1 hora, o 2592000 = 30 días si remember_me=true)
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "full_name": "Sebastian Vargas",
    "email": "seba@example.com",
    "role": "user",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00"
  }
}
```

**Duración del token:**
- Sin `remember_me`: 1 hora (3600 segundos)
- Con `remember_me=true`: 30 días (2592000 segundos)

**Errores:**
- `401`: Email o contraseña incorrectos
- `400`: Usuario inactivo

---

### POST `/api/auth/google`
Inicia sesión con Google OAuth.

**Request Body:**
```json
{
  "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2Mz..."
}
```

**Response:** Igual que `/login`

**Notas:**
- `credential` es el ID token de Google Identity Services
- Si el usuario no existe, se crea automáticamente
- Si `GOOGLE_ALLOWED_DOMAINS` está configurado, valida dominio

---

### POST `/api/auth/verify-code`
Verifica email con código de 4 dígitos.

**Request Body:**
```json
{
  "email": "seba@example.com",
  "code": "1234"
}
```

**Response (200):**
```json
{
  "message": "Email verificado exitosamente"
}
```

**Errores:**
- `400`: Código inválido o expirado
- `404`: Email no encontrado

**Notas:**
- Código expira en 1 hora
- Solo puede usarse una vez

---

### POST `/api/auth/resend-code`
Reenvía código de verificación.

**Request Body:**
```json
{
  "email": "seba@example.com"
}
```

**Response (200):**
```json
{
  "message": "Código reenviado exitosamente"
}
```

---

### POST `/api/auth/refresh`
Refresca access token usando refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** Igual que `/login` (nuevo access_token y refresh_token)

---

### GET `/api/auth/me`
Obtiene información del usuario actual (requiere autenticación).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": 1,
  "full_name": "Sebastian Vargas",
  "email": "seba@example.com",
  "role": "user",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-16T12:00:00"
}
```

---

### PUT `/api/auth/me`
Actualiza perfil del usuario actual.

**Request Body:**
```json
{
  "full_name": "Sebastian I. Vargas"  // opcional
}
```

**Response:** UserResponse actualizado

---

### POST `/api/auth/change-password`
Cambia contraseña del usuario actual.

**Request Body:**
```json
{
  "current_password": "Password123!",
  "new_password": "NewPassword456!",
  "confirm_new_password": "NewPassword456!"
}
```

**Validaciones:** Igual que registro (mayúscula, minúscula, número, carácter especial)

---

### DELETE `/api/auth/me`
Elimina cuenta del usuario actual (soft delete, marca como inactivo).

**Response (200):**
```json
{
  "message": "Cuenta eliminada exitosamente"
}
```

---

### POST `/api/auth/logout`
Cierra sesión (invalida refresh token).

**Response (200):**
```json
{
  "message": "Sesión cerrada exitosamente"
}
```

---

## 🌱 PLANTAS (`/api/plants`)

### POST `/api/plants/identify`
Identifica una planta usando IA (GPT-4o Vision).

**Request:** `multipart/form-data`
```
file: <imagen JPEG/JPG/PNG>
```

**Response (200):**
```json
{
  "plant_type": "Monstera Deliciosa",
  "scientific_name": "Monstera deliciosa",
  "care_level": "Fácil",
  "care_tips": "Riega cuando el suelo esté seco; Mantén en lugar con luz indirecta; Limpia hojas regularmente",
  "optimal_humidity_min": 40.0,
  "optimal_humidity_max": 70.0,
  "optimal_temp_min": 18.0,
  "optimal_temp_max": 25.0
}
```

**Validaciones:**
- Solo acepta JPEG, JPG, PNG
- Validación por extensión y content-type

**Notas:**
- Sube imagen a Supabase Storage primero
- Luego llama a GPT-4o Vision con la URL
- Costo aproximado: ~$0.01-0.02 por identificación

---

### POST `/api/plants/`
Crea una nueva planta completa.

**Request:** `multipart/form-data`
```
file: <imagen JPEG/JPG/PNG>
plant_name: "Pepito"
```

**Flujo:**
1. Valida y sube imagen a Supabase Storage
2. Identifica planta con GPT-4o Vision
3. Guarda en DB con `character_image_url = null` (se sube manualmente después)

**Response (201):**
```json
{
  "id": 1,
  "user_id": 1,
  "sensor_id": null,
  "plant_name": "Pepito",
  "plant_type": "Monstera Deliciosa",
  "scientific_name": "Monstera deliciosa",
  "care_level": "Fácil",
  "care_tips": "Riega cuando el suelo esté seco...",
  "original_photo_url": "https://xxxxx.supabase.co/storage/v1/object/public/plantcare/plants/original/...",
  "character_image_url": null,  // Se sube manualmente después
  "character_personality": "Aventurero",
  "character_mood": "happy",
  "health_status": "healthy",
  "last_watered": null,
  "optimal_humidity_min": 40.0,
  "optimal_humidity_max": 70.0,
  "optimal_temp_min": 18.0,
  "optimal_temp_max": 25.0,
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00"
}
```

---

### GET `/api/plants/`
Lista todas las plantas del usuario actual.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
[
  {
    "id": 1,
    "plant_name": "Pepito",
    "plant_type": "Monstera Deliciosa",
    "character_mood": "happy",
    "health_status": "healthy",
    ...
  },
  ...
]
```

**Orden:** Por `created_at DESC` (más recientes primero)

---

### GET `/api/plants/{plant_id}`
Obtiene detalle de una planta específica.

**Response (200):** PlantResponse completo

**Errores:**
- `404`: Planta no encontrada o no pertenece al usuario

---

### POST `/api/plants/{plant_id}/upload-render`
Sube el render del modelo 3D de la planta (manual).

**Request:** `multipart/form-data`
```
file: <imagen JPEG/JPG/PNG del render 3D>
```

**Response (200):**
```json
{
  "message": "Render del modelo 3D subido exitosamente",
  "character_image_url": "https://xxxxx.supabase.co/storage/v1/object/public/plantcare/plants/renders/...",
  "plant_id": 1
}
```

**Notas:**
- Este endpoint se usa DESPUÉS de crear la planta
- El render 3D se crea manualmente (Blender, etc.)
- Actualiza `character_image_url` en la DB

---

### POST `/api/plants/{plant_id}/add-accessory`
Agrega accesorio al render del personaje (chupaya, gorro navideño, etc.).

**Request:** `application/x-www-form-urlencoded`
```
accessory_type: "chupaya"  // o "christmas_hat", "party_hat", "crown", "sunglasses"
```

**Response (200):**
```json
{
  "message": "Accesorio 'Chupaya' agregado exitosamente",
  "character_image_url": "https://xxxxx.supabase.co/storage/v1/object/public/plantcare/plants/characters/customized/...",
  "accessory_type": "chupaya"
}
```

**Accesorios disponibles:**
- `chupaya`: Sombrero tradicional chileno (solo septiembre - Fiestas Patrias)
- `christmas_hat`: Gorro navideño (solo diciembre)
- `party_hat`: Gorro de fiesta (solo enero - Año Nuevo)
- `crown`: Corona (todo el año)
- `sunglasses`: Anteojos de sol (todo el año)

**Notas:**
- Requiere que la planta tenga `character_image_url` (render 3D subido)
- Usa PIL/Pillow para superponer el accesorio sobre el render
- Guarda resultado en Supabase Storage

---

### GET `/api/plants/accessories`
Lista accesorios disponibles según temporada.

**Response (200):**
```json
{
  "accessories": [
    {
      "id": "crown",
      "name": "Corona",
      "description": "Corona dorada",
      "seasonal": false
    },
    {
      "id": "chupaya",
      "name": "Chupaya",
      "description": "Sombrero tradicional chileno",
      "seasonal": true  // Solo disponible en septiembre
    }
  ],
  "current_month": 12
}
```

---

## 📡 SENSORES (`/api/sensors`)

### POST `/api/sensors/register`
Registra un nuevo sensor IoT.

**Request Body:**
```json
{
  "device_key": "ESP8266_ABC123",
  "device_type": "esp8266"  // o "esp32"
}
```

**Response (201):**
```json
{
  "id": 1,
  "user_id": 1,
  "device_key": "ESP8266_ABC123",
  "device_type": "esp8266",
  "is_active": false,
  "is_assigned": false,
  "last_connection": null,
  "created_at": "2024-01-15T10:30:00"
}
```

**Estado inicial:**
- `is_active`: false
- `is_assigned`: false

**Notas:**
- `device_key` debe ser único en todo el sistema
- Si ya existe, retorna error 400

---

### POST `/api/sensors/{sensor_id}/assign`
Asigna un sensor a una planta existente.

**Request Body:**
```json
{
  "plant_id": 1
}
```

**Response (200):**
```json
{
  "message": "Sensor asignado exitosamente a la planta",
  "sensor_id": 1,
  "plant_id": 1
}
```

**Efectos:**
- Actualiza `sensors.is_assigned = true`
- Actualiza `plants.sensor_id = sensor_id`
- Si el sensor ya estaba asignado a otra planta, la desasigna primero

---

### POST `/api/sensors/data`
Recibe datos de un sensor (llamado por el dispositivo IoT).

**Request Body:**
```json
{
  "device_key": "ESP8266_ABC123",
  "humidity": 45.5,
  "temperature": 22.3,
  "pressure": 1013.25  // opcional, si el sensor tiene BMP180
}
```

**Response (200):**
```json
{
  "message": "Datos recibidos exitosamente",
  "reading_id": 123
}
```

**Flujo:**
1. Busca sensor por `device_key`
2. Verifica que está activo y asignado a una planta
3. Guarda lectura en `sensor_readings`
4. Actualiza `sensors.last_connection = NOW()`
5. (Opcional) Actualiza estado de salud de la planta

**Notas:**
- Este endpoint NO requiere autenticación (se llama desde el dispositivo)
- Solo requiere `device_key` válido
- Actualiza última conexión del sensor

---

### GET `/api/sensors/`
Lista todos los sensores del usuario actual.

**Response (200):**
```json
[
  {
    "id": 1,
    "device_key": "ESP8266_ABC123",
    "device_type": "esp8266",
    "is_active": true,
    "is_assigned": true,
    "plant_id": 1,
    "plant_name": "Pepito",
    "last_connection": "2024-01-15T14:30:00"
  },
  ...
]
```

---

### PUT `/api/sensors/{sensor_id}/toggle`
Activa o desactiva un sensor.

**Query Parameters:**
```
is_active=true  // o false
```

**Response (200):**
```json
{
  "message": "Sensor activado exitosamente",
  "sensor_id": 1,
  "is_active": true
}
```

---

### GET `/api/sensors/{sensor_id}/readings`
Obtiene lecturas de un sensor específico.

**Query Parameters:**
```
limit=100  // opcional, default: 100
```

**Response (200):**
```json
[
  {
    "id": 1,
    "sensor_id": 1,
    "plant_id": 1,
    "humidity": 45.5,
    "temperature": 22.3,
    "pressure": 1013.25,
    "reading_time": "2024-01-15T14:30:00"
  },
  ...
]
```

**Orden:** Por `reading_time DESC` (más recientes primero)

---

## 🤖 INTELIGENCIA ARTIFICIAL (`/api/ai`)

### POST `/api/ai/ask`
Hace una pregunta general sobre cuidado de plantas.

**Request Body:**
```json
{
  "question": "¿Cada cuánto debo regar una suculenta?"
}
```

**Response (200):**
```json
{
  "question": "¿Cada cuánto debo regar una suculenta?",
  "response": "Las suculentas necesitan riego cada 10-14 días...",
  "context_type": "general",
  "device_info": null,
  "sensor_data": null,
  "tokens_used": {
    "prompt_tokens": 150,
    "completion_tokens": 200,
    "total_tokens": 350
  },
  "timestamp": "2024-01-15T14:30:00"
}
```

**Notas:**
- Usa GPT-4o para responder
- Incluye contexto del perfil del usuario
- Costo aproximado: ~$0.01-0.03 por consulta

---

### POST `/api/ai/analyze-device`
Analiza datos de un sensor/planta específica del usuario.

**Request Body:**
```json
{
  "device_id": 1,  // ID del sensor
  "question": "¿Mi planta necesita agua?"  // opcional
}
```

**Response (200):**
```json
{
  "question": "¿Mi planta necesita agua?",
  "response": "Según los datos de tu sensor, la humedad está en 25%...",
  "context_type": "device_specific",
  "device_info": {
    "sensor_id": 1,
    "plant_id": 1,
    "plant_name": "Pepito",
    "plant_type": "Monstera Deliciosa"
  },
  "sensor_data": {
    "last_humidity": 25.5,
    "last_temperature": 22.3,
    "optimal_humidity_min": 40.0,
    "optimal_humidity_max": 70.0
  },
  "tokens_used": {...},
  "timestamp": "2024-01-15T14:30:00"
}
```

**Notas:**
- Obtiene últimas lecturas del sensor
- Compara con rangos óptimos de la planta
- Da recomendaciones específicas basadas en datos reales

---

### GET `/api/ai/my-devices`
Lista sensores/plantas del usuario para usar con IA.

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Pepito",
    "type": "plant",
    "plant_type": "Monstera Deliciosa"
  },
  {
    "id": 2,
    "name": "ESP8266_ABC123",
    "type": "sensor",
    "device_type": "esp8266"
  }
]
```

---

### GET `/api/ai/health`
Verifica estado del servicio de IA.

**Response (200):**
```json
{
  "status": "healthy",
  "openai_configured": true,
  "model": "gpt-4o"
}
```

---

## 🔔 NOTIFICACIONES (`/api/notifications`)

### GET `/api/notifications/`
Lista notificaciones del usuario.

**Query Parameters:**
```
unread_only=false  // opcional, default: false
```

**Response (200):**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "plant_id": 1,
    "notification_type": "water_needed",
    "message": "¡Pepito necesita agua! La humedad está en 20%",
    "is_read": false,
    "sent_via_email": false,
    "created_at": "2024-01-15T14:30:00"
  },
  ...
]
```

**Tipos de notificación:**
- `water_needed`: Planta necesita agua
- `health_warning`: Estado de salud crítico
- `achievement`: Logro desbloqueado

---

### PUT `/api/notifications/{notification_id}/read`
Marca una notificación como leída.

**Response (200):**
```json
{
  "message": "Notificación marcada como leída",
  "notification_id": 1
}
```

---

### PUT `/api/notifications/read-all`
Marca todas las notificaciones como leídas.

**Response (200):**
```json
{
  "message": "Todas las notificaciones marcadas como leídas",
  "count": 5
}
```

---

## 📊 OTROS ENDPOINTS

### Dispositivos (Legacy - `/api/devices`)
Mantenido por compatibilidad, pero se recomienda usar `/api/sensors`.

### Humedad (Legacy - `/api/humedad`)
Endpoints antiguos mantenidos por compatibilidad con dispositivos existentes.

### Admin (`/api/admin/*`)
Endpoints para administradores (gestión de usuarios, estadísticas, etc.).

### Contacto (`/api/contact/*`)
Formulario de contacto y soporte.

### Uploads (`/api/uploads/*`)
Subida de avatares de usuario.

---

## 🏗️ 3. ARQUITECTURA Y DECISIONES TÉCNICAS

### Estructura del Backend

```
back/
├── app/
│   ├── api/
│   │   ├── core/           # Módulos core (config, auth, database, etc.)
│   │   ├── routes/         # Endpoints organizados por dominio
│   │   └── schemas/        # Modelos Pydantic (validación)
│   ├── db/
│   │   └── queries.py      # Funciones de acceso a datos
│   └── main.py             # Punto de entrada FastAPI
├── requirements.txt        # Dependencias Python
└── env.example            # Variables de entorno
```

### Módulos Core

#### `config.py`
- Gestiona todas las variables de entorno
- Valida configuración al startup
- Usa `pydantic-settings` para type safety

#### `database.py`
- Inicializa conexión a PostgreSQL usando `pgdbtoolkit`
- Crea tablas automáticamente si no existen (migrations)
- Maneja pool de conexiones

#### `auth_user.py`
- `AuthService`: Lógica de autenticación (hash, verify, tokens)
- `get_current_user`: Dependency que valida JWT
- `get_current_active_user`: Valida que usuario esté activo

#### `openai_config.py`
- `identify_plant_with_vision()`: Usa GPT-4o Vision para identificar plantas
- Maneja validación de API key
- Parsea respuesta JSON de OpenAI

#### `supabase_storage.py`
- `upload_image()`: Sube imágenes binarias a Supabase
- `upload_image_from_url()`: Descarga y sube desde URL
- `delete_image()`: Elimina imágenes
- `get_public_url()`: Genera URLs públicas

#### `email_service.py`
- Envía emails usando SendGrid
- Templates HTML para verificación de email

### Base de Datos (PostgreSQL)

#### Esquema V2 - Tablas Principales

**users:**
```sql
id, email, hashed_password, full_name, role_id, is_active, is_verified, created_at, updated_at
```

**roles:**
```sql
id, name, description, permissions (JSONB), created_at
```
- `1`: user (rol por defecto)
- `2`: admin

**plants:**
```sql
id, user_id, sensor_id, plant_name, plant_type, scientific_name, care_level, care_tips,
original_photo_url, character_image_url, character_personality, character_mood, health_status,
last_watered, optimal_humidity_min, optimal_humidity_max, optimal_temp_min, optimal_temp_max,
created_at, updated_at
```

**sensors:**
```sql
id, user_id, device_key (UNIQUE), device_type, is_active, is_assigned, last_connection,
created_at, updated_at
```

**sensor_readings:**
```sql
id, sensor_id, plant_id, humidity, temperature, pressure, reading_time
```

**notifications:**
```sql
id, user_id, plant_id, notification_type, message, is_read, sent_via_email, created_at
```

**achievements:**
```sql
id, name, description, icon_url, points, requirement_type, requirement_value
```

**user_achievements:**
```sql
id, user_id, achievement_id, earned_at
UNIQUE(user_id, achievement_id)
```

#### Uso de pgdbtoolkit

**Patrón de uso:**
```python
# Obtener conexión
db: AsyncPgDbToolkit = Depends(get_db)

# Consultas
result = await db.execute_query(
    "SELECT * FROM plants WHERE user_id = %s",
    (user_id,)
)

# Insertar
await db.insert_records("plants", plant_dict)

# Actualizar (usamos execute_query porque update_records tiene problemas en async)
await db.execute_query(
    "UPDATE plants SET health_status = %s WHERE id = %s",
    ("healthy", plant_id)
)
```

**Nota importante:** Para operaciones UPDATE, usamos `execute_query` con SQL directo porque `update_records` no está disponible en `AsyncPgDbToolkit`.

### Autenticación JWT

**Flujo:**
1. Usuario hace login → Backend valida credenciales
2. Backend genera 2 tokens:
   - `access_token`: Corta duración (1 hora o 30 días si remember_me)
   - `refresh_token`: Larga duración (7 días)
3. Frontend guarda tokens en cookies (web) o AsyncStorage (móvil)
4. Cada request incluye `Authorization: Bearer <access_token>`
5. Si access_token expira, usar refresh_token para obtener nuevo access_token

**Implementación:**
- Algoritmo: HS256
- Secret key: Desde `SECRET_KEY` en .env
- Payload: `{"sub": email, "user_id": id, "exp": timestamp}`

### Almacenamiento de Imágenes

**Migración a Supabase Storage:**

**Antes (Cloudinary):**
- Transformaciones automáticas
- CDN global
- Más caro

**Ahora (Supabase Storage):**
- Gratis hasta 1GB
- URLs públicas si bucket es público
- Sin transformaciones automáticas (procesar antes con PIL)

**Estructura en Supabase:**
```
plantcare/
├── plants/
│   ├── original/          # Fotos originales subidas por usuarios
│   ├── renders/           # Renders de modelos 3D (subidos manualmente)
│   └── characters/        # Personajes (deprecated, ahora se usan renders)
├── accessories/           # Accesorios PNG con transparencia
└── avatars/               # Avatares de usuarios
```

### IA - Identificación de Plantas

**Flujo:**
1. Usuario sube foto → Validación (JPEG/JPG/PNG)
2. Sube a Supabase Storage → Obtiene URL pública
3. Llama a GPT-4o Vision con URL de imagen
4. GPT-4o analiza y devuelve JSON con:
   - `plant_type`: Nombre común
   - `scientific_name`: Nombre científico
   - `care_level`: Fácil/Medio/Difícil
   - `care_tips`: Tips de cuidado
   - Rangos óptimos (humedad, temperatura)

**Prompt dinámico:**
El sistema tiene una base de datos de características por tipo de planta. Si encuentra la planta en la BD, usa características específicas. Si no, usa descripción genérica.

**Plantas conocidas:**
- Manto de Eva
- Monstera/Monstera Deliciosa
- Cactus
- Suculenta
- Helecho
- Pothos

Fácil de extender agregando más plantas en `gemini_config.py` → `get_plant_characteristics()`.

**Costo:** ~$0.01-0.02 por identificación

### Modelos 3D y Renders

**Flujo actual:**
1. Usuario crea planta → `character_image_url = null`
2. (Manual) Usuario crea modelo 3D en Blender/otros
3. (Manual) Usuario renderiza modelo 3D
4. (Manual) Usuario sube render con `/api/plants/{id}/upload-render`
5. Sistema actualiza `character_image_url` con URL del render

**Notas:**
- La generación automática de imágenes con DALL-E/Gemini fue eliminada
- Los renders se crean y suben manualmente
- Los usuarios ven el render del modelo 3D, no una imagen generada

### Personalización de Personajes

**Sistema de accesorios:**
- Los accesorios son imágenes PNG con transparencia
- Se almacenan en Supabase: `plantcare/accessories/`
- Se superponen sobre el render 3D usando PIL/Pillow
- Accesorios temporales (chupaya solo en septiembre, etc.)

**Funcionamiento:**
1. Usuario selecciona accesorio
2. Backend descarga render base y accesorio
3. PIL superpone accesorio sobre render (posición y escala configurables)
4. Guarda resultado en Supabase
5. Actualiza `character_image_url` en DB

### Cálculo de Salud y Estado de Ánimo

**Función:** `calculate_plant_mood_and_health()` en `plants.py`

**Lógica:**
1. Obtiene últimas lecturas del sensor
2. Compara con rangos óptimos de la planta:
   - Humedad actual vs `optimal_humidity_min/max`
   - Temperatura actual vs `optimal_temp_min/max`
3. Determina:
   - `health_status`: healthy / warning / critical
   - `character_mood`: happy / sad / thirsty / overwatered / sick
   - `needs_water`: true/false
   - `message`: Mensaje del personaje (ej: "¡Tengo sed! 💧")

**Rangos:**
- Humedad < optimal_min: `thirsty`
- Humedad > optimal_max: `overwatered`
- Temperatura fuera de rango: `sick`
- Todo en rango: `happy`

### Variables de Entorno

**Críticas (requeridas):**
- `SECRET_KEY`: Para JWT (debe ser segura)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`: PostgreSQL
- `OPENAI_API_KEY`: Para identificación de plantas
- `SUPABASE_URL`, `SUPABASE_KEY`: Para almacenamiento
- `SENDGRID_API_KEY`: Para emails

**Opcionales:**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth
- `GOOGLE_APPLICATION_CREDENTIALS`: Para Google Imagen (no usado actualmente)

### Manejo de Errores

**Estrategia:**
- Todas las excepciones se logean con contexto
- Errores HTTP claros y descriptivos
- Validación con Pydantic en schemas
- Try-catch en endpoints para manejar errores inesperados

**Códigos HTTP comunes:**
- `200`: Éxito
- `201`: Creado
- `400`: Error de validación/datos inválidos
- `401`: No autorizado (token inválido/expirado)
- `404`: Recurso no encontrado
- `422`: Error de validación Pydantic
- `500`: Error interno del servidor

### Logging

**Configuración:**
- Archivo: `plantcare.log` (rotating, 10MB, 5 backups)
- Nivel: INFO en producción, DEBUG en desarrollo
- Formato: `%(asctime)s - %(name)s - %(levelname)s - %(message)s`

**Qué se logea:**
- Requests HTTP (método, path, status, duración)
- Errores con stack trace completo
- Operaciones importantes (crear planta, conectar sensor, etc.)
- Estado de servicios (DB, Supabase, OpenAI)

---

## 📡 4. ENDPOINTS Y CÓMO USARLOS

### Configuración Base

**Base URL (desarrollo):**
```
http://127.0.0.1:8000/api
```

**Headers necesarios:**
```javascript
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"  // Para rutas protegidas
}
```

### Ejemplos de Uso Completos

#### 1. Registro y Login

```javascript
// 1. Registrar usuario
const registerResponse = await fetch('http://127.0.0.1:8000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    full_name: "Sebastian Vargas",
    email: "seba@example.com",
    password: "Password123!",
    confirm_password: "Password123!"
  })
});
const user = await registerResponse.json();

// 2. Verificar email (código recibido por email)
await fetch('http://127.0.0.1:8000/api/auth/verify-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "seba@example.com",
    code: "1234"
  })
});

// 3. Login
const loginResponse = await fetch('http://127.0.0.1:8000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: "seba@example.com",
    password: "Password123!",
    remember_me: true  // Token válido por 30 días
  })
});
const { access_token, refresh_token, user } = await loginResponse.json();

// 4. Guardar token (ejemplo para móvil con AsyncStorage)
await AsyncStorage.setItem('access_token', access_token);
```

#### 2. Crear Planta Completa

```javascript
// 1. Identificar planta primero (opcional, para mostrar info antes de crear)
const formData = new FormData();
formData.append('file', imageFile);  // File object de la imagen

const identifyResponse = await fetch('http://127.0.0.1:8000/api/plants/identify', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`
    // NO incluir 'Content-Type', el navegador lo agrega automáticamente con boundary
  },
  body: formData
});
const plantInfo = await identifyResponse.json();
// plantInfo contiene: plant_type, scientific_name, care_tips, rangos óptimos

// 2. Crear planta (con nombre que el usuario eligió)
const createFormData = new FormData();
createFormData.append('file', imageFile);
createFormData.append('plant_name', 'Pepito');

const createResponse = await fetch('http://127.0.0.1:8000/api/plants/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`
  },
  body: createFormData
});
const newPlant = await createResponse.json();
// newPlant tiene character_image_url = null (se sube después manualmente)
```

#### 3. Subir Render del Modelo 3D

```javascript
// DESPUÉS de crear la planta, subir el render 3D
const renderFormData = new FormData();
renderFormData.append('file', render3DFile);  // Render del modelo 3D

const uploadResponse = await fetch(`http://127.0.0.1:8000/api/plants/${plantId}/upload-render`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`
  },
  body: renderFormData
});
const { character_image_url } = await uploadResponse.json();
// Ahora la planta tiene su render 3D asignado
```

#### 4. Registrar y Conectar Sensor

```javascript
// 1. Registrar sensor
const sensorResponse = await fetch('http://127.0.0.1:8000/api/sensors/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`
  },
  body: JSON.stringify({
    device_key: "ESP8266_ABC123",
    device_type: "esp8266"
  })
});
const sensor = await sensorResponse.json();

// 2. Asignar sensor a una planta existente
await fetch(`http://127.0.0.1:8000/api/sensors/${sensor.id}/assign`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`
  },
  body: JSON.stringify({
    plant_id: 1  // ID de la planta
  })
});
```

#### 5. Enviar Datos desde Dispositivo IoT (ESP8266)

```cpp
// Código para ESP8266/ESP32
#include <WiFi.h>
#include <HTTPClient.h>

void sendSensorData(String deviceKey, float humidity, float temperature) {
  HTTPClient http;
  http.begin("http://tu-backend.com/api/sensors/data");
  http.addHeader("Content-Type", "application/json");
  
  String jsonData = "{\"device_key\":\"" + deviceKey + "\",";
  jsonData += "\"humidity\":" + String(humidity) + ",";
  jsonData += "\"temperature\":" + String(temperature) + "}";
  
  int httpResponseCode = http.POST(jsonData);
  
  if (httpResponseCode == 200) {
    Serial.println("Datos enviados exitosamente");
  } else {
    Serial.println("Error: " + String(httpResponseCode));
  }
  
  http.end();
}
```

#### 6. Obtener Plantas del Usuario

```javascript
const plantsResponse = await fetch('http://127.0.0.1:8000/api/plants/', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});
const plants = await plantsResponse.json();

// plants es un array de PlantResponse
plants.forEach(plant => {
  console.log(`${plant.plant_name} (${plant.plant_type}) - ${plant.character_mood}`);
  if (plant.character_image_url) {
    // Mostrar render 3D
  } else {
    // Mostrar placeholder "Render pendiente"
  }
});
```

#### 7. Consultar IA sobre una Planta

```javascript
// Consulta general
const aiResponse = await fetch('http://127.0.0.1:8000/api/ai/ask', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`
  },
  body: JSON.stringify({
    question: "¿Cada cuánto debo regar una suculenta?"
  })
});
const aiData = await aiResponse.json();
console.log(aiData.response);  // Respuesta de la IA

// Consulta específica sobre un sensor/planta
const analyzeResponse = await fetch('http://127.0.0.1:8000/api/ai/analyze-device', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`
  },
  body: JSON.stringify({
    device_id: 1,  // ID del sensor
    question: "¿Mi planta necesita agua ahora?"
  })
});
const analysis = await analyzeResponse.json();
// analysis contiene respuesta + datos del sensor + comparación con rangos óptimos
```

#### 8. Agregar Accesorio a Planta

```javascript
// Primero verificar accesorios disponibles
const accessoriesResponse = await fetch('http://127.0.0.1:8000/api/plants/accessories', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});
const { accessories } = await accessoriesResponse.json();

// Agregar accesorio (ej: chupaya en septiembre)
const formData = new FormData();
formData.append('accessory_type', 'chupaya');

const addAccessoryResponse = await fetch(`http://127.0.0.1:8000/api/plants/${plantId}/add-accessory`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`
  },
  body: formData
});
const { character_image_url } = await addAccessoryResponse.json();
// Nueva URL con el accesorio superpuesto
```

#### 9. Obtener Lecturas de Sensor

```javascript
const readingsResponse = await fetch(`http://127.0.0.1:8000/api/sensors/${sensorId}/readings?limit=50`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});
const readings = await readingsResponse.json();

// readings es array de lecturas ordenadas por fecha (más recientes primero)
readings.forEach(reading => {
  console.log(`Humedad: ${reading.humidity}%, Temp: ${reading.temperature}°C`);
});
```

#### 10. Obtener Notificaciones

```javascript
// Todas las notificaciones
const notificationsResponse = await fetch('http://127.0.0.1:8000/api/notifications/', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});

// Solo no leídas
const unreadResponse = await fetch('http://127.0.0.1:8000/api/notifications/?unread_only=true', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});
const notifications = await unreadResponse.json();

// Marcar como leída
await fetch(`http://127.0.0.1:8000/api/notifications/${notificationId}/read`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});
```

### Manejo de Errores en el Frontend

```javascript
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getToken()}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      if (response.status === 401) {
        // Token expirado, redirigir a login
        await clearTokens();
        router.push('/login');
        throw new Error('Sesión expirada');
      }
      
      throw new Error(errorData.detail || 'Error en la petición');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

### Upload de Archivos (Multipart Form Data)

```javascript
async function uploadImage(file, endpoint, plantName = null) {
  const formData = new FormData();
  formData.append('file', file);
  
  if (plantName) {
    formData.append('plant_name', plantName);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${await getToken()}`
      // NO incluir 'Content-Type', el navegador lo agrega con boundary
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error subiendo imagen');
  }

  return await response.json();
}

// Uso
const file = event.target.files[0];
const result = await uploadImage(file, '/plants/', 'Pepito');
```

### Refrescar Token

```javascript
async function refreshAccessToken() {
  const refreshToken = await AsyncStorage.getItem('refresh_token');
  
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  if (!response.ok) {
    // Refresh token también expiró, forzar login
    await clearTokens();
    throw new Error('Sesión expirada');
  }

  const { access_token, refresh_token } = await response.json();
  await AsyncStorage.multiSet([
    ['access_token', access_token],
    ['refresh_token', refresh_token]
  ]);

  return access_token;
}
```

### Tipos TypeScript (Para Referencia)

```typescript
// User Types
interface UserResponse {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: UserResponse;
}

// Plant Types
interface PlantResponse {
  id: number;
  user_id: number;
  sensor_id: number | null;
  plant_name: string;
  plant_type: string | null;
  scientific_name: string | null;
  care_level: string | null;
  care_tips: string | null;
  original_photo_url: string | null;
  character_image_url: string | null;
  character_personality: string | null;
  character_mood: string;
  health_status: string;
  last_watered: string | null;
  optimal_humidity_min: number | null;
  optimal_humidity_max: number | null;
  optimal_temp_min: number | null;
  optimal_temp_max: number | null;
  created_at: string;
  updated_at: string | null;
}

interface PlantIdentify {
  plant_type: string;
  scientific_name: string;
  care_level: string;
  care_tips: string;
  optimal_humidity_min: number;
  optimal_humidity_max: number;
  optimal_temp_min: number;
  optimal_temp_max: number;
}

// Sensor Types
interface SensorResponse {
  id: number;
  user_id: number;
  device_key: string;
  device_type: string;
  is_active: boolean;
  is_assigned: boolean;
  last_connection: string | null;
  created_at: string;
}

interface SensorReading {
  id: number;
  sensor_id: number;
  plant_id: number;
  humidity: number;
  temperature: number;
  pressure: number | null;
  reading_time: string;
}

// Notification Types
interface NotificationResponse {
  id: number;
  user_id: number;
  plant_id: number | null;
  notification_type: string;
  message: string;
  is_read: boolean;
  sent_via_email: boolean;
  created_at: string;
}
```

---

## 🔑 PUNTOS CLAVE PARA DESARROLLADORES

### Para Frontend (React/React Native)

1. **Autenticación:**
   - Guardar `access_token` en cookies (web) o AsyncStorage (móvil)
   - Incluir en header `Authorization: Bearer <token>` en cada request
   - Si recibes 401, refrescar token o redirigir a login

2. **Upload de Imágenes:**
   - Usar `FormData` para multipart/form-data
   - NO incluir header `Content-Type` manualmente (dejar que el navegador lo agregue)
   - Validar tipo de archivo antes de subir (solo JPEG/JPG/PNG)

3. **Manejo de Errores:**
   - Siempre verificar `response.ok` antes de parsear JSON
   - Mostrar mensajes de error descriptivos al usuario
   - Logear errores para debugging

4. **Estado de Plantas:**
   - `character_image_url` puede ser `null` si el render 3D no se ha subido
   - Mostrar placeholder apropiado
   - `character_mood` y `health_status` se actualizan automáticamente según sensores

### Para Backend

1. **Dependencias:**
   - Todas las rutas protegidas usan `Depends(get_current_active_user)`
   - Esto valida JWT y verifica que usuario esté activo
   - Si falla, retorna 401 automáticamente

2. **Base de Datos:**
   - Usar `execute_query` para UPDATE (no `update_records` en async)
   - Usar `fetch_records` o `execute_query` para SELECT
   - Usar `insert_records` para INSERT

3. **Validación:**
   - Pydantic schemas validan automáticamente
   - Errores 422 si validación falla
   - Mensajes de error descriptivos

4. **Logging:**
   - Usar `logger.info()` para operaciones importantes
   - Usar `logger.error()` con `exc_info=True` para errores
   - No logear contraseñas o tokens completos

### Para IoT (ESP8266/ESP32)

1. **Enviar Datos:**
   - Endpoint: `POST /api/sensors/data`
   - NO requiere autenticación (solo `device_key`)
   - Enviar cada 5-10 minutos recomendado
   - Manejar errores de red (retry)

2. **Device Key:**
   - Debe ser único y pre-registrado por el usuario
   - Formato recomendado: `ESP8266_<MAC_ADDRESS>` o similar
   - Una vez registrado, no cambiar

---

## 📝 NOTAS FINALES

### Estado Actual del Proyecto

- ✅ Backend completo y funcional
- ✅ Frontend web (React) funcional
- ✅ Base de datos v2 implementada
- ✅ Migración a Supabase Storage completa
- ✅ Identificación de plantas con IA funcionando
- ⏳ Frontend iOS (Expo) - En desarrollo
- ⏳ Modelos 3D - Se crean manualmente

### Decisiones de Diseño

1. **Separación Frontend/Backend:**
   - Backend es API pura (no renderiza HTML)
   - Frontend consume API REST
   - Fácil de conectar múltiples clientes (web, móvil, etc.)

2. **Autenticación JWT:**
   - Stateless (no requiere sesiones en servidor)
   - Escalable
   - Tokens con expiración configurable

3. **Supabase Storage:**
   - Gratis hasta 1GB
   - URLs públicas
   - Sin transformaciones automáticas (procesar antes si es necesario)

4. **IA solo para Identificación:**
   - No se generan imágenes automáticamente
   - Renders 3D se crean y suben manualmente
   - IA identifica plantas y da recomendaciones

### Extensiones Futuras

- Sistema de gamificación completo (logros, puntos, niveles)
- Notificaciones push para móvil
- Compartir jardín con otros usuarios
- Marketplace de accesorios
- Modo offline para móvil
- Sincronización automática de datos

---

## 📞 CONTACTO Y SOPORTE

Para preguntas sobre la API:
- Documentación interactiva: `http://127.0.0.1:8000/docs` (Swagger UI)
- Documentación alternativa: `http://127.0.0.1:8000/redoc` (ReDoc)

Health check:
- `GET /health` - Estado básico
- `GET /health/detailed` - Estado detallado con estadísticas

---

**Última actualización:** Diciembre 2024
**Versión API:** 1.0.0
