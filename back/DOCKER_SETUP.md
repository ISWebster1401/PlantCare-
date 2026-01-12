# 🔐 Docker Setup con Redis Password - Guía Rápida

## ✅ Configuración Aplicada

Redis ahora está configurado **CON contraseña** por seguridad.

### Password por defecto: `redis123`

⚠️ **IMPORTANTE**: Cambia este password en producción por uno más fuerte.

## 🚀 Pasos para Iniciar

### 1. Configurar Variables de Entorno

```bash
cd back

# Si no existe .env, créalo desde el ejemplo
cp env.example .env

# Edita .env y verifica que tenga:
# REDIS_PASSWORD=redis123
# REDIS_URL=redis://:redis123@localhost:6379/0
```

### 2. Iniciar Servicios

```bash
# Detener servicios anteriores (si existen)
docker-compose down -v

# Construir e iniciar
docker-compose up --build -d

# Ver logs
docker-compose logs -f
```

### 3. Verificar que Todo Funciona

```bash
# Test Redis con password (debe responder PONG)
docker exec -it plantcare-redis redis-cli -a redis123 PING

# Test Redis sin password (debe fallar - esto es BUENO)
docker exec -it plantcare-redis redis-cli PING
# Esperado: NOAUTH Authentication required

# Test backend health
curl http://localhost:8000/api/health

# Verificar estado de contenedores
docker-compose ps
# Todos deben estar "Up (healthy)"
```

## 🔒 Seguridad en Producción

### Cambiar Password

1. **Genera password fuerte:**
```bash
openssl rand -base64 32
```

2. **Actualiza .env:**
```env
REDIS_PASSWORD=tu_password_fuerte_aqui
REDIS_URL=redis://:tu_password_fuerte_aqui@redis:6379/0
```

3. **Reinicia servicios:**
```bash
docker-compose down -v
docker-compose up -d
```

### Ocultar Puerto Redis en Producción

En `docker-compose.yml`, sección `redis:`, comenta o elimina:
```yaml
redis:
  # ❌ QUITAR en producción:
  # ports:
  #   - "6379:6379"
  
  # ✅ Solo accesible desde Docker network
```

## 🧪 Test del Cache

```bash
# 1. Crear lectura de sensor
curl -X POST http://localhost:8000/api/sensors/data \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "TEST_DEVICE",
    "temperature": 25,
    "air_humidity": 60.5,
    "soil_moisture": 45.2
  }'

# 2. Verificar que se guardó en cache
docker exec -it plantcare-redis redis-cli -a redis123 KEYS "sensor:*"

# 3. Ver contenido del cache
docker exec -it plantcare-redis redis-cli -a redis123 GET "sensor:TEST_DEVICE:latest"
```

## 📝 Comandos Útiles

```bash
# Limpiar cache Redis
docker exec -it plantcare-redis redis-cli -a redis123 FLUSHALL

# Ver todas las keys
docker exec -it plantcare-redis redis-cli -a redis123 KEYS "*"

# Ver info de Redis
docker exec -it plantcare-redis redis-cli -a redis123 INFO

# Ver uso de memoria
docker exec -it plantcare-redis redis-cli -a redis123 INFO memory
```

## 🐛 Troubleshooting

### Error: "NOAUTH Authentication required"
- Verifica que `.env` tenga `REDIS_PASSWORD=redis123`
- Verifica que `REDIS_URL` incluya el password: `redis://:redis123@redis:6379/0`

### Error: "Connection refused"
- Verifica que Redis esté corriendo: `docker-compose ps redis`
- Verifica logs: `docker-compose logs redis`

### Backend no conecta a Redis
- Verifica variables de entorno: `docker-compose exec app env | grep REDIS`
- Verifica logs del backend: `docker-compose logs app | grep -i redis`
