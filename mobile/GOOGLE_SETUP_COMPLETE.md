# ✅ Configuración Completa de Google OAuth para PlantCare Mobile

## 📋 Resumen Rápido

1. **Client ID tipo "Web application"** para desarrollo
2. **Redirect URI**: Agregar `exp://TU_IP:8081/--/oauth` (el que aparece en el error)
3. **.env**: Solo el Client ID (NO el Secret)

---

## 🚀 Pasos Detallados

### Paso 1: Crear Client ID en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. **Tipo: Web application** ⚠️ IMPORTANTE
6. Nombre: "PlantCare Mobile Development"
7. **Authorized redirect URIs**: Agrega estos URIs (reemplaza `10.20.250.31` con tu IP actual):
   ```
   exp://10.20.250.31:8081/--/oauth
   exp://localhost:8081/--/oauth
   plantcare://oauth
   ```
   ⚠️ **IMPORTANTE**: El URI `exp://10.20.250.31:8081/--/oauth` es el que aparece en el error. 
   Si cambias de red WiFi, tu IP cambiará y necesitarás agregar el nuevo URI.
8. Click **Create**
9. **Copia el Client ID** (algo como: `873045856404-xxxxx.apps.googleusercontent.com`)
   - ⚠️ **NO necesitas el Client Secret para el móvil**

### Paso 2: Configurar .env

En `/mobile/.env`:

```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=tu_client_id_aqui.apps.googleusercontent.com
```

**Ejemplo real:**
```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=873045856404-ccvsiag0i9reie03n4ic12pcgs28dq1u.apps.googleusercontent.com
```

**⚠️ NO coloques el Client Secret** - solo es para el backend.

### Paso 3: Verificar el Redirect URI

Cuando inicies la app y hagas login con Google, si ves un error 400, el redirect URI aparece en el mensaje de error. Agrega ese URI exacto a Google Cloud Console.

**Ejemplo**: Si el error muestra `redirect_uri=exp://10.20.250.31:8081/--/oauth`, agrega exactamente ese URI.

También verás en la consola:
```
🔐 Google Auth Config:
  Redirect URI calculado: plantcare://oauth
  ⚠️ Si ves error 400, agrega este URI exacto en Google Cloud Console
```

### Paso 4: Reiniciar Expo

```bash
cd mobile
expo start --clear
```

---

## ✅ Verificación

1. Abre la app
2. Ve a la pantalla de login
3. Deberías ver el botón "Continuar con Google"
4. Al hacer click, debería abrir Google Sign-In sin errores
5. Después de autenticar, debería regresar a la app y loguearte

---

## 🐛 Si aún no funciona

El error muestra el redirect URI exacto que Google está rechazando. Por ejemplo:
```
Error 400: invalid_request
redirect_uri=exp://10.20.250.31:8081/--/oauth
```

**Solución**: Agrega ese URI exacto a Google Cloud Console en "Authorized redirect URIs".

1. **Copia el redirect URI del error** (ej: `exp://10.20.250.31:8081/--/oauth`)
2. **Ve a Google Cloud Console** → Tu Client ID → Edit
3. **Agrega ese URI exacto** en "Authorized redirect URIs"
4. **Guarda** los cambios
5. **Espera 1-2 minutos** para que los cambios se propaguen
6. **Intenta de nuevo** el login

**Nota**: Si cambias de red WiFi, tu IP cambiará y necesitarás agregar el nuevo URI.

---

## 📝 Notas

- **Client Secret**: Solo el backend lo usa, nunca en el cliente
- **@anonymous**: Se usa porque no estás logueado en Expo (`expo whoami` = "Not logged in")
- **Para producción**: Cuando hagas build, usa un Client ID tipo "iOS" o "Android"

---

## 🔗 URLs importantes

- [Google Cloud Console](https://console.cloud.google.com/)
- [Expo Auth Session Docs](https://docs.expo.dev/guides/authentication/#google)
