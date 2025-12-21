# 🚀 Guía Rápida: Conectar App Móvil con Backend

## ✅ Configuración Actual

Tu IP local es: **10.20.252.184**

La app ya está configurada para usar: `http://10.20.252.184:8000/api`

## 📋 Pasos para Probar el Registro

### 1. Iniciar el Backend

```bash
cd back
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**⚠️ IMPORTANTE:** Usa `--host 0.0.0.0` para aceptar conexiones desde tu teléfono.

Deberías ver algo como:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### 2. Verificar que el Backend está Accesible

Desde tu iPhone, abre Safari y ve a:
```
http://10.20.252.184:8000/docs
```

Deberías ver la documentación de FastAPI. Si no ves nada, el problema es de red/firewall.

### 3. Iniciar la App Móvil

```bash
cd mobile
npx expo start --clear
```

Escanea el QR con tu teléfono.

### 4. Probar Registro

1. Abre la app en tu teléfono
2. Ve a "Registrarse"
3. Completa el formulario:
   - Nombre completo
   - Email
   - Contraseña (min 8 caracteres, mayúscula, minúscula, número, carácter especial)
   - Confirmar contraseña
4. Presiona "Registrarse"
5. Deberías ver un mensaje de éxito y luego ser redirigido al login

### 5. Verificar Email (Opcional)

Después del registro, deberías recibir un email con el código de verificación. Por ahora puedes omitir este paso si solo quieres probar.

## 🔍 Si Hay Errores

### Error: "Network Error"
- Verifica que el backend esté corriendo con `--host 0.0.0.0`
- Verifica que ambos (Mac y iPhone) estén en la misma red WiFi
- Prueba acceder a `http://10.20.252.184:8000/docs` desde Safari en el iPhone

### Error: "Cannot connect to server"
- Verifica el firewall de tu Mac
- Prueba detener y reiniciar el backend
- Verifica que el puerto 8000 no esté siendo usado por otra aplicación

### El backend no acepta conexiones
- Asegúrate de usar `--host 0.0.0.0` no `--host 127.0.0.1`
- Verifica que CORS esté configurado (ya está en `main.py`)

## 📝 Notas

- Si cambias de red WiFi, actualiza la IP en `mobile/constants/Config.ts`
- Para producción, cambiarás esta URL a la URL pública del backend
