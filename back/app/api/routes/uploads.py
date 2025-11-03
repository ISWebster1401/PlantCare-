from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from app.api.core.auth_user import get_current_active_user
from app.api.core.database import get_db
from app.db.queries import update_user, get_user_by_id
from pgdbtoolkit import AsyncPgDbToolkit
import os
import shutil
import uuid
import logging
from typing import Optional
from pathlib import Path

# Configurar logging
logger = logging.getLogger(__name__)

# Crear router para uploads
router = APIRouter(
    prefix="/uploads",
    tags=["Uploads"],
    responses={
        401: {"description": "No autorizado"},
        400: {"description": "Datos inválidos"},
        500: {"description": "Error interno del servidor"}
    }
)

# Configuración de uploads
UPLOAD_DIR = Path("uploads")
AVATAR_DIR = UPLOAD_DIR / "avatars"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

# Crear directorios si no existen
UPLOAD_DIR.mkdir(exist_ok=True)
AVATAR_DIR.mkdir(exist_ok=True)

def is_valid_image(filename: str) -> bool:
    """Verifica si el archivo es una imagen válida"""
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Sube un avatar para el usuario actual
    
    Args:
        file: Archivo de imagen
        current_user: Usuario actual
        db: Conexión a la base de datos
        
    Returns:
        dict: URL del avatar subido
    """
    try:
        # Validar extensión del archivo
        if not is_valid_image(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tipo de archivo no permitido. Use JPG, PNG, GIF o WEBP"
            )
        
        # Leer el archivo
        contents = await file.read()
        
        # Validar tamaño
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Archivo muy grande. Tamaño máximo: {MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        # Generar nombre único
        file_ext = Path(file.filename).suffix
        unique_filename = f"{current_user['id']}_{uuid.uuid4()}{file_ext}"
        file_path = AVATAR_DIR / unique_filename
        
        # Guardar archivo
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Si el usuario ya tenía un avatar, eliminar el anterior
        if current_user.get("avatar_url"):
            old_avatar_path = UPLOAD_DIR / current_user["avatar_url"].lstrip("/")
            if old_avatar_path.exists() and old_avatar_path.is_file():
                try:
                    old_avatar_path.unlink()
                except Exception as e:
                    logger.warning(f"No se pudo eliminar avatar anterior: {str(e)}")
        
        # Actualizar URL del avatar en la base de datos
        # La URL será relativa, el frontend la completa con la URL del servidor
        avatar_url = f"/uploads/avatars/{unique_filename}"
        await update_user(db, current_user["id"], {"avatar_url": avatar_url})
        
        logger.info(f"Avatar subido exitosamente para usuario {current_user['email']}")
        
        return {
            "message": "Avatar subido exitosamente",
            "avatar_url": avatar_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error subiendo avatar: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.delete("/avatar")
async def delete_avatar(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Elimina el avatar del usuario actual
    
    Args:
        current_user: Usuario actual
        db: Conexión a la base de datos
        
    Returns:
        dict: Mensaje de confirmación
    """
    try:
        if not current_user.get("avatar_url"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No hay avatar para eliminar"
            )
        
        # Eliminar archivo físico
        avatar_path = UPLOAD_DIR / current_user["avatar_url"].lstrip("/")
        if avatar_path.exists() and avatar_path.is_file():
            try:
                avatar_path.unlink()
            except Exception as e:
                logger.warning(f"No se pudo eliminar avatar físico: {str(e)}")
        
        # Actualizar base de datos
        await update_user(db, current_user["id"], {"avatar_url": None})
        
        logger.info(f"Avatar eliminado exitosamente para usuario {current_user['email']}")
        
        return {"message": "Avatar eliminado exitosamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando avatar: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

