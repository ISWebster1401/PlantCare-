"""
Configuración de OpenAI para identificación de plantas y generación de personajes.
"""
import openai
import os
import json
from typing import Dict, Optional
import logging
from .config import settings

logger = logging.getLogger(__name__)

# Validar que la API key esté configurada
if not settings.OPENAI_API_KEY:
    logger.warning("⚠️ OPENAI_API_KEY no está configurada. Las funciones de IA no funcionarán.")
else:
    logger.info("✅ OPENAI_API_KEY configurada correctamente")


async def identify_plant_with_vision(image_url: str) -> Dict[str, any]:
    """
    Usa GPT-4o Vision para identificar una planta.
    
    Args:
        image_url: URL de la imagen de la planta
    
    Returns:
        dict con: plant_type, scientific_name, care_level, care_tips, 
                 optimal_humidity_min, optimal_humidity_max, 
                 optimal_temp_min, optimal_temp_max
    
    Raises:
        Exception: Si falla la identificación
    """
    if not settings.OPENAI_API_KEY:
        raise Exception("OPENAI_API_KEY no está configurada. Por favor, configura la variable de entorno OPENAI_API_KEY.")
    
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
                            "text": """Eres un experto botánico especializado en identificación precisa de plantas de TODO tipo: suculentas, cactus, plantas de interior, plantas de exterior, árboles, arbustos, hierbas, flores, plantas acuáticas, trepadoras, etc.

IMPORTANTE: Analiza cuidadosamente las características visuales de la planta:
- Forma y disposición de las hojas (simples, compuestas, alternas, opuestas, en roseta, etc.)
- Textura y grosor de las hojas (carnosas, delgadas, coriáceas, pubescentes, etc.)
- Patrones de crecimiento (vertical, rastrero, trepador, arbustivo, arbóreo, etc.)
- Color y forma del tallo (leñoso, herbáceo, suculento, espinoso, etc.)
- Presencia de espinas, pelos, zarcillos o estructuras especiales
- Tamaño y forma general de la planta
- Flores, frutos o estructuras reproductivas si están visibles
- Patrones de coloración y venación de las hojas

Identifica el género y especie exacta cuando sea posible. Para plantas comunes, proporciona el nombre común más específico y el nombre científico completo.

Ejemplos de identificación precisa:
- Suculentas: "Echeveria elegans", "Crassula ovata", "Aloe vera", "Haworthia fasciata" (NO solo "Echeveria" genérico)
- Plantas de interior: "Monstera deliciosa", "Ficus lyrata", "Epipremnum aureum", "Sansevieria trifasciata"
- Cactus: "Schlumbergera truncata", "Echinocactus grusonii", "Opuntia ficus-indica"
- Plantas de exterior: "Rosa", "Lavandula angustifolia", "Rosmarinus officinalis", "Mentha piperita"
- Árboles y arbustos: "Ficus benjamina", "Buxus sempervirens", "Olea europaea"

Proporciona la siguiente información en formato JSON:

{
    "plant_type": "nombre común específico y preciso (ej: 'Monstera Deliciosa', 'Ficus Lyrata', 'Pothos Dorado', 'Cactus de Navidad', 'Aloe Vera', 'Crassula Ovata', 'Rosa', 'Lavanda', 'Helecho', etc.)",
    "scientific_name": "nombre científico completo con género y especie si es posible (ej: 'Monstera deliciosa', 'Ficus lyrata', 'Epipremnum aureum', 'Schlumbergera truncata', 'Echeveria elegans', 'Crassula ovata', 'Aloe vera', 'Rosa damascena', 'Lavandula angustifolia', etc.)",
    "care_level": "Fácil/Medio/Difícil",
    "care_tips": "3-5 tips específicos y detallados de cuidado para esta especie en particular, separados por punto y coma. Incluye frecuencia de riego, tipo de luz, tipo de suelo, necesidades de humedad ambiental, y requisitos específicos de la especie",
    "optimal_humidity_min": número entre 20-50 (% humedad mínima ideal del suelo para esta especie),
    "optimal_humidity_max": número entre 50-80 (% humedad máxima ideal del suelo para esta especie),
    "optimal_temp_min": número entre 10-20 (°C temperatura mínima que tolera),
    "optimal_temp_max": número entre 20-30 (°C temperatura máxima que tolera)
}

Responde SOLO con el JSON válido, sin texto adicional ni explicaciones."""
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": image_url}
                        }
                    ]
                }
            ],
            max_tokens=800  # Aumentado para respuestas más detalladas
        )
        
        content = response.choices[0].message.content
        
        # Limpiar el contenido si tiene markdown
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "").strip()
        elif content.startswith("```"):
            content = content.replace("```", "").strip()
        
        result = json.loads(content)
        return result
        
    except json.JSONDecodeError as e:
        logger.error(f"Error parseando JSON de OpenAI: {str(e)}")
        logger.error(f"Contenido recibido: {content}")
        raise Exception("No se pudo parsear la respuesta de la IA")
    except Exception as e:
        logger.error(f"Error identificando planta con OpenAI: {str(e)}")
        raise


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
