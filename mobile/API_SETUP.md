# 📱 Configuración de Conexión Backend - Mobile

## 🔍 Problema

El error "Network Error" ocurre cuando la app móvil no puede conectarse al backend porque está usando `127.0.0.1` (localhost), que en un dispositivo físico apunta al dispositivo mismo, no a tu computadora.

## ✅ Solución

### Paso 1: Obtener tu IP Local

Ejecuta este comando en tu terminal:

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1
```

O en Mac puedes usar:

```bash
ipconfig getifaddr en0
```

Esto te dará algo como: `10.20.252.184` (tu IP puede ser diferente)

### Paso 2: Verificar que el Backend esté corriendo

En tu terminal, ve a la carpeta del backend y ejecuta:

```bash
cd back
# Asegúrate de que tu .env tenga las configuraciones correctas
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**IMPORTANTE:** Usa `--host 0.0.0.0` para que el backend acepte conexiones desde otras máquinas en la red, no solo localhost.

### Paso 3: Configurar la URL en la App Móvil

Tienes dos opciones:

#### Opción A: Crear archivo .env (RECOMENDADO)

Crea un archivo `.env` en la carpeta `mobile/`:

```bash
cd mobile
echo "EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:8000/api" > .env
```

Reemplaza `TU_IP_LOCAL` con la IP que obtuviste en el Paso 1.

**Ejemplo:**
```
EXPO_PUBLIC_API_URL=http://10.20.252.184:8000/api
```

#### Opción B: Modificar Config.ts directamente

Si prefieres no usar .env, edita `mobile/constants/Config.ts`:

```typescript
export const Config = {
  API_URL: 'http://10.20.252.184:8000/api', // Reemplaza con tu IP
};
```

### Paso 4: Reiniciar Expo

Después de cambiar la configuración:

```bash
cd mobile
# Detén Expo (Ctrl+C si está corriendo)
npx expo start --clear
```

### Paso 5: Verificar Conexión

1. Abre la app en tu teléfono
2. Intenta registrarte o iniciar sesión
3. Si funciona, deberías poder autenticarte correctamente

## 🔧 Troubleshooting

### Si sigue sin funcionar:

1. **Verifica que ambos estén en la misma red WiFi:**
   - Tu Mac y tu teléfono deben estar en la misma red WiFi

2. **Verifica el Firewall de tu Mac:**
   ```bash
   # Permitir conexiones al puerto 8000
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/python3
   ```

3. **Prueba la conexión desde tu teléfono:**
   - Abre Safari en tu iPhone
   - Ve a: `http://TU_IP:8000/docs` (debería mostrar la documentación de FastAPI)
   - Si esto funciona, el problema está en la app. Si no, es un problema de red/firewall

4. **Usa modo tunnel (alternativa):**
   Si nada funciona, puedes usar ngrok o similar para crear un túnel público al backend, pero esto es más complejo.

## 📝 Notas Importantes

- Cada vez que cambies de red WiFi, necesitarás actualizar la IP
- Si usas el simulador iOS en tu Mac, puedes usar `http://localhost:8000/api`
- Para producción, usarás una URL pública del backend
