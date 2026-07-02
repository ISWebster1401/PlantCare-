# ============================================
# Makefile para PlantCare Backend
# ============================================
# Simplifica comandos comunes de Docker

.PHONY: help build up down restart logs shell db-shell redis-cli clean rebuild

# Variables
COMPOSE = docker-compose
COMPOSE_DEV = docker-compose -f docker-compose.yml -f docker-compose.dev.yml

# ============================================
# Comandos Principales
# ============================================

help: ## Mostrar esta ayuda
	@echo "🌱 PlantCare Backend - Comandos disponibles:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

build: ## Construir imágenes Docker
	$(COMPOSE) build

up: ## Iniciar servicios (producción)
	$(COMPOSE) up -d
	@echo "✅ Servicios iniciados"
	@echo "📊 Backend: http://localhost:8000/docs"
	@echo "💾 PostgreSQL: localhost:5432"
	@echo "🔴 Redis: localhost:6379"

up-dev: ## Iniciar servicios (desarrollo con hot reload)
	$(COMPOSE_DEV) up -d
	@echo "✅ Servicios iniciados en modo desarrollo"
	@echo "📊 Backend: http://localhost:8000/docs"

down: ## Detener servicios
	$(COMPOSE) down
	@echo "⏹️  Servicios detenidos"

restart: ## Reiniciar servicios
	$(COMPOSE) restart
	@echo "🔄 Servicios reiniciados"

logs: ## Ver logs de todos los servicios
	$(COMPOSE) logs -f

logs-app: ## Ver logs solo del backend
	$(COMPOSE) logs -f app

logs-db: ## Ver logs de PostgreSQL
	$(COMPOSE) logs -f postgres

logs-redis: ## Ver logs de Redis
	$(COMPOSE) logs -f redis

# ============================================
# Acceso a Contenedores
# ============================================

shell: ## Acceder al shell del backend
	$(COMPOSE) exec app bash

db-shell: ## Acceder a PostgreSQL shell
	$(COMPOSE) exec postgres psql -U postgres -d plantcare_db

redis-cli: ## Acceder a Redis CLI
	$(COMPOSE) exec redis redis-cli

# ============================================
# Base de Datos
# ============================================

db-init: ## Inicializar base de datos
	$(COMPOSE) exec app python -c "from app.api.core.database import init_db; import asyncio; asyncio.run(init_db())"

db-backup: ## Hacer backup de la base de datos
	@mkdir -p backups
	$(COMPOSE) exec postgres pg_dump -U postgres plantcare_db > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup creado en backups/"

db-restore: ## Restaurar backup (uso: make db-restore FILE=backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "❌ Especifica el archivo: make db-restore FILE=backups/backup.sql"; \
		exit 1; \
	fi
	$(COMPOSE) exec -T postgres psql -U postgres plantcare_db < $(FILE)
	@echo "✅ Backup restaurado"

# ============================================
# Redis
# ============================================

redis-flush: ## Limpiar todo el cache de Redis
	@echo "⚠️  Limpiando cache de Redis..."
	$(COMPOSE) exec redis redis-cli FLUSHALL
	@echo "✅ Cache limpiado"

redis-keys: ## Ver todas las keys en Redis
	$(COMPOSE) exec redis redis-cli KEYS '*'

redis-info: ## Ver información de Redis
	$(COMPOSE) exec redis redis-cli INFO

# ============================================
# Limpieza
# ============================================

clean: ## Limpiar contenedores e imágenes (sin volúmenes)
	$(COMPOSE) down --rmi local
	@echo "🧹 Limpieza completada"

clean-all: ## ⚠️ Limpiar TODO incluyendo volúmenes (elimina datos)
	@echo "⚠️  ADVERTENCIA: Esto eliminará TODOS los datos"
	@read -p "¿Estás seguro? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(COMPOSE) down -v --rmi all; \
		echo "🧹 Limpieza completa"; \
	else \
		echo "❌ Cancelado"; \
	fi

rebuild: ## Reconstruir imágenes y reiniciar
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d
	@echo "✅ Reconstrucción completada"

# ============================================
# Desarrollo
# ============================================

dev: up-dev logs-app ## Iniciar en modo desarrollo y ver logs

test: ## Ejecutar tests (si existen)
	$(COMPOSE) exec app python -m pytest

lint: ## Ejecutar linter (si está configurado)
	$(COMPOSE) exec app python -m flake8 app/

format: ## Formatear código (si black está instalado)
	$(COMPOSE) exec app python -m black app/

# ============================================
# Estado y Health Checks
# ============================================

ps: ## Ver estado de servicios
	$(COMPOSE) ps

status: ## Ver estado detallado con health checks
	@echo "📊 Estado de servicios:"
	@$(COMPOSE) ps
	@echo ""
	@echo "🏥 Health Checks:"
	@docker inspect plantcare-backend --format='Backend: {{.State.Health.Status}}' 2>/dev/null || echo "Backend: no disponible"
	@docker inspect plantcare-postgres --format='PostgreSQL: {{.State.Health.Status}}' 2>/dev/null || echo "PostgreSQL: no disponible"
	@docker inspect plantcare-redis --format='Redis: {{.State.Health.Status}}' 2>/dev/null || echo "Redis: no disponible"

health: ## Verificar health del backend
	@curl -s http://localhost:8000/health | python -m json.tool || echo "❌ Backend no responde"

# ============================================
# Por defecto
# ============================================

.DEFAULT_GOAL := help
