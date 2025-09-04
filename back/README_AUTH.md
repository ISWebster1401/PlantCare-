# 🔐 Sistema de Autenticación PlantCare

Este documento describe el sistema de autenticación implementado en PlantCare, que incluye registro de usuarios, login con JWT y gestión de tokens.

## 🚀 Características

- **Registro de usuarios** con validación de contraseñas
- **Login seguro** con hash de contraseñas usando bcrypt
- **Autenticación JWT** con tokens de acceso y refresco
- **Middleware de autenticación** para proteger rutas
- **Gestión de sesiones** con actualización de último login
- **Validación robusta** de datos de entrada
- **Manejo de errores** detallado y logging

## 📋 Requisitos Previos

1. **Base de datos PostgreSQL** ejecutándose
2. **Python 3.8+** instalado
3. **Dependencias** del proyecto instaladas:
   ```bash
   pip install -r requirements.txt
   ```

## ⚙️ Configuración

### 1. Variables de Entorno

Copia el archivo `env.example` a `.env` y configura las variables:

```bash
cp env.example .env
```

Edita `.env` con tus valores:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_contraseña
DB_DATABASE=PlantCare

# Servidor
SERVER_HOST=0.0.0.0
SERVER_PORT=5000

# JWT (IMPORTANTE: Cambia en producción)
SECRET_KEY=clave_super_secreta_y_larga_aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### 2. Base de Datos

La aplicación creará automáticamente las tablas necesarias al iniciar. Asegúrate de que:

- PostgreSQL esté ejecutándose
- La base de datos `PlantCare` exista
- El usuario tenga permisos para crear tablas

## 🏃‍♂️ Ejecución

### 1. Iniciar la Aplicación

```bash
cd back
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

O desde el directorio raíz:

```bash
cd back
python app/main.py
```

### 2. Verificar Funcionamiento

- **Página principal**: http://localhost:5000
- **Documentación API**: http://localhost:5000/docs
- **Health check**: http://localhost:5000/health

## 🔗 Endpoints de Autenticación

### 1. Registro de Usuario

```http
POST /api/auth/register
Content-Type: application/json

{
  "first_name": "Juan",
  "last_name": "Pérez",
  "email": "juan@ejemplo.com",
  "phone": "+56912345678",
  "region": "Valle del Maipo",
  "vineyard_name": "Viña Pérez",
  "hectares": 15.5,
  "grape_type": "Cabernet Sauvignon",
  "password": "Contraseña123!",
  "confirm_password": "Contraseña123!"
}
```

**Respuesta exitosa (201):**
```json
{
  "id": 1,
  "first_name": "Juan",
  "last_name": "Pérez",
  "email": "juan@ejemplo.com",
  "phone": "+56912345678",
  "region": "Valle del Maipo",
  "vineyard_name": "Viña Pérez",
  "hectares": 15.5,
  "grape_type": "Cabernet Sauvignon",
  "created_at": "2024-01-15T10:30:00",
  "last_login": null,
  "active": true
}
```

### 2. Login de Usuario

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "juan@ejemplo.com",
  "password": "Contraseña123!"
}
```

**Respuesta exitosa (200):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### 3. Obtener Información del Usuario

```http
GET /api/auth/me
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### 4. Actualizar Usuario

```http
PUT /api/auth/me
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "phone": "+56987654321",
  "region": "Valle de Colchagua"
}
```

### 5. Cambiar Contraseña

```http
POST /api/auth/change-password
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "current_password": "Contraseña123!",
  "new_password": "NuevaContraseña456!",
  "confirm_new_password": "NuevaContraseña456!"
}
```

### 6. Refrescar Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### 7. Logout

```http
POST /api/auth/logout
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

## 🔒 Seguridad

### 1. Validación de Contraseñas

Las contraseñas deben cumplir:
- **Mínimo 8 caracteres**
- **Al menos una mayúscula**
- **Al menos una minúscula**
- **Al menos un número**
- **Al menos un carácter especial** (!@#$%^&*()_+-=[]{}|;:,.<>?)

### 2. Hash de Contraseñas

- Se usa **bcrypt** para el hash
- **Salt automático** para cada contraseña
- **Verificación segura** sin almacenar contraseñas en texto plano

### 3. Tokens JWT

- **Access Token**: 30 minutos de duración
- **Refresh Token**: 7 días de duración
- **Algoritmo**: HS256
- **Payload**: email y user_id

## 🛡️ Uso en Rutas Protegidas

Para proteger una ruta que requiera autenticación:

```python
from fastapi import Depends
from app.api.core.auth_user import get_current_active_user

@app.get("/protected-route")
async def protected_endpoint(
    current_user: dict = Depends(get_current_active_user)
):
    return {"message": f"Hola {current_user['first_name']}!"}
```

## 📝 Ejemplos de Uso

### 1. Con cURL

```bash
# Registro
curl -X POST "http://localhost:5000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Ana",
    "last_name": "García",
    "email": "ana@ejemplo.com",
    "password": "Contraseña123!",
    "confirm_password": "Contraseña123!"
  }'

# Login
curl -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ana@ejemplo.com",
    "password": "Contraseña123!"
  }'

# Usar token
curl -X GET "http://localhost:5000/api/auth/me" \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### 2. Con Python requests

```python
import requests

BASE_URL = "http://localhost:5000/api"

# Registro
response = requests.post(f"{BASE_URL}/auth/register", json={
    "first_name": "Carlos",
    "last_name": "López",
    "email": "carlos@ejemplo.com",
    "password": "Contraseña123!",
    "confirm_password": "Contraseña123!"
})

# Login
response = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "carlos@ejemplo.com",
    "password": "Contraseña123!"
})

token = response.json()["access_token"]

# Usar token
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
print(response.json())
```

## 🐛 Solución de Problemas

### 1. Error de Conexión a Base de Datos

```bash
# Verificar que PostgreSQL esté ejecutándose
sudo systemctl status postgresql

# Verificar conexión
psql -h localhost -U postgres -d PlantCare
```

### 2. Error de Dependencias

```bash
# Reinstalar dependencias
pip install -r requirements.txt --force-reinstall
```

### 3. Error de Permisos

```bash
# Verificar permisos del usuario de base de datos
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE "PlantCare" TO tu_usuario;
```

## 🔄 Próximos Pasos

1. **Implementar logout real** con invalidación de tokens
2. **Agregar rate limiting** para prevenir ataques de fuerza bruta
3. **Implementar recuperación de contraseña** por email
4. **Agregar autenticación de dos factores** (2FA)
5. **Implementar auditoría** de acciones de usuarios
6. **Agregar roles y permisos** para diferentes tipos de usuarios

## 📚 Recursos Adicionales

- [Documentación de FastAPI](https://fastapi.tiangolo.com/)
- [Documentación de JWT](https://jwt.io/)
- [Documentación de bcrypt](https://github.com/pyca/bcrypt/)
- [Documentación de pgdbtoolkit](https://github.com/gustavoinostroza/pgdbtoolkit)
