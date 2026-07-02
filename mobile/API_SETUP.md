# PlantCare Mobile — API Setup

## URL del backend

La app móvil usa `EXPO_PUBLIC_API_URL` para todas las requests.

### Dispositivo físico (Expo Go)

Usa la **IP local de tu Mac**, no `localhost`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.21:8000/api
```

Archivos:
- [`.env`](./.env) — variables de entorno (no subir a git)
- [`constants/Config.ts`](./constants/Config.ts) — fallback si no hay `.env`

Obtener IP:

```bash
ipconfig getifaddr en0
```

### Simulador iOS

Puedes usar:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

## Verificar conectividad

Con el backend corriendo (`cd back && make up-dev`):

```bash
curl http://TU_IP:8000/health
curl http://TU_IP:8000/docs
```

Desde el teléfono (misma WiFi), el health check debe responder `200`.

## Expo Go

1. Arranca Expo: `./start-dev.sh` o `npm run start:dev`
2. Escanea el QR o abre manualmente: `exp://TU_IP:8081`
3. Asegúrate de tener **Expo Go SDK 54**

## Troubleshooting

- **Network Error en login**: revisa que `EXPO_PUBLIC_API_URL` use tu IP LAN, no `localhost`
- **Timeout al escanear QR**: prueba `./node_modules/.bin/expo start --tunnel --clear`
- Ver también [QUICK_START.md](./QUICK_START.md) y [CONNECTION_TROUBLESHOOTING.md](./CONNECTION_TROUBLESHOOTING.md)
