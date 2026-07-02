#!/bin/bash
# Mata Expo/Metro sin cerrar la terminal (usa esto si Ctrl+C no responde)
echo "Deteniendo Expo/Metro..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:19000 | xargs kill -9 2>/dev/null || true
lsof -ti:19001 | xargs kill -9 2>/dev/null || true
pkill -9 -f "expo start" 2>/dev/null || true
pkill -9 -f "@expo/cli" 2>/dev/null || true
pkill -9 -f "metro start" 2>/dev/null || true
sleep 1
if lsof -iTCP:8081 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "⚠️  Puerto 8081 aún ocupado. Cierra la pestaña de Terminal donde corre Expo."
else
  echo "✅ Expo/Metro detenido. Puerto 8081 libre."
fi
