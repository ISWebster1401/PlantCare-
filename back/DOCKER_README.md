# 🐳 Docker Setup - PlantCare Backend

## Requisitos Previos

- Docker instalado
- Docker Compose instalado

## Configuración Rápida

### 1. Configurar Variables de Entorno

Copia el archivo de ejemplo y edítalo:

```bash
cp env.example .env
```

Edita `.env` y configura al menos:
- `DB_PASSWORD` - Contraseña para PostgreSQL
- `DB_DATABASE` - Nombre de la base de datos (default: `plantcare_db`)
- `DB_USER` - Usuario de PostgreSQL (default: `postgres`)

### 2. Construir y Ejecutar

```bash
# Construir las imágenes
docker-compose build

# Iniciar los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f app
```

### 3. Crear la Base de Datos

Una vez que los contenedores estén corriendo, ejecuta el script SQL:

```bash
# Ejecutar script SQL en el contenedor de PostgreSQL
docker-compose exec postgres psql -U postgres -d plantcare_db -f /tmp/create_database.sql

# O copiar el script y ejecutarlo
docker cp create_database.sql plantcare-postgres:/tmp/
docker-compose exec postgres psql -U postgres -d plantcare_db -f /tmp/create_database.sql
```

## Comandos Útiles

```bash
# Ver estado de los contenedores
docker-compose ps

# Ver logs
docker-compose logs -f app
docker-compose logs -f postgres

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes (CUIDADO: borra datos)
docker-compose down -v

# Reconstruir después de cambios
docker-compose up -d --build

# Acceder al contenedor de la app
docker-compose exec app bash

# Acceder a PostgreSQL
docker-compose exec postgres psql -U postgres -d plantcare_db
```

## Estructura

- **app**: Contenedor con la aplicación FastAPI
- **postgres**: Contenedor con PostgreSQL 15
- **Volúmenes**:
  - `plantcare_postgres_data`: Datos de PostgreSQL
  - `plantcare_api_data`: Datos de la aplicación
  - `plantcare_uploads_data`: Archivos subidos (avatars, etc.)

## Puertos

- **5000**: API FastAPI
- **5432**: PostgreSQL

## Health Checks

- **App**: `http://localhost:5000/api/health`
- **PostgreSQL**: Verifica que el servicio esté listo antes de iniciar la app

## Troubleshooting

### Error: "port already in use"

```bash
# Cambiar el puerto en docker-compose.yml
ports:
  - "5001:5000"  # Usar puerto 5001 en el host
```

### Error: "database does not exist"

```bash
# Crear la base de datos manualmente
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE plantcare_db;"
```

### Ver logs de errores

```bash
docker-compose logs app
docker-compose logs postgres
```

### Reiniciar todo desde cero

```bash
docker-compose down -v
docker-compose up -d --build
```

