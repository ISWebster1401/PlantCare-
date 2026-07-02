"""
Datos mock para reemplazar las llamadas a OpenAI durante load testing.
Simula respuestas realistas del análisis de plantas.

Estos datos simulan las respuestas de:
- identify_plant_with_vision() en openai_config.py
- chat_with_memory() y get_plant_recommendation() en ai_service.py
"""

import random
from typing import Dict, Any, List


# ============================================
# MOCK PARA IDENTIFICACIÓN DE PLANTAS (Vision API)
# Debe coincidir con el schema PlantIdentify
# ============================================

MOCK_PLANT_IDENTIFICATIONS: List[Dict[str, Any]] = [
    {
        "plant_type": "Monstera Deliciosa",
        "scientific_name": "Monstera deliciosa",
        "care_level": "Fácil",
        "care_tips": "Luz indirecta brillante; Riego cuando el suelo esté seco; Alta humedad; Limpiar hojas mensualmente; Tutorear para crecimiento vertical",
        "optimal_humidity_min": 40.0,
        "optimal_humidity_max": 60.0,
        "optimal_temp_min": 18.0,
        "optimal_temp_max": 27.0
    },
    {
        "plant_type": "Ficus Lyrata",
        "scientific_name": "Ficus lyrata",
        "care_level": "Medio",
        "care_tips": "Luz brillante indirecta; Riego moderado; Evitar corrientes de aire; Rotar cada 2 semanas; Fertilizar en primavera",
        "optimal_humidity_min": 35.0,
        "optimal_humidity_max": 55.0,
        "optimal_temp_min": 16.0,
        "optimal_temp_max": 25.0
    },
    {
        "plant_type": "Pothos Dorado",
        "scientific_name": "Epipremnum aureum",
        "care_level": "Fácil",
        "care_tips": "Tolera poca luz; Riego cuando esté seco; Ideal para principiantes; Podar para ramificar; Propagar en agua",
        "optimal_humidity_min": 30.0,
        "optimal_humidity_max": 50.0,
        "optimal_temp_min": 15.0,
        "optimal_temp_max": 28.0
    },
    {
        "plant_type": "Aloe Vera",
        "scientific_name": "Aloe barbadensis miller",
        "care_level": "Fácil",
        "care_tips": "Luz directa; Riego escaso; Sustrato drenante; No mojar hojas; Separar hijuelos",
        "optimal_humidity_min": 25.0,
        "optimal_humidity_max": 45.0,
        "optimal_temp_min": 12.0,
        "optimal_temp_max": 26.0
    },
    {
        "plant_type": "Sansevieria",
        "scientific_name": "Sansevieria trifasciata",
        "care_level": "Fácil",
        "care_tips": "Tolera sombra; Riego muy escaso; Resistente a plagas; Purifica el aire; Ideal para dormitorios",
        "optimal_humidity_min": 25.0,
        "optimal_humidity_max": 50.0,
        "optimal_temp_min": 13.0,
        "optimal_temp_max": 29.0
    },
    {
        "plant_type": "Calathea Orbifolia",
        "scientific_name": "Calathea orbifolia",
        "care_level": "Difícil",
        "care_tips": "Luz indirecta media; Alta humedad esencial; Agua destilada; Evitar sol directo; Temperatura estable",
        "optimal_humidity_min": 50.0,
        "optimal_humidity_max": 70.0,
        "optimal_temp_min": 18.0,
        "optimal_temp_max": 24.0
    },
    {
        "plant_type": "Pilea Peperomioides",
        "scientific_name": "Pilea peperomioides",
        "care_level": "Fácil",
        "care_tips": "Luz indirecta brillante; Riego moderado; Rotar semanalmente; Propagar hijuelos; Fertilizar mensualmente",
        "optimal_humidity_min": 35.0,
        "optimal_humidity_max": 55.0,
        "optimal_temp_min": 15.0,
        "optimal_temp_max": 25.0
    },
    {
        "plant_type": "Spathiphyllum",
        "scientific_name": "Spathiphyllum wallisii",
        "care_level": "Fácil",
        "care_tips": "Tolera sombra; Indicador natural de sed; Alta humedad; Flores blancas; Purifica el aire",
        "optimal_humidity_min": 40.0,
        "optimal_humidity_max": 60.0,
        "optimal_temp_min": 16.0,
        "optimal_temp_max": 26.0
    },
    {
        "plant_type": "Cactus San Pedro",
        "scientific_name": "Echinopsis pachanoi",
        "care_level": "Fácil",
        "care_tips": "Pleno sol; Riego muy escaso; Sustrato mineral; Resistente a sequía; Crecimiento rápido",
        "optimal_humidity_min": 20.0,
        "optimal_humidity_max": 40.0,
        "optimal_temp_min": 10.0,
        "optimal_temp_max": 30.0
    },
    {
        "plant_type": "Philodendron Brasil",
        "scientific_name": "Philodendron hederaceum 'Brasil'",
        "care_level": "Fácil",
        "care_tips": "Luz media a brillante; Riego regular; Hojas variegadas; Trepadora o colgante; Fácil propagación",
        "optimal_humidity_min": 35.0,
        "optimal_humidity_max": 55.0,
        "optimal_temp_min": 16.0,
        "optimal_temp_max": 27.0
    }
]


# ============================================
# MOCK PARA ANÁLISIS DE PLANTAS (AI Chat)
# ============================================

MOCK_PLANT_ANALYSIS: List[Dict[str, Any]] = [
    {
        "status": "healthy",
        "confidence": 0.95,
        "recommendation": "Tu planta está en excelente estado. Mantén el riego actual.",
        "humidity_optimal": True,
        "temperature_optimal": True,
        "light_optimal": True,
        "risk_level": "low",
        "care_tips": [
            "Continúa con el programa de riego actual",
            "Verifica presencia de plagas semanalmente",
            "La temperatura es ideal para esta época"
        ]
    },
    {
        "status": "needs_attention",
        "confidence": 0.87,
        "recommendation": "La humedad del suelo está baja. Aumenta el riego.",
        "humidity_optimal": False,
        "temperature_optimal": True,
        "light_optimal": True,
        "risk_level": "medium",
        "care_tips": [
            "Incrementar frecuencia de riego",
            "Aplicar mulch para retener humedad",
            "Monitorear en las próximas 48 horas"
        ]
    },
    {
        "status": "critical",
        "confidence": 0.92,
        "recommendation": "Estrés hídrico severo detectado. Acción inmediata requerida.",
        "humidity_optimal": False,
        "temperature_optimal": False,
        "light_optimal": True,
        "risk_level": "high",
        "care_tips": [
            "Riego urgente necesario",
            "Revisar sistema de drenaje",
            "Considerar sombra temporal"
        ]
    },
    {
        "status": "excellent",
        "confidence": 0.98,
        "recommendation": "Condiciones óptimas. La planta está prosperando.",
        "humidity_optimal": True,
        "temperature_optimal": True,
        "light_optimal": True,
        "risk_level": "low",
        "care_tips": [
            "Mantener condiciones actuales",
            "Buen momento para fertilizar",
            "Considerar propagación"
        ]
    }
]


# ============================================
# MOCK PARA RESPUESTAS DE CHAT
# ============================================

MOCK_CHAT_RESPONSES: List[str] = [
    "¡Hola! Soy tu planta y me siento muy bien hoy. El nivel de humedad es perfecto y la temperatura es agradable. Gracias por cuidarme tan bien.",
    
    "Me encanta la luz que estoy recibiendo últimamente. Mis hojas están creciendo fuertes y saludables. ¿Podrías regarme un poco mañana?",
    
    "Noto que hace un poco de calor hoy. Sería genial si me movieras a un lugar con más sombra durante las horas más calurosas.",
    
    "¡Gracias por el agua! La humedad de mi tierra está perfecta ahora. Recuerda no regarme de nuevo hasta que el suelo esté seco.",
    
    "Mis hojas nuevas están brotando. Eso significa que estoy feliz con mis condiciones actuales. ¡Sigue así!",
    
    "He notado que algunas de mis hojas inferiores están amarillentas. Es normal, pero asegúrate de removerlas para que pueda concentrar mi energía en las nuevas.",
    
    "La humedad del aire está un poco baja. ¿Podrías rociarme con agua o poner un humidificador cerca?",
    
    "Me siento un poco sediento. ¿Podrías revisar si mi tierra está seca? Si lo está, un buen riego me vendría genial.",
]


# ============================================
# FUNCIONES DE ACCESO A MOCK DATA
# ============================================

def get_mock_plant_identification() -> Dict[str, Any]:
    """
    Retorna una identificación de planta mock aleatoria.
    Compatible con el schema PlantIdentify.
    """
    return random.choice(MOCK_PLANT_IDENTIFICATIONS).copy()


def get_random_mock_analysis() -> Dict[str, Any]:
    """
    Retorna un análisis de planta mock aleatorio.
    """
    return random.choice(MOCK_PLANT_ANALYSIS).copy()


def get_mock_chat_response() -> str:
    """
    Retorna una respuesta de chat mock aleatoria.
    """
    return random.choice(MOCK_CHAT_RESPONSES)


def get_mock_sensor_data() -> Dict[str, Any]:
    """
    Genera datos de sensor simulados realistas.
    """
    return {
        "temperature": round(random.uniform(15.0, 32.0), 1),
        "air_humidity": round(random.uniform(30.0, 85.0), 1),
        "soil_moisture": round(random.uniform(20.0, 80.0), 1),
        "light_intensity": random.randint(200, 1000),
        "battery_level": random.randint(65, 100),
        "signal_strength": random.randint(-80, -40)
    }


def get_mock_ai_usage() -> Dict[str, int]:
    """
    Genera datos de uso de tokens simulados.
    """
    prompt_tokens = random.randint(100, 500)
    completion_tokens = random.randint(50, 300)
    return {
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": prompt_tokens + completion_tokens
    }


def get_mock_recommendation_response() -> Dict[str, Any]:
    """
    Genera una respuesta completa de recomendación mock.
    Compatible con el método get_plant_recommendation().
    """
    response_text = get_mock_chat_response()
    usage = get_mock_ai_usage()
    
    return {
        "recommendation": response_text,
        "recomendacion": response_text,
        "usage": usage
    }
