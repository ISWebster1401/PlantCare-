# ============================================
# PlantCare Backend - Dockerfile
# ============================================
# Multi-stage build para optimizar tamaño de imagen
# Soporta desarrollo (hot reload) y producción

# Etapa 1: Builder (para dependencias que requieren compilación)
FROM python:3.11-slim AS builder

WORKDIR /app

# Instalar dependencias del sistema para compilación
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Etapa 2: Runtime (imagen final optimizada)
FROM python:3.11-slim

WORKDIR /app

# Instalar solo dependencias runtime del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    postgresql-client \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copiar dependencias Python instaladas desde builder
COPY --from=builder /root/.local /root/.local

# Asegurar que scripts en .local estén en PATH
ENV PATH=/root/.local/bin:$PATH

# Variables de entorno Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Crear usuario no-root para seguridad
RUN useradd --create-home --shell /bin/bash plantcare && \
    chown -R plantcare:plantcare /app

# Copiar código de la aplicación
COPY --chown=plantcare:plantcare . /app

# Crear directorios necesarios con permisos correctos
RUN mkdir -p /app/uploads/avatars /app/data /app/logs && \
    chown -R plantcare:plantcare /app/uploads /app/data /app/logs

# Cambiar a usuario no-root
USER plantcare

# Exponer puerto (ajustar según tu configuración)
EXPOSE 8000

# Health check. La ruta es /health: /api/health no existe y marcaba el
# contenedor como caido aunque la app respondiera bien.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl --fail http://localhost:${PORT:-8000}/health || exit 1

# Comando por defecto (produccion).
#
# Va en forma shell a proposito: los hosts como Railway asignan el puerto por
# la variable PORT y enrutan el trafico ahi. Con un puerto fijo la app queda
# escuchando donde nadie la busca y el despliegue falla sin errores visibles.
# En local no existe PORT y cae a 8000, que es lo que espera docker-compose.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
