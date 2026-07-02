"""
Configuración para load testing de PlantCare.

Endpoints descubiertos mediante análisis del código:
- Login usa campo "email" (no "username")
- Token se retorna como "access_token"
- Plant identify espera multipart/form-data con campo "file"
"""

import os
from dotenv import load_dotenv

load_dotenv()

# URL del backend
BASE_URL = os.getenv("LOAD_TEST_BASE_URL", "http://localhost:8000")

# ============================================
# CONFIGURACIÓN DE USUARIOS DE PRUEBA
# ============================================

TEST_USER_COUNT = 100
TEST_USER_EMAIL_TEMPLATE = "testuser{}@loadtest.com"
TEST_USER_PASSWORD = "TestPass123!"  # Cumple requisitos: mayúscula, minúscula, número, especial

# ============================================
# ENDPOINTS - Basados en análisis del código
# ============================================

ENDPOINTS = {
    # Autenticación (back/app/api/routes/auth.py)
    "login": "/api/auth/login",
    "register": "/api/auth/register",
    "me": "/api/auth/me",
    
    # Plantas (back/app/api/routes/plants.py)
    "plants": "/api/plants/",
    "plant_detail": "/api/plants/{}",
    "identify": "/api/plants/identify",
    "pokedex_scan": "/api/plants/pokedex/scan",
    
    # Sensores (back/app/api/routes/sensors.py)
    "sensors": "/api/sensors/",
    "sensor_latest": "/api/sensors/{}/latest",
    "sensor_readings": "/api/sensors/{}/readings",
    
    # IA (back/app/api/routes/ai.py)
    "ai_chat": "/api/ai/chat",
    "ai_ask": "/api/ai/ask",
    "ai_analyze": "/api/ai/analyze-device",
    "ai_conversations": "/api/ai/conversations",
    
    # Reportes (back/app/api/routes/reports.py)
    "dashboard": "/api/reports/user/dashboard-data",
    
    # Health check
    "health": "/health",
}

# ============================================
# CONFIGURACIÓN DE LOCUST
# ============================================

LOCUST_CONFIG = {
    "min_wait": 1000,   # Tiempo mínimo entre requests (ms)
    "max_wait": 3000,   # Tiempo máximo entre requests (ms)
}

# ============================================
# PESOS DE LAS TAREAS
# ============================================
# Mayor peso = más frecuente
# scan_plant tiene peso bajo porque es la operación más pesada

TASK_WEIGHTS = {
    "get_plants": 5,          # Listar plantas - muy frecuente
    "get_sensors": 4,         # Listar sensores
    "get_dashboard": 3,       # Dashboard
    "scan_plant": 2,          # Scan con AI - moderado (es pesado)
    "ai_chat": 2,             # Chat con AI
    "get_sensor_data": 4,     # Datos de sensor específico
    "get_profile": 1,         # Perfil del usuario
}

# ============================================
# IDS SIMULADOS PARA PRUEBAS
# ============================================
# Estos IDs se usan cuando no hay datos reales en la BD

MOCK_IDS = {
    "sensors": list(range(1, 51)),
    "plants": list(range(1, 31)),
    "devices": [f"WEMOS_{i:04d}" for i in range(1, 51)]
}

# ============================================
# IMAGEN DE PRUEBA (1x1 pixel PNG en base64)
# ============================================
# Se usa para simular uploads de imágenes sin enviar archivos grandes

FAKE_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

# Imagen más realista (10x10 pixel verde)
FAKE_PLANT_IMAGE_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVQYV2Nk"
    "+A+EFADGUIVKyIEBALuRAzIvzr7xAAAAAElFTkSuQmCC"
)
