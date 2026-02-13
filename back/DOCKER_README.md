# 🐳 Docker Setup - PlantCare Backend

Guía completa para ejecutar PlantCare Backend con Docker y Docker Compose.

## 📋 Requisitos Previos

- **Docker** 20.10+
- **Docker Compose** 2.0+
- Archivo `.env` configurado (ver `env.example`)

## 🚀 Inicio Rápido

### 1. Configurar Variables de Entorno

```bash
cd back
cp env.example .env
# Editar .env con tus credenciales
```

### 2. Iniciar Todos los Servicios

```bash
# Producción (sin hot reload)
docker-compose up -d

# Desarrollo (con hot reload)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 3. Ver Logs

```bash
# Todos los servicios
docker-compose logs -f

# Solo backend
docker-compose logs -f app

# Solo base de datos
docker-compose logs -f postgres

# Solo Redis
docker-compose logs -f redis
```

### 4. Verificar Estado

```bash
# Estado de todos los servicios
docker-compose ps

# Health checks
docker-compose ps --format "table {{.Name}}\t{{.Status}}"
```

## 📦 Servicios Incluidos

### 1. **Backend (FastAPI)**
- **Puerto**: 8000
- **Health Check**: `http://localhost:8000/api/health`
- **Documentación**: `http://localhost:8000/docs`

### 2. **PostgreSQL**
- **Puerto**: 5432
- **Usuario**: `postgres` (o según `.env`)
- **Base de datos**: `plantcare_db` (o según `.env`)

### 3. **Redis**
- **Puerto**: 6379
- **Persistencia**: Habilitada con AOF
- **Memoria máxima**: 256MB
- **Política**: LRU (Least Recently Used)

## 🛠️ Comandos Útiles

### Iniciar/Detener Servicios

```bash
# Iniciar en background
docker-compose up -d

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes (⚠️ elimina datos)
docker-compose down -v

# Reiniciar un servicio específico
docker-compose restart app
```

### Reconstruir Imágenes

```bash
# Reconstruir después de cambios en código
docker-compose build --no-cache app

# Reconstruir y reiniciar
docker-compose up -d --build app
```

### Acceder a Contenedores

```bash
# Shell en backend
docker-compose exec app bash

# Shell en PostgreSQL
docker-compose exec postgres psql -U postgres -d plantcare_db

# Shell en Redis
docker-compose exec redis redis-cli
```

### Gestión de Base de Datos

```bash
# Ejecutar migraciones SQL
docker-compose exec app python -c "
from app.api.core.database import init_db
import asyncio
asyncio.run(init_db())
"

# Backup de base de datos
docker-compose exec postgres pg_dump -U postgres plantcare_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
docker-compose exec -T postgres psql -U postgres plantcare_db < backup.sql
```

### Limpiar Cache Redis

```bash
# Conectar a Redis CLI
docker-compose exec redis redis-cli

# Dentro de redis-cli:
FLUSHALL  # Limpia todo el cache (⚠️ cuidado en producción)
KEYS *    # Ver todas las keys
```

## 🔧 Configuración de Desarrollo

### Hot Reload

Para desarrollo con hot reload automático:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Esto:
- ✅ Monta el código como volumen con permisos de escritura
- ✅ Activa `--reload` en uvicorn
- ✅ Detecta cambios y reinicia automáticamente

### Variables de Entorno para Desarrollo

En `docker-compose.dev.yml` se pueden agregar variables adicionales:

```yaml
environment:
  - RELOAD=true
  - DEBUG=true
  - LOG_LEVEL=DEBUG
```

## 🏭 Configuración de Producción

### Optimizaciones Recomendadas

1. **Comentar puertos expuestos** de PostgreSQL y Redis (solo acceso interno)
2. **Usar múltiples workers** de uvicorn (ajustar según CPU)
3. **Configurar límites de recursos**:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

4. **Usar reverse proxy** (nginx/traefik) para SSL/TLS
5. **Configurar backups automáticos** de PostgreSQL y Redis

### Ejemplo: docker-compose.prod.yml

```yaml
version: '3.8'

services:
  app:
    command: >
      uvicorn app.main:app 
      --host 0.0.0.0 
      --port 8000 
      --workers 4
      --access-log
      --log-level info

  postgres:
    ports: []  # No exponer en producción
    # O usar solo para backup: "5432:5432"

  redis:
    ports: []  # No exponer en producción
    command: >
      redis-server
      --appendonly yes
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --requirepass ${REDIS_PASSWORD}
```

## 📊 Monitoreo y Logs

### Ver Logs en Tiempo Real

```bash
# Todos los servicios
docker-compose logs -f

# Últimas 100 líneas de backend
docker-compose logs --tail=100 app

# Filtrar por error
docker-compose logs app | grep -i error
```

### Health Checks

Los servicios tienen health checks configurados. Verificar estado:

```bash
docker inspect plantcare-backend | jq '.[0].State.Health'
```

### Métricas

- **Backend**: `http://localhost:8000/api/health` (JSON con estado)
- **PostgreSQL**: `docker-compose exec postgres pg_isready`
- **Redis**: `docker-compose exec redis redis-cli ping`

## 🔐 Seguridad

### Buenas Prácticas

1. ✅ **No commitear `.env`** (ya en `.gitignore`)
2. ✅ **Usar contraseñas fuertes** en `.env`
3. ✅ **Usuario no-root** en Dockerfile (ya implementado)
4. ✅ **Health checks** configurados
5. ✅ **Restart policies** para alta disponibilidad
6. ⚠️ **En producción**: comentar puertos expuestos de DB/Redis

### Variables Sensibles

Nunca hardcodear en Dockerfiles. Usar:
- `.env` file (desarrollo)
- Docker secrets (producción con Docker Swarm)
- Variables de entorno del sistema (Kubernetes, etc.)

## 🐛 Troubleshooting

### Backend no inicia

```bash
# Ver logs detallados
docker-compose logs app

# Verificar conexión a DB
docker-compose exec app python -c "
from app.api.core.database import get_db
import asyncio
async def test():
    db = await get_db()
    print('✅ DB conectada')
asyncio.run(test())
"
```

### Error de conexión a PostgreSQL

```bash
# Verificar que PostgreSQL esté corriendo
docker-compose ps postgres

# Ver logs de PostgreSQL
docker-compose logs postgres

# Probar conexión manual
docker-compose exec app pg_isready -h postgres -p 5432
```

### Error de conexión a Redis

```bash
# Verificar que Redis esté corriendo
docker-compose ps redis

# Probar conexión
docker-compose exec redis redis-cli ping
```

### Limpiar Todo y Empezar de Nuevo

```bash
# ⚠️ CUIDADO: Esto elimina TODOS los datos
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

## 📚 Recursos Adicionales

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs: `docker-compose logs -f`
2. Verifica health checks: `docker-compose ps`
3. Consulta la documentación completa: `PROJECT_DOCUMENTATION_COMPLETE.md`
