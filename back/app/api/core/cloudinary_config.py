"""
Configuración de Cloudinary para almacenamiento de imágenes.
"""
import cloudinary
import cloudinary.uploader
import os
from typing import BinaryIO
import logging
from .config import settings

logger = logging.getLogger(__name__)

# Configurar Cloudinary usando settings
cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip()
api_key = os.getenv("CLOUDINARY_API_KEY", "").strip()
api_secret = os.getenv("CLOUDINARY_API_SECRET", "").strip()

if cloud_name and api_key and api_secret:
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )
    logger.info("✅ Cloudinary configurado correctamente")
else:
    logger.warning(
        "⚠️ Cloudinary no está configurado. Verifica CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en .env"
    )


def upload_image(file: BinaryIO, folder: str = "plantcare") -> str:
    """Sube imagen binaria a Cloudinary y retorna URL pública."""
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip()
    api_key = os.getenv("CLOUDINARY_API_KEY", "").strip()
    api_secret = os.getenv("CLOUDINARY_API_SECRET", "").strip()

    if not (cloud_name and api_key and api_secret):
        raise Exception(
            "Cloudinary no está configurado. Verifica CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en .env"
        )

    try:
        logger.info(f"Subiendo imagen a Cloudinary en carpeta: {folder}")
        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type="image",
            allowed_formats=["jpg", "jpeg", "png"],
            transformation=[
                {"width": 1024, "height": 1024, "crop": "limit"},
                {"quality": "auto:good"},
            ],
        )
        secure_url = result["secure_url"]
        logger.info(f"✅ Imagen subida exitosamente: {secure_url}")
        return secure_url
    except Exception as e:
        logger.error(f"❌ Error subiendo imagen a Cloudinary: {str(e)}")
        raise Exception(f"Error subiendo imagen a Cloudinary: {str(e)}")


def upload_image_from_url(image_url: str, folder: str = "plantcare/characters") -> str:
    """Sube a Cloudinary una imagen remota (por ejemplo, generada por DALL‑E) y retorna su URL.

    Cloudinary acepta directamente una URL como fuente, así que no es necesario descargarla
    manualmente. Esto nos permite convertir la URL temporal de OpenAI en una URL estable
    de Cloudinary para usarla en la app.
    """
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip()
    api_key = os.getenv("CLOUDINARY_API_KEY", "").strip()
    api_secret = os.getenv("CLOUDINARY_API_SECRET", "").strip()

    if not (cloud_name and api_key and api_secret):
        raise Exception(
            "Cloudinary no está configurado. Verifica CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en .env"
        )

    try:
        logger.info(f"Subiendo imagen remota a Cloudinary: {image_url}")
        result = cloudinary.uploader.upload(
            image_url,
            folder=folder,
            resource_type="image",
            allowed_formats=["jpg", "jpeg", "png"],
            transformation=[
                {"width": 1024, "height": 1024, "crop": "limit"},
                {"quality": "auto:good"},
            ],
        )
        secure_url = result["secure_url"]
        logger.info(f"✅ Imagen remota subida exitosamente: {secure_url}")
        return secure_url
    except Exception as e:
        logger.error(f"❌ Error subiendo imagen remota a Cloudinary: {str(e)}")
        raise Exception(f"Error subiendo imagen remota a Cloudinary: {str(e)}")


def delete_image(public_id: str) -> bool:
    """Elimina imagen de Cloudinary."""
    try:
        result = cloudinary.uploader.destroy(public_id)
        return result.get("result") == "ok"
    except Exception as e:
        logger.error(f"Error eliminando imagen de Cloudinary: {str(e)}")
        return False
