"""
Configuración de Supabase Storage para almacenamiento de imágenes.
"""
import os
import logging
from typing import BinaryIO, Optional
from supabase import create_client, Client
from .config import settings

logger = logging.getLogger(__name__)

# Cliente de Supabase (se inicializa al importar)
supabase_client: Optional[Client] = None

def init_supabase() -> Optional[Client]:
    """Inicializa el cliente de Supabase.
    
    Prioridad:
    1. SUPABASE_ANON_KEY (recomendada para operaciones públicas)
    2. SUPABASE_KEY (service_role, solo si anon_key no está disponible)
    """
    global supabase_client
    
    if supabase_client is None:
        logger.info("🔧 Inicializando cliente de Supabase...")
        
        if not settings.SUPABASE_URL:
            logger.error("❌ SUPABASE_URL no está configurado en .env")
            logger.warning(
                "⚠️ Supabase no está configurado. Verifica SUPABASE_URL en .env"
            )
            return None
        
        logger.info(f"   URL encontrada: {settings.SUPABASE_URL}")
        
        # Priorizar anon_key sobre service_role key
        supabase_key = settings.SUPABASE_ANON_KEY or settings.SUPABASE_KEY
        
        if not supabase_key:
            logger.error("❌ SUPABASE_ANON_KEY y SUPABASE_KEY no están configurados en .env")
            logger.warning(
                "⚠️ Supabase no está configurado. Verifica SUPABASE_ANON_KEY o SUPABASE_KEY en .env"
            )
            return None
        
        key_type = "anon public" if settings.SUPABASE_ANON_KEY else "service_role"
        logger.info(f"   Key Type: {key_type} (longitud: {len(supabase_key)} caracteres)")
        
        try:
            supabase_client = create_client(settings.SUPABASE_URL, supabase_key)
            logger.info(f"✅ Cliente de Supabase inicializado correctamente")
            logger.info(f"   Usando: {key_type} key")
            logger.info(f"   Bucket configurado: {settings.SUPABASE_STORAGE_BUCKET or 'plantcare'}")
        except Exception as e:
            logger.error(f"❌ Error inicializando Supabase: {str(e)}")
            logger.error(f"   Verifica que SUPABASE_URL y la key sean correctas")
            raise
    
    return supabase_client


def upload_image(file: BinaryIO, folder: str = "plantcare") -> str:
    """
    Sube imagen binaria a Supabase Storage y retorna URL pública.
    
    Args:
        file: Archivo binario (BytesIO o file object)
        folder: Carpeta dentro del bucket (ej: "plantcare/plants/original")
    
    Returns:
        str: URL pública de la imagen
    
    Raises:
        Exception: Si falla la subida
    """
    try:
        client = init_supabase()
        if not client:
            raise Exception(
                "Supabase no está configurado. Verifica SUPABASE_URL y SUPABASE_ANON_KEY (o SUPABASE_KEY) en .env"
            )
        
        bucket = settings.SUPABASE_STORAGE_BUCKET or "plantcare"
        
        # Generar nombre único para el archivo
        import uuid
        from datetime import datetime
        
        # Obtener extensión del archivo (si es posible)
        file_extension = ".jpg"  # Por defecto
        if hasattr(file, 'name') and file.name:
            ext = os.path.splitext(file.name)[1].lower()
            if ext in [".jpg", ".jpeg", ".png"]:
                file_extension = ext
        
        # Nombre único: timestamp + uuid + extensión
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        filename = f"{timestamp}_{unique_id}{file_extension}"
        
        # Ruta completa en el bucket
        file_path = f"{folder}/{filename}" if folder else filename
        
        # Leer contenido del archivo
        file.seek(0)  # Asegurar que estamos al inicio
        file_content = file.read()
        
        # Validar tipo de archivo (opcional, pero recomendado)
        if len(file_content) == 0:
            raise Exception("El archivo está vacío")
        
        # Validar tamaño (opcional: máximo 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(file_content) > max_size:
            raise Exception(f"El archivo es demasiado grande. Máximo: {max_size / 1024 / 1024}MB")
        
        logger.info(f"Subiendo imagen a Supabase Storage: {file_path} ({len(file_content)} bytes)")
        
        # Subir a Supabase Storage
        # content_type se infiere automáticamente, pero podemos especificarlo
        content_type_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png"
        }
        content_type = content_type_map.get(file_extension, "image/jpeg")
        
        # Subir a Supabase Storage
        # El método upload acepta bytes directamente
        # upsert debe ir dentro de file_options como string "true", no como boolean
        try:
            response = client.storage.from_(bucket).upload(
                path=file_path,
                file=file_content,
                file_options={
                    "content-type": content_type,
                    "upsert": "true"  # Sobrescribir si existe (debe ser string, no boolean)
                }
            )
        except Exception as upload_error:
            # Si el error es que el archivo ya existe, intentar eliminar primero y luego subir
            if "already exists" in str(upload_error).lower() or "duplicate" in str(upload_error).lower():
                logger.warning(f"Archivo ya existe, intentando eliminar y resubir: {file_path}")
                try:
                    # Intentar eliminar el archivo existente
                    client.storage.from_(bucket).remove([file_path])
                    logger.info(f"Archivo eliminado exitosamente: {file_path}")
                except Exception as remove_error:
                    logger.warning(f"No se pudo eliminar archivo existente: {remove_error}")
                
                # Volver a intentar subir
                response = client.storage.from_(bucket).upload(
                    path=file_path,
                    file=file_content,
                    file_options={
                        "content-type": content_type,
                        "upsert": "true"
                    }
                )
            else:
                raise
        
        # Obtener URL pública
        # Supabase genera URLs públicas automáticamente si el bucket es público
        try:
            public_url_response = client.storage.from_(bucket).get_public_url(file_path)
            
            # get_public_url puede retornar string directamente o dict
            if isinstance(public_url_response, str):
                public_url = public_url_response
            elif isinstance(public_url_response, dict):
                public_url = public_url_response.get("publicUrl") or public_url_response.get("url")
            else:
                public_url = str(public_url_response)
        except Exception:
            # Si falla, construir URL manualmente
            public_url = None
        
        # Si no se obtuvo URL, construirla manualmente
        if not public_url:
            # Formato: https://{project_ref}.supabase.co/storage/v1/object/public/{bucket}/{path}
            public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{file_path}"
        
        logger.info(f"✅ Imagen subida exitosamente: {public_url}")
        return public_url
        
    except Exception as e:
        logger.error(f"❌ Error subiendo imagen a Supabase Storage: {str(e)}", exc_info=True)
        raise Exception(f"Error subiendo imagen a Supabase Storage: {str(e)}")


def upload_image_from_url(image_url: str, folder: str = "plantcare/characters") -> str:
    """
    Descarga una imagen desde una URL remota y la sube a Supabase Storage.
    
    Args:
        image_url: URL de la imagen remota
        folder: Carpeta dentro del bucket
    
    Returns:
        str: URL pública de la imagen en Supabase
    """
    try:
        import requests
        from io import BytesIO
        
        logger.info(f"Descargando imagen remota: {image_url}")
        
        # Descargar imagen
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        
        # Crear BytesIO desde el contenido
        image_buffer = BytesIO(response.content)
        
        # Subir usando la función principal
        return upload_image(image_buffer, folder=folder)
        
    except Exception as e:
        logger.error(f"❌ Error subiendo imagen remota a Supabase: {str(e)}", exc_info=True)
        raise Exception(f"Error subiendo imagen remota a Supabase: {str(e)}")


def delete_image(file_path: str) -> bool:
    """
    Elimina una imagen de Supabase Storage.
    
    Args:
        file_path: Ruta del archivo en el bucket (ej: "plantcare/plants/original/image.jpg")
    
    Returns:
        bool: True si se eliminó exitosamente
    """
    try:
        client = init_supabase()
        if not client:
            return False
        
        bucket = settings.SUPABASE_STORAGE_BUCKET or "plantcare"
        
        # Eliminar archivo
        response = client.storage.from_(bucket).remove([file_path])
        
        logger.info(f"✅ Imagen eliminada: {file_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error eliminando imagen de Supabase: {str(e)}")
        return False


def get_public_url(file_path: str) -> str:
    """
    Obtiene la URL pública de un archivo en Supabase Storage.
    
    Args:
        file_path: Ruta del archivo en el bucket
    
    Returns:
        str: URL pública
    """
    try:
        client = init_supabase()
        if not client:
            raise Exception("Supabase no está configurado")
        
        bucket = settings.SUPABASE_STORAGE_BUCKET or "plantcare"
        
        try:
            url_response = client.storage.from_(bucket).get_public_url(file_path)
            if isinstance(url_response, str):
                return url_response
            elif isinstance(url_response, dict):
                return url_response.get("publicUrl") or url_response.get("url") or ""
            else:
                return str(url_response)
        except Exception:
            # Fallback: construir URL manualmente
            return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{file_path}"
        
    except Exception as e:
        logger.error(f"Error obteniendo URL pública: {str(e)}")
        # Fallback: construir URL manualmente
        bucket = settings.SUPABASE_STORAGE_BUCKET or "plantcare"
        return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{file_path}"
