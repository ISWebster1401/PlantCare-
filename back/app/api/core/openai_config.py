"""
Configuración de OpenAI para identificación de plantas y generación de personajes.
"""
import openai
import os
import json
import asyncio
import random
from typing import Dict, Optional
import logging
from .config import settings

logger = logging.getLogger(__name__)

# Validar que la API key esté configurada
if not settings.OPENAI_API_KEY:
    logger.warning("⚠️ OPENAI_API_KEY no está configurada. Las funciones de IA no funcionarán.")
else:
    logger.info("✅ OPENAI_API_KEY configurada correctamente")


class AIServiceError(Exception):
    """
    Error del servicio de IA con un mensaje ya listo para mostrar al usuario.
    Evita filtrar el JSON crudo de OpenAI (quota, keys, etc.) a la app.
    """
    def __init__(self, user_message: str, status_code: int = 503):
        self.user_message = user_message
        self.status_code = status_code
        super().__init__(user_message)


def _friendly_openai_error(e: Exception) -> AIServiceError:
    """Traduce una excepción de OpenAI a un AIServiceError con mensaje amigable."""
    # Sin créditos / cuota agotada (429 insufficient_quota)
    if isinstance(e, openai.RateLimitError):
        detail = str(e).lower()
        if "insufficient_quota" in detail or "exceeded your current quota" in detail:
            return AIServiceError(
                "El servicio de identificación no está disponible por ahora. "
                "Vuelve a intentarlo más tarde.", 503,
            )
        return AIServiceError(
            "Hay muchas solicitudes en este momento. Espera unos segundos e intenta de nuevo.", 429,
        )
    # API key inválida / permisos
    if isinstance(e, (openai.AuthenticationError, openai.PermissionDeniedError)):
        return AIServiceError(
            "El servicio de identificación no está disponible por ahora. "
            "Vuelve a intentarlo más tarde.", 503,
        )
    # Timeouts / problemas de conexión con OpenAI
    if isinstance(e, (openai.APITimeoutError, openai.APIConnectionError)):
        return AIServiceError(
            "La identificación tardó demasiado. Revisa tu conexión e intenta de nuevo.", 504,
        )
    # Cualquier otro error de la IA
    return AIServiceError("No se pudo identificar la planta. Intenta con otra foto.", 502)


# Errores de OpenAI que NO tiene sentido reintentar con el fallback
# (misma cuenta/key: si no hay créditos o la key es inválida, el 2º intento
# fallaría igual y gastaría otra llamada).
_NON_RETRYABLE_OPENAI = (
    openai.RateLimitError,
    openai.AuthenticationError,
    openai.PermissionDeniedError,
)


async def identify_plant(
    image_bytes: bytes,
    filename: str,
    image_url: str,
    plant_species: Optional[str] = None,
) -> Dict[str, any]:
    """
    Identifica una planta con el proveedor configurado en settings.PLANT_ID_PROVIDER.

    - "plantnet": usa Pl@ntNet con los bytes de la imagen (gratis, sin OpenAI).
    - "openai" (u otro): usa GPT-4o Vision con la URL de la imagen (requiere créditos).

    Ambos devuelven el mismo dict (plant_type, scientific_name, care_level,
    care_tips, rangos óptimos), así que el resto del flujo no cambia.
    """
    if settings.PLANT_ID_PROVIDER == "plantnet" and settings.PLANTNET_API_KEY:
        # Import diferido: evita el ciclo openai_config <-> plantnet_config
        from .plantnet_config import identify_plant_with_plantnet
        return identify_plant_with_plantnet(image_bytes, filename, plant_species)
    return await identify_plant_with_vision(image_url, plant_species=plant_species)


async def identify_plant_with_vision(image_url: str, plant_species: Optional[str] = None) -> Dict[str, any]:
    """
    Usa GPT-4o Vision para identificar una planta con alta precisión.
    Implementa múltiples mejoras para maximizar la exactitud:
    - Prompt detallado y estructurado
    - Temperature=0 para respuestas deterministas
    - Structured outputs para garantizar JSON válido
    - Max tokens aumentado para respuestas completas
    - Si se proporciona plant_species, se usa como pista para mejorar la identificación
    
    Args:
        image_url: URL de la imagen de la planta
        plant_species: (Opcional) Especie/tipo de planta si el usuario la conoce.
                      Se usa como contexto adicional para mejorar la identificación.
    
    Returns:
        dict con: plant_type, scientific_name, care_level, care_tips, 
                 optimal_humidity_min, optimal_humidity_max, 
                 optimal_temp_min, optimal_temp_max
    
    Raises:
        Exception: Si falla la identificación
    """
    # TESTING MODE - Retornar mock sin llamar a OpenAI
    if settings.TESTING_MODE:
        from load_testing.mock_data import get_mock_plant_identification
        await asyncio.sleep(random.uniform(0.15, 0.35))  # Simular delay de API
        mock_result = get_mock_plant_identification()
        logger.info(f"🧪 TESTING_MODE: Retornando mock para identificación de planta: {mock_result['plant_type']}")
        return mock_result
    
    if not settings.OPENAI_API_KEY:
        raise Exception("OPENAI_API_KEY no está configurada. Por favor, configura la variable de entorno OPENAI_API_KEY.")
    
    # Esquema JSON para structured outputs (garantiza formato válido)
    response_format = {
        "type": "json_schema",
        "json_schema": {
            "name": "plant_identification",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "plant_type": {
                        "type": "string",
                        "description": "Nombre común específico y preciso de la planta (ej: 'Monstera Deliciosa', 'Ficus Lyrata', 'Pothos Dorado', 'Aloe Vera')"
                    },
                    "scientific_name": {
                        "type": "string",
                        "description": "Nombre científico completo con género y especie (ej: 'Monstera deliciosa', 'Ficus lyrata', 'Aloe vera')"
                    },
                    "care_level": {
                        "type": "string",
                        "enum": ["Fácil", "Medio", "Difícil"],
                        "description": "Nivel de dificultad de cuidado"
                    },
                    "care_tips": {
                        "type": "string",
                        "description": "3-5 tips específicos y detallados de cuidado, separados por punto y coma"
                    },
                    "optimal_humidity_min": {
                        "type": "number",
                        "minimum": 20,
                        "maximum": 50,
                        "description": "Humedad mínima ideal del suelo (%)"
                    },
                    "optimal_humidity_max": {
                        "type": "number",
                        "minimum": 50,
                        "maximum": 80,
                        "description": "Humedad máxima ideal del suelo (%)"
                    },
                    "optimal_temp_min": {
                        "type": "number",
                        "minimum": 10,
                        "maximum": 20,
                        "description": "Temperatura mínima tolerada (°C)"
                    },
                    "optimal_temp_max": {
                        "type": "number",
                        "minimum": 20,
                        "maximum": 30,
                        "description": "Temperatura máxima tolerada (°C)"
                    }
                },
                "required": ["plant_type", "scientific_name", "care_level", "care_tips", 
                           "optimal_humidity_min", "optimal_humidity_max", 
                           "optimal_temp_min", "optimal_temp_max"],
                "additionalProperties": False
            }
        }
    }
    
    try:
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        
        response = client.chat.completions.create(
            model="gpt-4o-2024-08-06",  # Usar versión que soporta structured outputs
            messages=[
                {
                    "role": "system",
                    "content": """Eres un experto botánico y taxónomo con más de 30 años de experiencia en identificación precisa de plantas. Tienes conocimiento profundo de:

- Taxonomía botánica y nomenclatura científica
- Características morfológicas distintivas de familias, géneros y especies
- Distribución geográfica y hábitats naturales
- Plantas de interior y exterior, suculentas, cactus, árboles, arbustos, hierbas, flores
- Variedades y cultivares comunes

Tu objetivo es proporcionar identificaciones PRECISAS y ESPECÍFICAS, preferentemente hasta el nivel de especie. Solo usa identificaciones genéricas (género o familia) cuando la imagen no permita una identificación más específica."""
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (f"""CONTEXTO: El usuario indica que esta planta podría ser: "{plant_species}". Usa esta información como pista adicional para mejorar tu identificación, pero verifica siempre contra las características visuales de la imagen.

""" if plant_species else "") + """Analiza esta imagen de planta con EXTREMA PRECISIÓN. Evalúa sistemáticamente:

🔬 CARACTERÍSTICAS MORFOLÓGICAS DETALLADAS:

1. HOJAS:
   - Tipo: simples, compuestas, pinnadas, palmeadas, aciculares, escamosas
   - Forma: ovada, lanceolada, cordada, reniforme, elíptica, lineal, etc.
   - Disposición: alternas, opuestas, verticiladas, en roseta, espiral
   - Borde: entero, serrado, dentado, lobulado, ondulado
   - Textura: carnosa, coriácea, membranácea, pubescente, glabra
   - Venación: paralela, pinnada, palmeada, reticulada
   - Color: verde (tono específico), variegado, púrpura, rojo, etc.

2. TALLO/TRONCO:
   - Tipo: leñoso, herbáceo, suculento, espinoso
   - Forma: erecto, rastrero, trepador, colgante
   - Presencia de nudos, entrenudos, estructuras especiales
   - Color y textura superficial

3. ESTRUCTURAS ESPECIALES:
   - Espinas, aguijones, zarcillos, raíces aéreas
   - Pelos, tricomas, cera, pubescencia
   - Estípulas, lígulas, aurículas

4. FLORES/FRUTOS (si visibles):
   - Tipo de inflorescencia
   - Color y forma de flores
   - Tipo de fruto (si es visible)

5. HÁBITO DE CRECIMIENTO:
   - Planta herbácea, arbusto, árbol, trepadora, epífita, acuática
   - Tamaño relativo y forma general

📚 IDENTIFICACIÓN:

Basándote en estas características, identifica la planta con la MAYOR PRECISIÓN POSIBLE:
- Prefiere identificación hasta especie (género + especie)
- Si es un cultivar o variedad común, inclúyelo en el nombre común
- Usa nomenclatura científica correcta (género en mayúscula, especie en minúscula)
- Para plantas muy comunes, sé específico: "Monstera deliciosa" NO "Monstera", "Ficus lyrata" NO "Ficus"

EJEMPLOS DE IDENTIFICACIONES PRECISAS:
- "Monstera deliciosa" (NO solo "Monstera")
- "Ficus lyrata" o "Ficus lyrata 'Bambino'" (NO solo "Ficus")
- "Epipremnum aureum" (NO solo "Pothos")
- "Sansevieria trifasciata" (NO solo "Sansevieria")
- "Echeveria elegans" o "Echeveria 'Perle von Nürnberg'" (NO solo "Echeveria")
- "Crassula ovata" (NO solo "Crassula" o "Árbol de jade")
- "Schlumbergera truncata" (NO solo "Cactus de Navidad")
- "Aloe vera" o "Aloe barbadensis" (NO solo "Aloe")

Proporciona también información de cuidado ESPECÍFICA para la especie identificada, basada en requerimientos reales de la planta."""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url,
                                "detail": "high"  # Alta resolución para mejor análisis
                            }
                        }
                    ]
                }
            ],
            response_format=response_format,
            temperature=0,  # Temperature=0 para respuestas deterministas y consistentes
            max_tokens=1200  # Aumentado para respuestas completas y detalladas
        )
        
        # Con structured outputs, la respuesta viene en formato JSON válido
        content = response.choices[0].message.content
        
        # Limpiar markdown si existe
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "").strip()
        elif content.startswith("```"):
            content = content.replace("```", "").strip()
        
        result = json.loads(content)
        
        logger.info(f"✅ Planta identificada: {result['plant_type']} ({result['scientific_name']})")
        return result
        
    except _NON_RETRYABLE_OPENAI as e:
        # Sin créditos / key inválida: el fallback usaría la misma cuenta y
        # fallaría igual. Devolvemos mensaje amigable directo, sin 2º intento.
        logger.error(f"Error irrecuperable de OpenAI: {str(e)}")
        raise _friendly_openai_error(e)
    except Exception as e:
        logger.error(f"Error identificando planta con OpenAI: {str(e)}", exc_info=True)
        # Otros errores (parseo, formato): intentar método tradicional como fallback
        logger.warning("⚠️ Intentando método tradicional sin structured outputs...")
        return await _identify_plant_fallback(image_url, plant_species)


async def _identify_plant_fallback(image_url: str, plant_species: Optional[str] = None) -> Dict[str, any]:
    """
    Método fallback para identificación de plantas sin structured outputs.
    Se usa cuando el método principal falla.
    
    Args:
        image_url: URL de la imagen de la planta
        plant_species: (Opcional) Especie proporcionada por el usuario
    """
    try:
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (f"""CONTEXTO: El usuario indica que esta planta podría ser: "{plant_species}". Usa esta información como pista, pero verifica contra las características visuales.

""" if plant_species else "") + """Eres un experto botánico. Identifica esta planta con la mayor precisión posible.

Analiza cuidadosamente:
- Forma y disposición de hojas
- Textura y características del tallo
- Patrones de crecimiento
- Estructuras especiales (espinas, flores, etc.)

Identifica hasta especie cuando sea posible (ej: "Monstera deliciosa" NO solo "Monstera").

Responde SOLO con JSON válido:

{
    "plant_type": "nombre común específico",
    "scientific_name": "nombre científico completo",
    "care_level": "Fácil/Medio/Difícil",
    "care_tips": "3-5 tips separados por punto y coma",
    "optimal_humidity_min": número entre 20-50,
    "optimal_humidity_max": número entre 50-80,
    "optimal_temp_min": número entre 10-20,
    "optimal_temp_max": número entre 20-30
}"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": image_url, "detail": "high"}
                        }
                    ]
                }
            ],
            temperature=0,
            max_tokens=1200
        )
        
        content = response.choices[0].message.content
        
        # Limpiar markdown
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "").strip()
        elif content.startswith("```"):
            content = content.replace("```", "").strip()
        
        result = json.loads(content)
        logger.info(f"✅ Planta identificada (fallback): {result.get('plant_type')} ({result.get('scientific_name')})")
        return result
        
    except json.JSONDecodeError as e:
        logger.error(f"Error parseando JSON (fallback): {str(e)}")
        logger.error(f"Contenido recibido: {content}")
        raise AIServiceError("No se pudo identificar la planta. Intenta con otra foto.", 502)
    except AIServiceError:
        raise
    except Exception as e:
        logger.error(f"Error en método fallback: {str(e)}")
        raise _friendly_openai_error(e)


async def generate_character_with_dalle(plant_type: str, plant_name: str, mood: str = "happy") -> str:
    """
    Genera personaje con DALL-E 3.
    
    Args:
        plant_type: Tipo de planta (ej: "Cactus", "Helecho")
        plant_name: Nombre del personaje (ej: "Pepito")
        mood: Estado de ánimo del personaje (happy, sad, thirsty, overwatered, sick)
    
    Returns:
        str: URL de la imagen generada
    
    Raises:
        Exception: Si falla la generación
    """
    # TESTING MODE - Retornar URL placeholder sin llamar a DALL-E
    if settings.TESTING_MODE:
        await asyncio.sleep(random.uniform(0.5, 1.0))  # Simular delay de generación
        # URL placeholder de imagen genérica
        mock_url = f"https://placehold.co/1024x1024/228B22/white?text={plant_name}"
        logger.info(f"🧪 TESTING_MODE: Retornando mock URL para DALL-E: {mock_url}")
        return mock_url
    
    try:
        mood_descriptions = {
            "happy": "smiling, energetic, vibrant colors",
            "sad": "droopy, tired eyes, muted colors",
            "thirsty": "dry, cracked texture, desperate expression",
            "overwatered": "swollen, dripping, worried expression",
            "sick": "wilted, pale colors, sleepy"
        }
        
        prompt = f"""A single, simple, cute kawaii character based on a {plant_type} plant.
Style: Clean, minimal, Tamagotchi-like. Big eyes, rounded shapes, friendly expression.
The character should look like a {plant_type} but as a simple mascot.
Mood: {mood_descriptions.get(mood, 'neutral')}.
Name: {plant_name}.
IMPORTANT: Only ONE character, centered. No duplicates, no multiple characters, just one single character.
Background: Pure white background (#FFFFFF). No colors, no gradients, no decorations, just solid white.
The character should be clearly visible against the white background.
The design should be simple and clean, ready for customization with accessories like hats or decorations."""
        
        if not settings.OPENAI_API_KEY:
            raise Exception("OPENAI_API_KEY no está configurada. Por favor, configura la variable de entorno OPENAI_API_KEY.")
        
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        
        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1
        )
        
        # Verificar que la respuesta tenga datos
        if not response.data or len(response.data) == 0:
            raise Exception("DALL-E no generó ninguna imagen")
        
        image_url = response.data[0].url
        if not image_url:
            raise Exception("DALL-E generó una respuesta sin URL")
        
        logger.info(f"✅ Personaje generado exitosamente: {image_url}")
        return image_url
        
    except Exception as e:
        logger.error(f"Error generando personaje con DALL-E: {str(e)}")
        raise
