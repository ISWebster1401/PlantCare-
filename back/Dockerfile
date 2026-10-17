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

# Crear usuario no-root ANTES de copiar dependencias, para poder asignarle
# la propiedad. pip las instala con --user en /root/.local (builder); si se
# dejan ahi, el usuario plantcare no puede leerlas (/root tiene permisos 700)
# y uvicorn arranca con "Permission denied" -> el contenedor muere -> 502.
# Por eso las dependencias van a la home de plantcare.
RUN useradd --create-home --shell /bin/bash plantcare && \
    chown -R plantcare:plantcare /app

# Copiar dependencias Python del builder a la home del usuario no-root
COPY --from=builder --chown=plantcare:plantcare /root/.local /home/plantcare/.local

# HOME explicito + PATH. Docker NO actualiza HOME al cambiar de USER, y Python
# lo necesita para resolver el "user site" (/home/plantcare/.local/lib/...).
# Sin HOME correcto, "python -m uvicorn" podria no encontrar los paquetes.
ENV HOME=/home/plantcare \
    PATH=/home/plantcare/.local/bin:$PATH

# Variables de entorno Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

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
# Se expande ${PORT} via 'sh -c' porque hosts como Railway asignan el puerto
# por esa variable y enrutan ahi; con un puerto fijo la app escucha donde nadie
# la busca y el deploy da 502 sin errores visibles. En local no existe PORT y
# cae a 8000, que es lo que espera docker-compose. Forma JSON (evita el warning
# del linter) y 'exec' para que uvicorn reemplace al shell y reciba SIGTERM.
CMD ["sh", "-c", "exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
