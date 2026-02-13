#!/bin/bash

echo "🧹 Limpiando procesos anteriores..."
pkill -9 node 2>/dev/null
lsof -ti:8081 | xargs kill -9 2>/dev/null
lsof -ti:19000 | xargs kill -9 2>/dev/null
lsof -ti:19001 | xargs kill -9 2>/dev/null

echo "🧹 Limpiando caché..."
rm -rf .expo node_modules/.cache .metro 2>/dev/null

echo "🚀 Iniciando Expo..."
echo "📍 Tu IP local es: $(ipconfig getifaddr en0 || ipconfig getifaddr en1)"

npx expo start --clear --host lan
