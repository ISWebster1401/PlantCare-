# 🔧 Guía de Solución de Problemas de Conexión Expo Go

## Problema: "Could not connect to development server"

Si estás viendo este error en Android e iOS, sigue estos pasos en orden:

## ✅ Solución 1: Verificar Firewall (macOS)

1. **Abrir Configuración del Sistema** → **Red** → **Firewall**
2. **Desactivar temporalmente el Firewall** para probar
3. Si funciona, **activar el Firewall** y agregar excepciones:
   - Permitir conexiones entrantes para **Node.js**
   - Permitir conexiones entrantes para **Terminal**

## ✅ Solución 2: Verificar que estás en la misma red WiFi

1. **PC/Mac y dispositivo móvil deben estar en la misma red WiFi**
2. No uses redes 5G separadas o guest networks

## ✅ Solución 3: Obtener tu IP correcta

```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# O más específico:
ipconfig getifaddr en0  # Para WiFi
ipconfig getifaddr en1  # Para Ethernet
```

## ✅ Solución 4: Probar diferentes modos de conexión

### Opción A: Modo LAN (más rápido, requiere misma red)
```bash
npm run start:lan
```
- Escanea el QR que aparece
- Si no funciona, sigue a la siguiente opción

### Opción B: Modo Tunnel (más lento, pero funciona siempre)
```bash
npm run start:tunnel
```
- Escanea el QR que aparece
- Funciona incluso si estás en redes diferentes
- Puede ser más lento por el túnel ngrok

### Opción C: Modo Localhost (solo para simuladores)
```bash
npm run start:localhost
```
- Solo funciona con simuladores iOS/Android
- No funciona con dispositivos físicos

## ✅ Solución 5: Limpiar caché y reiniciar

```bash
# Limpiar todo
rm -rf node_modules/.cache .expo
npm start -- --clear

# O reiniciar Metro manualmente
npx expo start --clear
```

## ✅ Solución 6: Verificar puerto 8081

```bash
# Verificar que el puerto 8081 esté libre
lsof -i :8081

# Si hay algo corriendo, matarlo:
kill -9 $(lsof -t -i:8081)
```

## ✅ Solución 7: Configurar manualmente la IP en Expo Go

1. Abre **Expo Go** en tu dispositivo
2. Agita el dispositivo (shake gesture) o presiona `Cmd+D` (iOS) / `Cmd+M` (Android)
3. Ve a **"Dev settings"** o **"Configuración de desarrollo"**
4. En **"Debug server host & port for device"**, ingresa:
   ```
   TU_IP:8081
   ```
   Ejemplo: `192.168.1.184:8081`
5. Presiona **"Reload"** o **"Recargar"**

## ✅ Solución 8: Usar adb reverse (solo Android, USB conectado)

```bash
# Conecta tu Android por USB
adb reverse tcp:8081 tcp:8081
adb reverse tcp:19000 tcp:19000
adb reverse tcp:19001 tcp:19001

# Luego inicia Expo normalmente
npm start
```

## 🚨 Si NADA funciona

1. **Reinicia tu router WiFi**
2. **Reinicia tu Mac/PC**
3. **Reinicia tu dispositivo móvil**
4. **Prueba con otro dispositivo** para descartar problemas del dispositivo
5. **Usa modo tunnel** que es el más confiable:
   ```bash
   npm run start:tunnel
   ```

## 📝 Notas Importantes

- **Modo Tunnel** es más lento pero funciona siempre, incluso con firewalls
- **Modo LAN** es más rápido pero requiere configuración de red correcta
- El error `xcrun simctl` es solo para iOS Simulator, no afecta dispositivos físicos
- Si cambias de red WiFi, necesitas actualizar la IP en `Config.ts`

## 🔍 Verificar conexión

Una vez conectado, deberías ver en los logs:
```
✅ GET /auth/login - 200
✅ GET /plants/ - 200
```

Si ves errores de red, verifica que el backend esté corriendo:
```bash
cd ../back
docker-compose up
```
