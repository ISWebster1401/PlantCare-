# 🌱 PlantCare

Plataforma IoT gamificada para el cuidado personal de plantas. Monitorea la salud de tus plantas con sensores inteligentes, identifica especies con IA, y recibe recomendaciones personalizadas de cuidado.

![PlantCare](https://img.shields.io/badge/PlantCare-v1.0.0-green)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![React](https://img.shields.io/badge/React-19-blue)
![Expo](https://img.shields.io/badge/Expo-54-black)

---

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Características Principales](#-características-principales)
- [Arquitectura](#-arquitectura)
- [Estructura del Repositorio](#-estructura-del-repositorio)
- [Stack Tecnológico](#-stack-tecnológico)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Documentación Adicional](#-documentación-adicional)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

---

## 🎯 Descripción

PlantCare es una solución completa que combina **tecnología IoT**, **inteligencia artificial** y **gamificación** para transformar el cuidado de plantas en una experiencia interactiva y educativa.

### ¿Qué hace PlantCare?

- 📸 **Identificación con IA**: Sube fotos de plantas y obtén identificación automática usando GPT-4o Vision
- 🌱 **Jardín Digital**: Crea y gestiona tu colección personal de plantas
- 📊 **Monitoreo en Tiempo Real**: Conecta sensores IoT (ESP8266/ESP32) para medir humedad del suelo, temperatura, luz, y más
- 🤖 **Asistente de IA**: Recibe recomendaciones personalizadas de cuidado basadas en el estado de tus plantas
- 📱 **Multiplataforma**: Accede desde tu navegador web o aplicación móvil iOS/Android
- 🎮 **Gamificación**: Gana logros y mantén tus plantas saludables

---

## ✨ Características Principales

### Backend (API REST)
- ✅ Autenticación JWT con refresh tokens y "Recordarme" (sesiones de 1 mes)
- ✅ Identificación de plantas con OpenAI GPT-4o Vision
- ✅ Almacenamiento de imágenes en Supabase Storage
- ✅ Cache Redis para optimización de consultas
- ✅ Sistema de notificaciones y alertas
- ✅ Análisis de datos con Polars para agregaciones rápidas
- ✅ Docker Compose para desarrollo local
- ✅ Documentación interactiva con Swagger/OpenAPI

### Frontend Web (React)
- ✅ Dashboard interactivo con gráficas y estadísticas
- ✅ Jardín digital con visualización de plantas
- ✅ Scanner de plantas integrado
- ✅ Chat de IA en tiempo real
- ✅ Gestión de sensores y dispositivos
- ✅ Perfil de usuario y configuración
- ✅ Diseño responsive y dark mode

### App Móvil (React Native / Expo)
- ✅ Autenticación completa (login/registro)
- ✅ Scanner de plantas con cámara
- ✅ Vista de jardín digital
- ✅ Monitoreo de sensores en tiempo real
- ✅ Notificaciones push (preparado)
- ✅ Diseño nativo para iOS y Android

---

## 🏗️ Arquitectura

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  Frontend Web   │      │   App Móvil     │      │  Dispositivos   │
│   (React)       │      │   (Expo)        │      │   IoT (ESP)     │
│                 │      │                 │      │                 │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         │   HTTP/REST API        │                        │
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │                           │
                    │    Backend (FastAPI)      │
                    │                           │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼────────┐    ┌───────────▼──────────┐    ┌────────▼────────┐
│  PostgreSQL    │    │    Redis Cache       │    │ Supabase Storage│
│   (Datos)      │    │   (Performance)      │    │   (Imágenes)    │
└────────────────┘    └──────────────────────┘    └─────────────────┘
```

---

## 📁 Estructura del Repositorio

Este repositorio contiene **tres partes principales** del proyecto:

```
PlantCare-/
│
├── 📱 mobile/                    # Aplicación móvil (React Native / Expo)
│   ├── app/                      # Pantallas con Expo Router
│   │   ├── (auth)/              # Flujo de autenticación
│   │   ├── (tabs)/              # Navegación principal
│   │   └── scan-plant.tsx       # Scanner de plantas
│   ├── components/               # Componentes reutilizables
│   ├── services/                 # API client y servicios
│   ├── context/                  # React Context (Auth)
│   └── constants/                # Configuración
│
├── 💻 front-react/               # Frontend web (React + TypeScript)
│   ├── src/
│   │   ├── components/          # Componentes React
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DigitalGarden.tsx
│   │   │   ├── PlantScanner.tsx
│   │   │   ├── AIChatDrawer.tsx
│   │   │   └── ...
│   │   ├── context/             # AuthContext
│   │   ├── services/            # API client
│   │   └── types/               # TypeScript types
│   └── public/
│
├── ⚙️ back/                      # Backend (FastAPI + Python)
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/          # Endpoints REST
│   │   │   │   ├── auth.py
│   │   │   │   ├── plants.py
│   │   │   │   ├── sensors.py
│   │   │   │   ├── ai.py
│   │   │   │   └── ...
│   │   │   ├── core/            # Módulos core
│   │   │   │   ├── database.py
│   │   │   │   ├── redis_cache.py
│   │   │   │   ├── openai_config.py
│   │   │   │   ├── supabase_storage.py
│   │   │   │   └── ...
│   │   │   └── schemas/         # Pydantic schemas
│   │   ├── db/                  # Queries de base de datos
│   │   ├── services/            # Servicios de negocio
│   │   └── main.py              # Entry point FastAPI
│   ├── migrations/              # Scripts de migración SQL
│   ├── docker-compose.yml       # Docker setup (PostgreSQL + Redis)
│   └── requirements.txt
│
└── 📚 Documentación
    ├── PROJECT_DOCUMENTATION_COMPLETE.md  # Documentación completa
    ├── API_SETUP.md                       # Setup de API (mobile)
    ├── QUICK_START.md                     # Guía rápida
    └── ...
```

---

## 🛠️ Stack Tecnológico

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Base de Datos**: PostgreSQL 15
- **Cache**: Redis 7
- **ORM**: pgdbtoolkit (async)
- **Autenticación**: JWT (python-jose, bcrypt)
- **IA**: OpenAI GPT-4o Vision
- **Almacenamiento**: Supabase Storage
- **Emails**: SendGrid
- **Agregaciones**: Polars
- **Containerización**: Docker + Docker Compose

### Frontend Web
- **Framework**: React 19 + TypeScript
- **Routing**: react-router-dom
- **HTTP Client**: Axios
- **Estado**: React Context API
- **Gráficas**: Recharts, Chart.js
- **Estilos**: CSS Modules

### App Móvil
- **Framework**: React Native (Expo SDK 54)
- **Routing**: Expo Router
- **Navegación**: React Navigation
- **HTTP Client**: Axios
- **Estado**: React Context API
- **Almacenamiento**: AsyncStorage
- **Cámara**: expo-camera, expo-image-picker

### IoT
- **Dispositivos**: ESP8266 / ESP32
- **Protocolo**: HTTP REST API
- **Lenguaje**: Arduino C++

---

## 🚀 Instalación

### Prerrequisitos

- **Python 3.11+**
- **Node.js 18+**
- **PostgreSQL 15+**
- **Redis 7+** (opcional pero recomendado)
- **Docker & Docker Compose** (opcional, para desarrollo local)

### 1. Backend

```bash
# Clonar repositorio
git clone <repo-url>
cd PlantCare-/back

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp env.example .env
# Editar .env con tus credenciales

# Iniciar base de datos (con Docker)
docker-compose up -d postgres redis

# O usar PostgreSQL local (ajustar .env)

# Crear base de datos
python -c "from app.api.core.database import init_db; import asyncio; asyncio.run(init_db())"

# O ejecutar script SQL manualmente
psql -U postgres -f create_database_v2.sql

# Iniciar servidor
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

El backend estará disponible en: `http://localhost:8000`
Documentación API: `http://localhost:8000/docs`

### 2. Frontend Web

```bash
cd front-react

# Instalar dependencias
npm install

# Configurar variables de entorno (opcional)
# Crear .env con: REACT_APP_API_URL=http://localhost:8000/api

# Iniciar servidor de desarrollo
npm start
```

El frontend estará disponible en: `http://localhost:3000`

### 3. App Móvil

```bash
cd mobile

# Instalar dependencias
npm install

# Configurar API URL
# Editar mobile/constants/Config.ts con tu IP local
# O crear .env con: EXPO_PUBLIC_API_URL=http://TU_IP:8000/api

# Para dispositivo físico, necesitas tu IP local:
# ifconfig | grep "inet " | grep -v 127.0.0.1

# Iniciar Expo
npx expo start

# Escanear QR con Expo Go (iOS/Android)
# O presionar 'i' para iOS simulator, 'a' para Android
```

**Nota**: Para conectar el móvil con el backend, asegúrate de:
1. Backend corriendo con `--host 0.0.0.0`
2. Ambos dispositivos en la misma red WiFi
3. IP local configurada en `mobile/constants/Config.ts`

---

## 📖 Uso

### Primeros Pasos

1. **Registrarse**: Crea una cuenta desde la web o la app móvil
2. **Verificar Email**: Revisa tu correo para el código de verificación
3. **Agregar Planta**: Usa el scanner para identificar y agregar tu primera planta
4. **Conectar Sensor** (opcional): Registra un dispositivo IoT para monitoreo automático
5. **Explorar**: Navega por tu jardín digital y consulta al asistente de IA

### Endpoints Principales

- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/plants/` - Crear planta (con identificación IA)
- `GET /api/plants/` - Listar plantas del usuario
- `POST /api/sensors/data` - Recibir datos de sensor IoT
- `POST /api/ai/ask` - Consultar asistente de IA

---

## 📚 Documentación Adicional

- **[Documentación Completa](./PROJECT_DOCUMENTATION_COMPLETE.md)**: Documentación exhaustiva del proyecto, API, y arquitectura
- **[Setup API Mobile](./mobile/API_SETUP.md)**: Guía para conectar la app móvil con el backend
- **[Guía Rápida Mobile](./mobile/QUICK_START.md)**: Inicio rápido para la app móvil
- **[Troubleshooting Mobile](./mobile/TROUBLESHOOTING.md)**: Solución de problemas comunes
- **[Supabase Setup](./SUPABASE_QUICK_START.md)**: Configuración de Supabase Storage

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

---

## 👥 Autores

- **Sebastian Ignacio Vargas Webster** - Desarrollo y diseño

---

## 🙏 Agradecimientos

- OpenAI por GPT-4o Vision
- Expo por el ecosistema React Native
- FastAPI por el excelente framework
- La comunidad open source

---

## 📞 Soporte

Para soporte, abre un issue en GitHub o contacta al equipo de desarrollo.

---

**🌱 ¡Cultiva plantas felices con PlantCare! 🌱**
