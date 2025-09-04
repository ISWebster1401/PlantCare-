# 🔧 Solución de Problemas - PlantCare API

## 🚨 Problemas Identificados y Solucionados

### ❌ Problema 1: Middleware de Logging
**Estado**: ✅ **SOLUCIONADO**

El middleware de logging estaba causando errores que impedían que FastAPI funcionara correctamente.

#### Soluciones Implementadas:
- **Middleware simplificado** con manejo de errores robusto
- **Sistema de logging** con fallbacks
- **Configuración segura** con manejo de errores

### ❌ Problema 2: Error en Registro de Usuarios
**Estado**: ✅ **SOLUCIONADO**

Error: `get_user_by_email() missing 1 required positional argument: 'email'`

#### Causa del Problema:
Inconsistencias en las llamadas a la función `get_user_by_email()`:
- En algunos lugares se llamaba sin el parámetro `db`
- En otros se llamaba con parámetros incorrectos

#### Soluciones Implementadas:

##### 1. Corregidas las llamadas en `auth_user.py`:
```python
# ❌ ANTES (incorrecto)
user = await get_user_by_email(email)

# ✅ DESPUÉS (correcto)
user = await get_user_by_email(db, email)
```

##### 2. Corregida la función `authenticate_user`:
```python
# ❌ ANTES
async def authenticate_user(email: str, password: str) -> Optional[UserInDB]:

# ✅ DESPUÉS
async def authenticate_user(email: str, password: str, db: AsyncPgDbToolkit) -> Optional[UserInDB]:
```

##### 3. Corregida la función `get_current_user`:
```python
# ❌ ANTES
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserInDB:

# ✅ DESPUÉS
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncPgDbToolkit = Depends(get_db)
) -> UserInDB:
```

##### 4. Corregidas las llamadas en `auth.py`:
```python
# ❌ ANTES
user = await AuthService.register_user(user_dict)
user = await AuthService.authenticate_user(email, password)

# ✅ DESPUÉS
user = await AuthService.register_user(user_dict, db)
user = await AuthService.authenticate_user(email, password, db)
```

### ❌ Problema 3: Error de Event Loop en Windows
**Estado**: ✅ **SOLUCIONADO**

Error: `Psycopg cannot use the 'ProactorEventLoop' to run in async mode. Please use a compatible event loop, for instance by setting 'asyncio.set_event_loop_policy(WindowsSelectorEventLoopPolicy())'`

#### Causa del Problema:
En Windows con Python 3.11+, `psycopg` no es compatible con el `ProactorEventLoop` por defecto. Necesita usar `WindowsSelectorEventLoopPolicy`.

#### Soluciones Implementadas:

##### 1. Configuración automática en `database.py`:
```python
# Configurar event loop para Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
```

##### 2. Configuración en `main.py`:
```python
# Configurar event loop para Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
```

##### 3. Configuración en todos los scripts de prueba:
```python
# Configurar event loop para Windows ANTES de cualquier import
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
```

---

## 🧪 Verificación de Funcionamiento

### Script de Prueba para Windows (`test_windows_fix.py`) - RECOMENDADO
```bash
cd back
python test_windows_fix.py
```

Este script es específico para Windows y verifica:
- ✅ Configuración del event loop
- ✅ Configuración de la aplicación
- ✅ Sistema de logging
- ✅ Conexión a base de datos
- ✅ Registro y autenticación de usuarios

### Script de Prueba Básica (`test_simple.py`)
```bash
cd back
python test_simple.py
```

### Script de Prueba de Registro (`test_auth_fix.py`)
```bash
cd back
python test_auth_fix.py
```

### Endpoints de Verificación
- **`/health`** - Estado básico de la aplicación
- **`/health/detailed`** - Estado detallado con estadísticas
- **`/docs`** - Documentación de la API
- **`/api/auth/register`** - Registro de usuarios (ahora funciona)
- **`/api/auth/login`** - Login de usuarios (ahora funciona)

---

## 🚀 Cómo Usar Ahora

### 1. Configuración
```bash
# Copiar archivo de configuración
cp env.example .env

# Editar configuración según tu entorno
nano .env
```

### 2. Ejecutar la Aplicación
```bash
cd back
python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```

### 3. Verificar Funcionamiento
```bash
# Probar health check
curl http://localhost:5000/health

# Ver documentación
open http://localhost:5000/docs

# Probar registro de usuarios
curl -X POST "http://localhost:5000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
    "password": "TestPassword123!",
    "confirm_password": "TestPassword123!"
  }'
```

---

## 🔍 Diagnóstico de Problemas

### Si la aplicación no inicia:
1. **Verificar configuración de base de datos**:
   ```bash
   python test_windows_fix.py
   ```

2. **Verificar logs**:
   ```bash
   tail -f plantcare.log
   ```

### Si el registro de usuarios falla:
1. **Ejecutar prueba específica**:
   ```bash
   python test_windows_fix.py
   ```

2. **Verificar base de datos**:
   - PostgreSQL ejecutándose
   - Tabla `users` creada
   - Permisos correctos

### Si hay errores específicos:

#### Error de Event Loop en Windows:
```
Psycopg cannot use the 'ProactorEventLoop' to run in async mode
```
**Solución**: Ya está solucionado automáticamente en el código.

#### Error de conexión a DB:
- Verificar PostgreSQL está ejecutándose
- Verificar credenciales en `.env`
- Verificar que la base de datos existe

#### Error de logging:
- Verificar permisos de escritura en el directorio
- Verificar que el directorio de logs existe

#### Error de configuración:
- Verificar archivo `.env` existe y está configurado
- Verificar variables de entorno requeridas

---

## 📋 Checklist de Verificación

- [x] PostgreSQL ejecutándose
- [x] Archivo `.env` configurado
- [x] Dependencias instaladas (`pip install -r requirements.txt`)
- [x] **Event loop configurado para Windows** ✅
- [x] Script de prueba para Windows pasa (`python test_windows_fix.py`)
- [x] Aplicación inicia sin errores
- [x] Health check responde (`/health`)
- [x] Documentación accesible (`/docs`)
- [x] **Registro de usuarios funciona** (`/api/auth/register`)
- [x] **Login de usuarios funciona** (`/api/auth/login`)

---

## 🎯 Próximos Pasos

Una vez que la aplicación funcione correctamente:

1. **Habilitar índices** en la base de datos
2. **Configurar logging a archivo**
3. **Implementar rutas adicionales** (dispositivos, alertas, IA)
4. **Agregar tests unitarios**
5. **Implementar validaciones adicionales**

---

## 📞 Soporte

Si sigues teniendo problemas:

1. **Ejecuta el script específico para Windows**:
   ```bash
   python test_windows_fix.py
   ```

2. Revisa los logs en `plantcare.log`
3. Verifica la configuración de PostgreSQL
4. Asegúrate de que todas las dependencias estén instaladas
5. Verifica que el archivo `.env` esté configurado correctamente

---

## 📚 Archivos Modificados

### Problema 1 - Middleware:
- ✅ `app/main.py` - Middleware simplificado
- ✅ `app/api/core/log.py` - Sistema de logging robusto
- ✅ `app/api/core/config.py` - Configuración segura
- ✅ `app/api/core/database.py` - Base de datos simplificada

### Problema 2 - Registro de Usuarios:
- ✅ `app/api/core/auth_user.py` - Corregidas llamadas a funciones
- ✅ `app/api/routes/auth.py` - Corregidas llamadas a AuthService
- ✅ `test_auth_fix.py` - Script de prueba específico

### Problema 3 - Event Loop en Windows:
- ✅ `app/api/core/database.py` - Configuración automática del event loop
- ✅ `app/main.py` - Configuración del event loop
- ✅ `test_simple.py` - Configuración del event loop
- ✅ `test_auth_fix.py` - Configuración del event loop
- ✅ `test_auth.py` - Configuración del event loop
- ✅ `test_windows_fix.py` - Script específico para Windows

---

*Documento de solución de problemas - PlantCare API v1.0.0*
