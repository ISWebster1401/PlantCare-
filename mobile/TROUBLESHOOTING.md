# 🔧 Solución de Problemas - PlantCare Mobile

## Error "PlatformConstants could not be found" / "runtime not ready"

Si la app se abre en Expo Go pero ves una pantalla roja con **Invariant Violation** y algo como *'PlatformConstants' could not be found* o *TurboModuleRegistry.getEnforcing*, suele ser por **caché antigua** (bundle de otra versión de SDK) o porque **Expo Go no coincide** con el SDK del proyecto.

### Pasos (hacer en este orden):

1. **Actualizar Expo Go en el teléfono**  
   En App Store (iOS) o Play Store (Android), busca "Expo Go" e instala la última versión (SDK 54).

2. **Cerrar Expo Go por completo**  
   En iOS: subir y quitar la app del carrusel. En Android: Forzar cierre desde Ajustes.

3. **Limpiar caché y arrancar de nuevo** (en la carpeta `mobile`):
   ```bash
   npm run start:fresh
   ```
   O manualmente:
   ```bash
   rm -rf .expo node_modules/.cache .metro
   npx expo start --clear
   ```

4. **Abrir de nuevo en el teléfono**  
   Escanea el QR otra vez (o entra por "Enter URL manually" con la URL que muestra Metro). No abras un proyecto "reciente" antiguo en Expo Go.

5. **Si sigue fallando**, alinear dependencias con Expo:
   ```bash
   npx expo install --fix
   npm run start:fresh
   ```

El proyecto está en **Expo SDK 54**; Expo Go en el dispositivo debe ser también la versión para SDK 54 (la última en la tienda).

---

## Problema: "the request timed out" al escanear QR

Este error ocurre cuando tu teléfono no puede conectarse al servidor de desarrollo de Expo en tu computadora.

## Soluciones (en orden de recomendación):

### 1. Usar Modo Tunnel (RECOMENDADO para problemas de red)

```bash
cd mobile
npx expo start --tunnel
```

El modo tunnel usa los servidores de Expo para conectar tu teléfono, es más lento pero funciona incluso si están en redes diferentes.

### 2. Verificar que ambos están en la misma red WiFi

- Tu computadora y tu teléfono deben estar en la **misma red WiFi**
- Verifica la IP de tu computadora: `ifconfig` (Mac/Linux) o `ipconfig` (Windows)
- La IP debe empezar igual (ej: 10.20.252.x)

### 3. Verificar Firewall

En Mac:
```bash
# Permitir conexiones entrantes para Node/Expo
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
```

### 4. Usar LAN explícito

```bash
npx expo start --lan
```

### 5. Verificar puerto 8081

Asegúrate que el puerto 8081 no esté bloqueado:
```bash
# Mac: Verificar si algo está usando el puerto
lsof -i :8081

# Si hay algo, puedes matarlo o cambiar el puerto:
npx expo start --port 8082
```

### 6. Usar Expo Go directamente (si está disponible)

Si tienes problemas persistentes, puedes:
1. Abrir Expo Go en tu teléfono
2. Escribir manualmente la URL: `exp://10.20.252.184:8081`

### 7. Alternativa: Usar Simulador iOS (solo si tienes Mac)

```bash
npx expo start --ios
```

Esto abre el simulador directamente sin necesidad de escanear QR.

## Verificación de Red

Para verificar que tu teléfono puede alcanzar tu computadora:

```bash
# En tu Mac, inicia un servidor simple en el puerto 8081
python3 -m http.server 8081

# Luego desde tu teléfono (en el navegador), intenta:
http://10.20.252.184:8081

# Si esto funciona, el problema está en Expo, usa --tunnel
# Si esto NO funciona, el problema es de red/firewall
```

## Configuración de API URL

Si logras conectar pero la app no puede comunicarse con el backend:

1. Verifica que tu backend esté corriendo en `http://10.20.252.184:8000`
2. Actualiza `.env` con la IP correcta:
   ```
   EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:8000/api
   ```
3. Reinicia Expo después de cambiar `.env`

## Recomendación Final

Si nada funciona, usa **modo tunnel** que es el más confiable:

```bash
cd mobile
npx expo start --tunnel
```

Es más lento, pero funciona siempre.
