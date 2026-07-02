#!/bin/bash
# PlantCare Mobile — arranque seguro para Expo Go (LAN)
set -e

cd "$(dirname "$0")"
MOBILE_DIR="$(pwd)"

# IP local (WiFi)
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
if [ -z "$LAN_IP" ]; then
  echo "❌ No se pudo obtener IP local. ¿Estás conectado a WiFi?"
  exit 1
fi

export EXPO_PUBLIC_API_URL="http://${LAN_IP}:8000/api"
export EXPO_NO_DEPENDENCY_VALIDATION=1

# Sincronizar .env con la IP actual (Expo Go en dispositivo físico)
if [ -f .env ]; then
  if grep -q '^EXPO_PUBLIC_API_URL=' .env; then
    sed -i '' "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}|" .env
  else
    echo "EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}" >> .env
  fi
fi

echo "=============================================="
echo " PlantCare Mobile — Expo Go (LAN)"
echo "=============================================="
echo " API backend:  $EXPO_PUBLIC_API_URL"
echo " Expo URL:     exp://${LAN_IP}:8081"
echo " Health check: curl http://${LAN_IP}:8000/health"
echo "=============================================="

# Verificar backend
if ! curl -sf "http://${LAN_IP}:8000/health" >/dev/null 2>&1; then
  echo "⚠️  Backend no responde en :8000"
  echo "   Ejecuta en otra terminal: cd back && make up-dev"
  echo ""
fi

# Liberar puertos Expo (sin matar otros procesos node)
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:19000 | xargs kill -9 2>/dev/null || true
lsof -ti:19001 | xargs kill -9 2>/dev/null || true
pkill -f "expo start" 2>/dev/null || true
sleep 2

# Watchman: solo carpeta mobile
if command -v watchman >/dev/null 2>&1; then
  watchman watch-del-all >/dev/null 2>&1 || true
  watchman watch-project "$MOBILE_DIR" >/dev/null 2>&1 || true
fi

# --clear solo si pasas --fresh (reescanea todo node_modules, tarda 10+ min)
CLEAR_FLAG=""
if [ "${1:-}" = "--fresh" ]; then
  echo "🧹 Modo --fresh: limpiando caché (.expo, .metro)..."
  rm -rf .expo node_modules/.cache .metro 2>/dev/null || true
  CLEAR_FLAG="--clear"
fi

echo ""
echo "🚀 Iniciando Expo (escanea el QR con Expo Go SDK 54)..."
echo "   Tip: primera vez puede tardar 2-5 min. Usa --fresh solo si hay problemas."
echo "   Si se cuelga: abre OTRA terminal y ejecuta ./stop-expo.sh"
echo ""

# Sin 'exec' para que Ctrl+C llegue bien; trap limpia procesos hijos
trap './stop-expo.sh' INT TERM

./node_modules/.bin/expo start --host lan ${CLEAR_FLAG} --port 8081
