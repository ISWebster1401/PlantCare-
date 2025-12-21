"""
Módulo para personalizar personajes agregando accesorios.
Usa PIL/Pillow para superponer imágenes de accesorios sobre el personaje base.
"""
from PIL import Image
import requests
from io import BytesIO
import logging
from typing import Optional
from .supabase_storage import upload_image
from .config import settings

logger = logging.getLogger(__name__)


def add_accessory_to_character(
    character_url: str,
    accessory_url: str,
    position: str = "top",
    scale: float = 0.3
) -> str:
    """
    Superpone un accesorio sobre el personaje base.
    
    Args:
        character_url: URL del personaje base (Cloudinary)
        accessory_url: URL del accesorio (PNG con transparencia)
        position: Posición del accesorio ("top", "head", "body", "center")
        scale: Escala del accesorio relativo al personaje (0.0 - 1.0)
    
    Returns:
        str: URL de la imagen resultante en Cloudinary
    """
    try:
        logger.info(f"Agregando accesorio a personaje. Posición: {position}, Escala: {scale}")
        
        # 1. Descargar imagen del personaje
        logger.info(f"Descargando personaje desde: {character_url}")
        char_response = requests.get(character_url, timeout=10)
        char_response.raise_for_status()
        character_img = Image.open(BytesIO(char_response.content))
        
        # Convertir a RGBA si es necesario (para manejar transparencia)
        if character_img.mode != 'RGBA':
            character_img = character_img.convert('RGBA')
        
        logger.info(f"Personaje cargado: {character_img.size} ({character_img.mode})")
        
        # 2. Descargar imagen del accesorio
        logger.info(f"Descargando accesorio desde: {accessory_url}")
        acc_response = requests.get(accessory_url, timeout=10)
        acc_response.raise_for_status()
        accessory_img = Image.open(BytesIO(acc_response.content))
        
        # Asegurar que el accesorio tenga canal alpha (transparencia)
        if accessory_img.mode != 'RGBA':
            accessory_img = accessory_img.convert('RGBA')
        
        logger.info(f"Accesorio cargado: {accessory_img.size} ({accessory_img.mode})")
        
        # 3. Redimensionar accesorio según la escala
        char_width, char_height = character_img.size
        acc_width = int(char_width * scale)
        acc_aspect_ratio = accessory_img.height / accessory_img.width
        acc_height = int(acc_width * acc_aspect_ratio)
        
        accessory_img = accessory_img.resize(
            (acc_width, acc_height),
            Image.Resampling.LANCZOS
        )
        
        logger.info(f"Accesorio redimensionado a: {accessory_img.size}")
        
        # 4. Calcular posición según el tipo
        if position == "top" or position == "head":
            # Centrar en la parte superior (10% desde arriba)
            x = (char_width - acc_width) // 2
            y = int(char_height * 0.1)
        elif position == "body":
            # Centrar en el cuerpo (40% desde arriba)
            x = (char_width - acc_width) // 2
            y = int(char_height * 0.4)
        elif position == "center":
            # Centrar completamente
            x = (char_width - acc_width) // 2
            y = (char_height - acc_height) // 2
        else:
            # Por defecto: parte superior
            x = (char_width - acc_width) // 2
            y = int(char_height * 0.1)
        
        logger.info(f"Posición calculada: x={x}, y={y}")
        
        # 5. Superponer accesorio (respetando transparencia)
        # Crear una copia del personaje para no modificar el original
        result_img = character_img.copy()
        result_img.paste(accessory_img, (x, y), accessory_img)
        
        # 6. Convertir de vuelta a RGB si es necesario (para compatibilidad)
        if result_img.mode == 'RGBA':
            # Crear fondo blanco
            white_bg = Image.new('RGB', result_img.size, (255, 255, 255))
            white_bg.paste(result_img, mask=result_img.split()[3])  # Usar canal alpha como máscara
            result_img = white_bg
        
        # 7. Guardar en buffer y subir a Cloudinary
        output_buffer = BytesIO()
        result_img.save(output_buffer, format='PNG', quality=95)
        output_buffer.seek(0)
        
        logger.info("Subiendo imagen personalizada a Cloudinary...")
        result_url = upload_image(
            output_buffer,
            folder="plantcare/plants/characters/customized"
        )
        
        logger.info(f"✅ Personaje personalizado guardado: {result_url}")
        return result_url
        
    except requests.RequestException as e:
        logger.error(f"Error descargando imágenes: {str(e)}")
        raise Exception(f"Error descargando imágenes: {str(e)}")
    except Exception as e:
        logger.error(f"Error agregando accesorio: {str(e)}", exc_info=True)
        raise Exception(f"Error agregando accesorio: {str(e)}")


def remove_accessory_from_character(character_url: str) -> str:
    """
    Remueve accesorios del personaje (por ahora, solo retorna la URL original).
    En el futuro, podrías implementar detección de accesorios o mantener
    una copia del personaje base sin accesorios.
    
    Args:
        character_url: URL del personaje con accesorios
    
    Returns:
        str: URL del personaje sin accesorios
    """
    # Por ahora, asumimos que tenemos la URL base guardada en la DB
    # En el futuro, podrías:
    # 1. Guardar character_base_url separado de character_image_url
    # 2. O usar procesamiento de imágenes para detectar/remover accesorios
    return character_url


def get_accessory_url(accessory_type: str) -> str:
    """
    Genera la URL del accesorio en Supabase Storage.
    
    Args:
        accessory_type: Tipo de accesorio ("chupaya", "christmas_hat", etc.)
    
    Returns:
        str: URL completa del accesorio
    """
    from .supabase_storage import get_public_url
    
    # Ruta del accesorio en Supabase Storage
    file_path = f"plantcare/accessories/{accessory_type}.png"
    return get_public_url(file_path)


# Mapeo de accesorios disponibles
AVAILABLE_ACCESSORIES = {
    "chupaya": {
        "name": "Chupaya",
        "description": "Sombrero tradicional chileno",
        "position": "top",
        "scale": 0.35,
        "seasonal": [9],  # Septiembre (Fiestas Patrias)
    },
    "christmas_hat": {
        "name": "Gorro Navideño",
        "description": "Gorro rojo y blanco de Navidad",
        "position": "top",
        "scale": 0.3,
        "seasonal": [12],  # Diciembre
    },
    "party_hat": {
        "name": "Gorro de Fiesta",
        "description": "Gorro de celebración",
        "position": "top",
        "scale": 0.3,
        "seasonal": [1],  # Enero (Año Nuevo)
    },
    "crown": {
        "name": "Corona",
        "description": "Corona dorada",
        "position": "top",
        "scale": 0.25,
        "seasonal": None,  # Disponible todo el año
    },
    "sunglasses": {
        "name": "Anteojos de Sol",
        "description": "Anteojos de sol estilosos",
        "position": "head",
        "scale": 0.4,
        "seasonal": None,
    },
}
