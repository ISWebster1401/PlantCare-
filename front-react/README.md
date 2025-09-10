# 🌱 PlantCare Frontend - React

Frontend React moderno para PlantCare que consume la API del backend FastAPI.

## 🚀 Características

- ✅ **React 18** con TypeScript
- ✅ **Axios** para llamadas HTTP
- ✅ **Context API** para manejo de estado de autenticación
- ✅ **Formulario de registro** completamente funcional
- ✅ **Validaciones** robustas del lado del cliente
- ✅ **Diseño responsive** moderno
- ✅ **Consumo de API** del backend en puerto 5000
- ✅ **Manejo de errores** y estados de carga

## 📋 Requisitos

- Node.js 16+ 
- NPM o Yarn
- Backend FastAPI corriendo en puerto 5000

## ⚙️ Instalación

```bash
# Ya instalado, solo necesitas iniciar
cd front-react
npm start
```

## 🏃‍♂️ Uso

1. **Inicia el backend FastAPI** (puerto 5000):
   ```bash
   cd ../back
   python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
   ```

2. **Inicia el frontend React** (puerto 3000):
   ```bash
   npm start
   ```

3. **Abre tu navegador** en: `http://localhost:3000`

## 🔗 API Endpoints Utilizados

- `POST /api/auth/register` - Registro de usuarios
- `POST /api/auth/login` - Login de usuarios (preparado para futuro)
- `GET /api/auth/me` - Información del usuario actual (preparado para futuro)

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── LandingPage.tsx      # Página principal
│   ├── LandingPage.css      # Estilos de la landing
│   ├── RegisterForm.tsx     # Formulario de registro
│   └── RegisterForm.css     # Estilos del formulario
├── context/
│   └── AuthContext.tsx      # Context para autenticación
├── services/
│   └── api.ts              # Configuración de axios y endpoints
├── types/
│   └── User.ts             # Tipos TypeScript
├── App.tsx                 # Componente principal
└── App.css                 # Estilos globales
```

## 🎯 Funcionalidades Implementadas

### ✅ Registro de Usuario
- Formulario completo con todos los campos requeridos
- Validación de contraseñas (fortaleza y coincidencia)
- Validación de campos obligatorios
- Envío a la API del backend
- Manejo de errores y mensajes de éxito
- Estados de carga

### ✅ Diseño Moderno
- Landing page completa con secciones
- Diseño responsive para móviles
- Animaciones CSS suaves
- Tema oscuro moderno
- Componentes reutilizables

### ✅ Integración con Backend
- Configuración de proxy para desarrollo
- Manejo de CORS
- Interceptores de axios
- Manejo de tokens (preparado para login)

## 🔧 Configuración

El frontend está configurado para conectarse automáticamente al backend en `http://127.0.0.1:5000` a través del proxy de Create React App.

## 🎨 Personalización

Los estilos están en archivos CSS separados por componente. Puedes modificar:

- `LandingPage.css` - Estilos de la página principal
- `RegisterForm.css` - Estilos del formulario
- `App.css` - Estilos globales

## 🐛 Solución de Problemas

### Error de conexión con el backend
1. Verifica que el backend esté corriendo en puerto 5000
2. Verifica que no haya errores de CORS
3. Revisa la consola del navegador para errores

### Errores de compilación TypeScript
1. Verifica que todas las dependencias estén instaladas
2. Ejecuta `npm install` si es necesario

## 📝 Notas

- El proyecto usa TypeScript para mejor tipado
- Los tokens se guardan en localStorage
- El formulario valida la fortaleza de contraseñas
- Todos los campos son obligatorios según el schema del backend

## 🚀 ¡Listo para usar!

El frontend está completamente configurado y listo para consumir tu API FastAPI. Solo inicia ambos servidores y comenzarás a recibir registros de usuarios en tu base de datos.