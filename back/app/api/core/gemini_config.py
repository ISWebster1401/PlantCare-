"""
Configuración de Google Imagen (Vertex AI) para generación de imágenes de personajes.
Nota: Imagen requiere Vertex AI configurado con Google Cloud.
"""
import os
import logging
from typing import Dict
import requests
import base64
from io import BytesIO
from .config import settings
from .supabase_storage import upload_image

logger = logging.getLogger(__name__)

# Validar configuración
if not settings.GEMINI_API_KEY and not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
    logger.warning(
        "⚠️ GEMINI_API_KEY o GOOGLE_APPLICATION_CREDENTIALS no está configurada. "
        "Las funciones de generación de imágenes no funcionarán."
    )
else:
    logger.info("✅ Configuración de Google/Vertex AI detectada")


def get_plant_characteristics(plant_type: str) -> Dict[str, str]:
    """
    Obtiene características visuales de la planta para el prompt.
    Si no se encuentra información específica, usa descripciones genéricas.
    
    Args:
        plant_type: Tipo de planta (ej: "Monstera Deliciosa", "Manto de Eva", "Cactus")
    
    Returns:
        dict con características: leaves_description, texture, structure, etc.
    """
    plant_type_lower = plant_type.lower()
    
    # Base de datos de características por tipo de planta
    plant_db = {
        "manto de eva": {
            "leaves_description": "hojas grandes, textura suave, curvas orgánicas",
            "structure": "cuerpo hecho de hojas superpuestas como capas de tela verde",
            "details": "pequeñas venas foliares visibles",
        },
        "monstera": {
            "leaves_description": "hojas grandes con agujeros característicos, forma de corazón",
            "structure": "cuerpo formado por hojas perforadas superpuestas",
            "details": "venas prominentes y agujeros naturales (fenestraciones)",
        },
        "monstera deliciosa": {
            "leaves_description": "hojas grandes con agujeros característicos, forma de corazón",
            "structure": "cuerpo formado por hojas perforadas superpuestas",
            "details": "venas prominentes y agujeros naturales (fenestraciones)",
        },
        "cactus": {
            "leaves_description": "estructura cilíndrica o esférica, sin hojas tradicionales",
            "structure": "cuerpo suculento con espinas pequeñas y textura rugosa",
            "details": "costillas verticales y areolas con espinas",
        },
        "suculenta": {
            "leaves_description": "hojas carnosas y gruesas, dispuestas en roseta",
            "structure": "cuerpo formado por hojas suculentas superpuestas",
            "details": "textura cerosa y colores vibrantes",
        },
        "helecho": {
            "leaves_description": "frondas delicadas y divididas, textura fina",
            "structure": "cuerpo formado por frondas arqueadas y elegantes",
            "details": "venas finas y patrones de división de hojas",
        },
        "pothos": {
            "leaves_description": "hojas en forma de corazón, textura lisa",
            "structure": "cuerpo formado por hojas en forma de corazón superpuestas",
            "details": "venas centrales prominentes y colores variegados",
        },
    }
    
    # Buscar coincidencia (exacta o parcial)
    for key, value in plant_db.items():
        if key in plant_type_lower:
            return value
    
    # Si no se encuentra, usar descripción genérica basada en el nombre
    return {
        "leaves_description": f"hojas características de {plant_type}, textura natural",
        "structure": f"cuerpo formado por elementos foliares de {plant_type}",
        "details": "detalles botánicos realistas pero con toque tierno",
    }


async def generate_character_with_gemini(
    plant_type: str,
    plant_name: str,
    mood: str = "happy"
) -> str:
    """
    Genera personaje con Google Imagen (Vertex AI).
    
    Args:
        plant_type: Tipo de planta (ej: "Manto de Eva", "Monstera Deliciosa")
        plant_name: Nombre del personaje (ej: "Pepito")
        mood: Estado de ánimo del personaje (happy, sad, thirsty, overwatered, sick)
    
    Returns:
        str: URL de la imagen generada en Supabase Storage
    
    Raises:
        Exception: Si falla la generación
    """
    try:
        # Obtener características de la planta
        plant_chars = get_plant_characteristics(plant_type)
        
        # Construir el prompt dinámico basado en el prompt del usuario
        prompt = f"""Personaje original inspirado en una planta '{plant_type}' ({plant_chars['leaves_description']}), {plant_chars['structure']}, ojos grandes y expresivos integrados en el centro de una hoja principal, {plant_chars['details']}, postura amistosa, iluminación suave de invernadero, fondo desenfocado con plantas, alta calidad, mucho detalle, estilo ilustración 3D / Pixar-like, colores naturales, sin texto, sin marcas de agua."""
        
        logger.info(f"Generando personaje con Google Imagen para {plant_name} ({plant_type})")
        logger.debug(f"Prompt: {prompt}")
        
        # Usar Vertex AI SDK para Imagen
        try:
            from vertexai.preview import generative_models
            from vertexai.preview.generative_models import ImageGenerationModel
            from google.auth import default
            import vertexai
            
            # Obtener credenciales y proyecto
            credentials, project = default()
            if not credentials:
                raise Exception(
                    "No se encontraron credenciales de Google Cloud. "
                    "Configura GOOGLE_APPLICATION_CREDENTIALS o usa 'gcloud auth application-default login'"
                )
            
            # Inicializar Vertex AI
            location = "us-central1"  # Región donde está disponible Imagen
            vertexai.init(project=project, location=location)
            
            # Modelo de Imagen (Imagen 3 es más económico)
            model_name = settings.GEMINI_IMAGE_MODEL or "imagegeneration@006"
            
            # Crear modelo
            model = ImageGenerationModel.from_pretrained(model_name)
            
            # Generar imagen
            logger.info(f"Generando imagen con modelo: {model_name}")
            response = model.generate_images(
                prompt=prompt,
                number_of_images=1,
                aspect_ratio="1:1",
                safety_filter_level="block_some",
                person_generation="allow_all"
            )
            
            if not response.images or len(response.images) == 0:
                raise Exception("Google Imagen no generó ninguna imagen")
            
            # Obtener la primera imagen (bytes)
            image_bytes = response.images[0]._image_bytes
            
            # Subir a Supabase Storage
            image_buffer = BytesIO(image_bytes)
            image_url = upload_image(
                image_buffer,
                folder="plantcare/plants/characters"
            )
            
            logger.info(f"✅ Personaje generado exitosamente con Google Imagen: {image_url}")
            return image_url
            
        except ImportError:
            # Fallback: usar API REST si el SDK no está disponible
            logger.warning("SDK de Vertex AI no disponible, usando API REST")
            return await _generate_with_rest_api(prompt)
        
    except Exception as e:
        logger.error(f"Error generando personaje con Google Imagen: {str(e)}", exc_info=True)
        raise


async def _generate_with_rest_api(prompt: str) -> str:
    """Fallback usando API REST de Vertex AI."""
    from google.auth import default
    from google.auth.transport.requests import Request
    
    credentials, project = default()
    credentials.refresh(Request())
    
    model_name = settings.GEMINI_IMAGE_MODEL or "imagegeneration@006"
    vertex_url = (
        f"https://us-central1-aiplatform.googleapis.com/v1/"
        f"projects/{project}/locations/us-central1/"
        f"publishers/google/models/{model_name}:predict"
    )
    
    payload = {
        "instances": [{"prompt": prompt}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": "1:1",
            "safetyFilterLevel": "block_some",
            "personGeneration": "allow_all"
        }
    }
    
    headers = {
        "Authorization": f"Bearer {credentials.token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(vertex_url, json=payload, headers=headers, timeout=60)
    response.raise_for_status()
    result = response.json()
    
    if "predictions" in result and len(result["predictions"]) > 0:
        image_base64 = result["predictions"][0].get("bytesBase64Encoded")
        if image_base64:
            image_data = base64.b64decode(image_base64)
            image_buffer = BytesIO(image_data)
            return upload_image(image_buffer, folder="plantcare/plants/characters")
    
    raise Exception("Google Imagen no generó ninguna imagen")


# Alternativa más simple usando la API de Gemini directamente (si está disponible)
async def generate_character_with_gemini_simple(
    plant_type: str,
    plant_name: str,
    mood: str = "happy"
) -> str:
    """
    Versión simplificada usando la API REST de Google para generación de imágenes.
    Esta función usa un enfoque más directo.
    """
    try:
        if not settings.GEMINI_API_KEY:
            raise Exception("GEMINI_API_KEY no está configurada")
        
        import requests
        import base64
        from io import BytesIO
        from .supabase_storage import upload_image
        
        # Obtener características de la planta
        plant_chars = get_plant_characteristics(plant_type)
        
        # Construir prompt
        prompt = f"""Personaje original inspirado en una planta '{plant_type}' ({plant_chars['leaves_description']}), {plant_chars['structure']}, ojos grandes y expresivos integrados en el centro de una hoja principal, {plant_chars['details']}, postura amistosa, iluminación suave de invernadero, fondo desenfocado con plantas, alta calidad, mucho detalle, estilo ilustración 3D / Pixar-like, colores naturales, sin texto, sin marcas de agua."""
        
        # Usar la API de Imagen de Google (requiere Vertex AI configurado)
        # Para una solución más simple, podemos usar un servicio intermedio
        # o configurar Vertex AI correctamente
        
        # Por ahora, retornamos un error informativo
        raise Exception(
            "La generación con Imagen requiere Vertex AI configurado. "
            "Por favor, configura las credenciales de Google Cloud y Vertex AI."
        )
        
    except Exception as e:
        logger.error(f"Error en generación simplificada: {str(e)}")
        raise
