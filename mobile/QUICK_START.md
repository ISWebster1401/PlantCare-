# PlantCare Mobile — Quick Start (Expo Go)

## Prerrequisitos

- Docker Desktop abierto
- Node.js 18+
- Expo Go en el teléfono (SDK 54)
- Mac y teléfono en la **misma WiFi**

## 1. Backend

```bash
cd back
make up-dev
curl http://localhost:8000/health
```

## 2. IP local

```bash
ipconfig getifaddr en0
```

Actualiza `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://TU_IP:8000/api
```

## 3. Expo (en Terminal.app)

```bash
cd mobile
export EXPO_PUBLIC_API_URL=http://TU_IP:8000/api
lsof -ti:8081 | xargs kill -9 2>/dev/null
./node_modules/.bin/expo start --host lan --clear
```

**No uses** `npm start` si tienes otros proyectos Node: mata todos los procesos `node`.

Alternativa segura: `npm run start:lan`

## 4. Expo Go

1. Abre Expo Go
2. Escanea el QR de la terminal
3. O URL manual: `exp://TU_IP:8081`

Si falla LAN:

```bash
./node_modules/.bin/expo start --tunnel --clear
```

## Troubleshooting

Ver [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) y [CONNECTION_TROUBLESHOOTING.md](./CONNECTION_TROUBLESHOOTING.md).
