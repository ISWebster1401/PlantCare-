#!/bin/bash

# Script para arreglar problemas de conexión de Expo

echo "🔧 Limpiando procesos y puertos..."

# Matar procesos de Expo/Metro en el puerto 8081
lsof -ti:8081 | xargs kill -9 2>/dev/null
lsof -ti:19000 | xargs kill -9 2>/dev/null
lsof -ti:19001 | xargs kill -9 2>/dev/null

# Matar procesos de node relacionados con expo
pkill -f "expo start" 2>/dev/null
pkill -f "metro" 2>/dev/null

echo "🧹 Limpiando caché..."

# Limpiar caché
rm -rf .expo
rm -rf node_modules/.cache
rm -rf .metro
rm -rf .expo-shared

echo "✅ Limpieza completada"
echo ""
echo "📱 Ahora ejecuta uno de estos comandos:"
echo ""
echo "  Para LAN (misma red WiFi):"
echo "    npm run start:lan"
echo ""
echo "  Para Tunnel (funciona siempre):"
echo "    npm run start:tunnel"
echo ""
echo "  Para Localhost (solo simuladores):"
echo "    npm run start:localhost"
echo ""
