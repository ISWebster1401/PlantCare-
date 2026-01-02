from fastapi import APIRouter, Depends, HTTPException, status
from app.api.core.auth_user import get_current_active_user
from app.api.core.database import get_db
from app.api.schemas.admin import (
    UserSimpleAdmin, PlantSimpleAdmin, SensorSimpleAdmin, AdminStats,
    UserDetailAdmin, PlantDetailAdmin, SensorDetailAdmin
)
from app.db.queries import (
    get_users_admin_simple, get_plants_admin_simple, get_sensors_admin_simple,
    get_admin_stats, get_user_detail_admin, get_plant_detail_admin, get_sensor_detail_admin,
    activate_user, deactivate_user
)
from pgdbtoolkit import AsyncPgDbToolkit
from typing import List
import logging

# Configurar logging
logger = logging.getLogger(__name__)

# Crear router para administración
router = APIRouter(
    prefix="/admin",
    tags=["Administración"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Acceso denegado"},
        404: {"description": "No encontrado"},
        500: {"description": "Error interno del servidor"}
    }
)

def require_admin(current_user: dict = Depends(get_current_active_user)):
    """Middleware para verificar que el usuario sea administrador (role_id = 2)"""
    role_id = current_user.get("role_id")
    
    if role_id != 2:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requieren permisos de administrador."
        )
    return current_user

# ===============================================
# ENDPOINTS DE ESTADÍSTICAS
# ===============================================

@router.get("/stats", response_model=AdminStats)
async def get_admin_statistics(
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """Obtiene estadísticas básicas del sistema"""
    try:
        stats = await get_admin_stats(db)
        return AdminStats(**stats)
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de admin: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

# ===============================================
# ENDPOINTS DE USUARIOS
# ===============================================

@router.get("/users", response_model=List[UserSimpleAdmin])
async def get_all_users(
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """Obtiene lista simplificada de todos los usuarios"""
    try:
        users = await get_users_admin_simple(db)
        return [UserSimpleAdmin(**user) for user in users]
    except Exception as e:
        logger.error(f"Error obteniendo usuarios: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/users/{user_id}", response_model=UserDetailAdmin)
async def get_user_detail(
    user_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """Obtiene detalle de un usuario específico"""
    try:
        user = await get_user_detail_admin(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        return UserDetailAdmin(**user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo usuario: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.put("/users/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """Activa o desactiva un usuario"""
    try:
        # Primero obtener el usuario para ver su estado actual
        user = await get_user_detail_admin(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        # No permitir desactivar a sí mismo
        if user_id == current_user.get("id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No puedes desactivar tu propia cuenta"
            )
        
        # Toggle del estado
        new_status = not user.get("is_active", True)
        if new_status:
            success = await activate_user(db, user_id)
        else:
            success = await deactivate_user(db, user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo actualizar el estado del usuario"
            )
        
        return {"message": "Estado del usuario actualizado", "is_active": new_status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando estado de usuario: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

# ===============================================
# ENDPOINTS DE PLANTAS
# ===============================================

@router.get("/plants", response_model=List[PlantSimpleAdmin])
async def get_all_plants(
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """Obtiene lista simplificada de todas las plantas"""
    try:
        plants = await get_plants_admin_simple(db)
        return [PlantSimpleAdmin(**plant) for plant in plants]
    except Exception as e:
        logger.error(f"Error obteniendo plantas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/plants/{plant_id}", response_model=PlantDetailAdmin)
async def get_plant_detail(
    plant_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """Obtiene detalle de una planta específica"""
    try:
        plant = await get_plant_detail_admin(db, plant_id)
        if not plant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Planta no encontrada"
            )
        return PlantDetailAdmin(**plant)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo planta: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

# ===============================================
# ENDPOINTS DE SENSORES
# ===============================================

@router.get("/sensors", response_model=List[SensorSimpleAdmin])
async def get_all_sensors(
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """Obtiene lista simplificada de todos los sensores"""
    try:
        sensors = await get_sensors_admin_simple(db)
        return [SensorSimpleAdmin(**sensor) for sensor in sensors]
    except Exception as e:
        logger.error(f"Error obteniendo sensores: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/sensors/{sensor_id}", response_model=SensorDetailAdmin)
async def get_sensor_detail(
    sensor_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """Obtiene detalle de un sensor específico"""
    try:
        sensor = await get_sensor_detail_admin(db, sensor_id)
        if not sensor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sensor no encontrado"
            )
        return SensorDetailAdmin(**sensor)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo sensor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )
