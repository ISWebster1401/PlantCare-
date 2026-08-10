"""
Configuración de Supabase Storage para almacenamiento de imágenes.
"""
import os
import logging
from typing import BinaryIO, Optional
from supabase import create_client, Client
from .config import settings

logger = logging.getLogger(__name__)

# Cliente de Supabase (se inicializa cuando se necesita)
supabase_client: Optional[Client] = None

def init_supabase(force_reinit: bool = False) -> Optional[Client]:
    """Inicializa el cliente de Supabase.
    
    Prioridad:
    1. SUPABASE_ANON_KEY (recomendada para operaciones públicas)
    2. SUPABASE_KEY (service_role, solo si anon_key no está disponible)
    """
    global supabase_client
    
    if supabase_client is None or force_reinit:
        logger.info("🔧 Inicializando cliente de Supabase...")
        
        if not settings.SUPABASE_URL:
            logger.error("❌ SUPABASE_URL no está configurado en .env")
            logger.warning(
                "⚠️ Supabase no está configurado. Verifica SUPABASE_URL en .env"
            )
            return None
        
        logger.info(f"   URL encontrada: {settings.SUPABASE_URL}")
        
        # Para el backend, priorizar service_role key (bypass RLS)
        # La anon_key es para el frontend, pero el backend necesita permisos administrativos
        if settings.SUPABASE_KEY:
            supabase_key = settings.SUPABASE_KEY
            key_type = "service_role"
            logger.info("   ✅ Usando SUPABASE_KEY (service_role) - bypass RLS para operaciones admin")
        elif settings.SUPABASE_ANON_KEY:
            supabase_key = settings.SUPABASE_ANON_KEY
            key_type = "anon public"
            logger.warning("   ⚠️ Usando SUPABASE_ANON_KEY (anon) - puede fallar si hay RLS en el bucket")
            logger.warning("   💡 Recomendado: Usa SUPABASE_KEY (service_role) en el backend")
        else:
            logger.error("❌ SUPABASE_KEY y SUPABASE_ANON_KEY no están configurados en .env")
            logger.warning(
                "⚠️ Supabase no está configurado. Verifica SUPABASE_KEY (recomendada) o SUPABASE_ANON_KEY en .env"
            )
            return None
        
        logger.info(f"   Key Type: {key_type} (longitud: {len(supabase_key)} caracteres)")
        
        try:
            supabase_client = create_client(settings.SUPABASE_URL, supabase_key)
            logger.info(f"✅ Cliente de Supabase inicializado correctamente")
            logger.info(f"   Usando: {key_type} key")
            logger.info(f"   Key (primeros 20 chars): {supabase_key[:20]}...")
            logger.info(f"   Bucket configurado: {settings.SUPABASE_STORAGE_BUCKET or 'plantcare'}")
            logger.info(f"   URL: {settings.SUPABASE_URL}")
        except Exception as e:
            logger.error(f"❌ Error inicializando Supabase: {str(e)}")
            logger.error(f"   Verifica que SUPABASE_URL y la key sean correctas")
            raise
    
    return supabase_client


def _ensure_bucket_exists(client: Client, bucket_name: str) -> None:
    """
    Verifica pasivamente si un bucket existe en Supabase Storage.
    
    NOTA: No intenta crear el bucket porque la anon_key no tiene permisos.
    Si el bucket no existe, el upload fallará con un error claro.
    
    Args:
        client: Cliente de Supabase
        bucket_name: Nombre del bucket
    """
    try:
        # Intentar listar buckets solo para verificar permisos
        # Si falla por permisos, no es problema - asumimos que el bucket existe
        # Si el bucket no existe, el upload fallará con un error claro
        try:
            buckets = client.storage.list_buckets()
            bucket_exists = any(b.name == bucket_name for b in buckets)
            
            if bucket_exists:
                logger.info(f"✅ Bucket '{bucket_name}' verificado en Supabase Storage")
            else:
                logger.warning(f"⚠️ Bucket '{bucket_name}' no encontrado en la lista. "
                             f"Intentaré subir de todas formas - si no existe, el upload fallará.")
        except Exception as list_error:
            # Si no puede listar (anon_key tiene permisos limitados), no es problema
            # Simplemente intentaremos subir y veremos si funciona
            logger.info(f"ℹ️ No se pudo verificar el bucket '{bucket_name}' (puede ser por permisos limitados). "
                       f"Intentaré subir de todas formas.")
    except Exception as e:
        # Cualquier otro error lo ignoramos - el upload dirá si hay problema real
        logger.debug(f"No se pudo verificar bucket: {e}")


def upload_file(
    file: BinaryIO, 
    folder: str = "plantcare", 
    content_type: Optional[str] = None,
    max_size_mb: int = 50,
    original_filename: Optional[str] = None
) -> str:
    """
    Sube un archivo binario genérico a Supabase Storage y retorna URL pública.
    
    Args:
        file: Archivo binario (BytesIO o file object)
        folder: Carpeta dentro del bucket (ej: "plants/original", "3d_models")
                 NOTA: No incluyas el nombre del bucket aquí, solo la ruta dentro del bucket
        content_type: Tipo MIME del archivo (ej: "model/gltf-binary", "image/jpeg")
                     Si no se especifica, se detecta automáticamente por extensión
        original_filename: Nombre original del archivo (para preservar extensión)
        max_size_mb: Tamaño máximo permitido en MB (por defecto 50MB)
    
    Returns:
        str: URL pública del archivo
    
    Raises:
        Exception: Si falla la subida
    """
    try:
        # Forzar reinicialización si tenemos SUPABASE_KEY pero el cliente podría estar usando anon_key
        if settings.SUPABASE_KEY:
            client = init_supabase(force_reinit=True)
        else:
            client = init_supabase()
        if not client:
            raise Exception(
                "Supabase no está configurado. Verifica SUPABASE_URL y SUPABASE_KEY (recomendada) o SUPABASE_ANON_KEY en .env"
            )
        
        bucket = settings.SUPABASE_STORAGE_BUCKET or "plantcare"
        
        # Log de debug
        if settings.SUPABASE_KEY:
            logger.info(f"📤 Subiendo archivo - Key: service_role ✅, Bucket: {bucket}, Folder: {folder}")
        elif settings.SUPABASE_ANON_KEY:
            logger.warning(f"⚠️ Subiendo archivo - Key: anon (puede fallar por RLS), Bucket: {bucket}, Folder: {folder}")
        
        # Verificar bucket pasivamente
        _ensure_bucket_exists(client, bucket)
        
        # Generar nombre único para el archivo
        import uuid
        from datetime import datetime
        
        # Obtener extensión del archivo
        file_extension = ""
        if original_filename:
            file_extension = os.path.splitext(original_filename)[1].lower()
        if not file_extension and hasattr(file, 'name') and file.name:
            file_extension = os.path.splitext(file.name)[1].lower()
        
        # Si no hay extensión, usar .bin como fallback
        if not file_extension:
            file_extension = ".bin"
        
        # Nombre único: timestamp + uuid + extensión
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        filename = f"{timestamp}_{unique_id}{file_extension}"
        
        # Ruta completa en el bucket
        file_path = f"{folder}/{filename}" if folder else filename
        
        # Leer contenido del archivo
        # Verificar si es un objeto file-like con método read()
        if hasattr(file, 'read'):
            try:
                # Intentar leer desde la posición actual
                current_pos = file.tell() if hasattr(file, 'tell') else 0
                if current_pos != 0 and hasattr(file, 'seek'):
                    file.seek(0)  # Asegurar que estamos al inicio
                file_content = file.read()
                # Si read() devuelve bytes, usarlo directamente
                if isinstance(file_content, bytes):
                    pass  # file_content ya es bytes
                elif isinstance(file_content, int):
                    # Si read() devuelve un int, es un error - intentar leer de otra manera
                    raise Exception(f"Error leyendo archivo: read() devolvió int en lugar de bytes. Tipo recibido: {type(file)}")
                else:
                    # Convertir a bytes si es necesario
                    file_content = bytes(file_content) if file_content else b''
            except Exception as read_error:
                logger.error(f"Error leyendo archivo: {read_error}")
                raise Exception(f"Error leyendo archivo: {str(read_error)}")
        else:
            # Si no tiene método read(), intentar tratarlo como bytes directamente
            if isinstance(file, bytes):
                file_content = file
            else:
                raise Exception(f"El archivo no es un objeto file-like válido. Tipo recibido: {type(file)}")
        
        # Validar que el archivo no esté vacío
        if len(file_content) == 0:
            raise Exception("El archivo está vacío")
        
        # Validar tamaño
        max_size = max_size_mb * 1024 * 1024
        if len(file_content) > max_size:
            raise Exception(f"El archivo es demasiado grande. Máximo: {max_size_mb}MB, recibido: {len(file_content) / 1024 / 1024:.2f}MB")
        
        logger.info(f"Subiendo archivo a Supabase Storage: {file_path} ({len(file_content)} bytes)")
        
        # Detectar content-type si no se especificó
        if not content_type:
            content_type_map = {
                # Imágenes
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".heic": "image/jpeg",
                ".heif": "image/jpeg",
                ".gif": "image/gif",
                ".webp": "image/webp",
                # Modelos 3D
                ".glb": "model/gltf-binary",
                ".gltf": "model/gltf+json",
                # Otros
                ".bin": "application/octet-stream",
                ".zip": "application/zip",
            }
            content_type = content_type_map.get(file_extension, "application/octet-stream")
        
        # Subir a Supabase Storage
        try:
            response = client.storage.from_(bucket).upload(
                path=file_path,
                file=file_content,
                file_options={
                    "content-type": content_type,
                    "upsert": "true"
                }
            )
        except Exception as upload_error:
            # Si el error es que el archivo ya existe, intentar eliminar primero y luego subir
            if "already exists" in str(upload_error).lower() or "duplicate" in str(upload_error).lower():
                logger.warning(f"Archivo ya existe, intentando eliminar y resubir: {file_path}")
                try:
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
        try:
            public_url_response = client.storage.from_(bucket).get_public_url(file_path)
            
            if isinstance(public_url_response, str):
                public_url = public_url_response
            elif isinstance(public_url_response, dict):
                public_url = public_url_response.get("publicUrl") or public_url_response.get("url")
            else:
                public_url = str(public_url_response)
        except Exception:
            public_url = None
        
        # Si no se obtuvo URL, construirla manualmente
        if not public_url:
            public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{file_path}"
        
        logger.info(f"✅ Archivo subido exitosamente: {public_url}")
        return public_url
        
    except Exception as e:
        logger.error(f"❌ Error subiendo archivo a Supabase Storage: {str(e)}", exc_info=True)
        raise Exception(f"Error subiendo archivo a Supabase Storage: {str(e)}")


def upload_image(file: BinaryIO, folder: str = "plantcare") -> str:
    """
    Sube imagen binaria a Supabase Storage y retorna URL pública.
    
    Wrapper de upload_file() específico para imágenes (limita tamaño a 10MB).
    
    Args:
        file: Archivo binario (BytesIO o file object)
        folder: Carpeta dentro del bucket (ej: "plants/original")
                 NOTA: No incluyas el nombre del bucket aquí, solo la ruta dentro del bucket
    
    Returns:
        str: URL pública de la imagen
    
    Raises:
        Exception: Si falla la subida
    """
    # Sin nombre de archivo, upload_file caía en la extensión ".bin" y Supabase
    # servía la foto como application/octet-stream: la imagen se subía bien pero
    # la app la mostraba en blanco (los visores rechazan un content-type que no
    # sea de imagen). Como este helper es solo para imágenes, cuando no se puede
    # deducir la extensión asumimos JPEG.
    original_filename = getattr(file, "name", None)
    if not original_filename or not os.path.splitext(str(original_filename))[1]:
        original_filename = "image.jpg"

    return upload_file(
        file,
        folder=folder,
        max_size_mb=10,
        original_filename=str(original_filename),
    )


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
