from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from app.api.core.auth_user import get_current_active_user
from app.api.core.database import get_db
from app.api.schemas.admin import (
    UserAdminResponse, UserAdminCreate, UserAdminUpdate, DeviceAdminResponse,
    DeviceCodeBatch, AdminStats, UserListFilters, DeviceListFilters,
    BulkAction, BulkDeviceAction, RoleResponse
)
from app.api.schemas.device import DeviceCodeResponse
from app.db.queries import (
    get_all_users_admin, get_user_by_id_admin, create_user_admin, 
    update_user_admin, delete_user_admin, get_all_devices_admin,
    get_admin_stats, bulk_update_users, bulk_update_devices,
    create_device_code
)
from app.api.core.auth_user import AuthService
from pgdbtoolkit import AsyncPgDbToolkit
from typing import List, Optional
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
    """Middleware para verificar que el usuario sea administrador"""
    if current_user.get("role_id") != 2:
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
    """
    Obtiene estadísticas generales del sistema
    """
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
# ENDPOINTS DE GESTIÓN DE USUARIOS
# ===============================================

@router.get("/users", response_model=List[UserAdminResponse])
async def get_all_users(
    role_id: Optional[int] = Query(None, description="Filtrar por rol"),
    active: Optional[bool] = Query(None, description="Filtrar por estado activo"),
    region: Optional[str] = Query(None, description="Filtrar por región"),
    search: Optional[str] = Query(None, description="Buscar en nombre, email, viñedo"),
    page: int = Query(1, ge=1, description="Página"),
    limit: int = Query(20, ge=1, le=100, description="Elementos por página"),
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Obtiene lista de todos los usuarios con filtros
    """
    try:
        filters = {
            "role_id": role_id,
            "active": active,
            "region": region,
            "search": search,
            "page": page,
            "limit": limit
        }
        
        users = await get_all_users_admin(db, filters)
        
        # Convertir usuarios a formato esperado
        user_responses = []
        for user in users:
            try:
                user_response = UserAdminResponse(
                    id=user["id"],
                    first_name=user["first_name"],
                    last_name=user["last_name"],
                    email=user["email"],
                    phone=user.get("phone"),
                    region=user.get("region"),
                    vineyard_name=user.get("vineyard_name"),
                    hectares=user.get("hectares"),
                    grape_type=user.get("grape_type"),
                    role_id=user.get("role_id", 1),
                    role_name=user.get("role_name"),
                    created_at=user["created_at"],
                    last_login=user.get("last_login"),
                    active=user["active"],
                    device_count=user.get("device_count", 0)
                )
                user_responses.append(user_response)
            except Exception as convert_error:
                logger.error(f"Error convirtiendo usuario {user.get('id', 'unknown')}: {str(convert_error)}")
                logger.error(f"Datos del usuario: {user}")
                continue
        
        return user_responses
        
    except Exception as e:
        logger.error(f"Error obteniendo usuarios: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/users/{user_id}", response_model=UserAdminResponse)
async def get_user_by_id(
    user_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Obtiene un usuario específico por ID
    """
    try:
        user = await get_user_by_id_admin(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        return UserAdminResponse(**user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo usuario: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/users", response_model=UserAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserAdminCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Crea un nuevo usuario desde el panel de administración
    """
    try:
        # Verificar que el email no exista
        from app.db.queries import get_user_by_email
        existing_user = await get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un usuario con este email"
            )
        
        # Preparar datos del usuario
        user_dict = user_data.model_dump()
        password = user_dict.pop("password")
        
        # Hash de la contraseña
        user_dict["password_hash"] = AuthService.get_password_hash(password)
        
        # Crear usuario
        created_user = await create_user_admin(db, user_dict)
        
        logger.info(f"Usuario creado por admin {current_user['email']}: {user_data.email}")
        
        return UserAdminResponse(**created_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creando usuario: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.put("/users/{user_id}", response_model=UserAdminResponse)
async def update_user(
    user_id: int,
    user_data: UserAdminUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Actualiza un usuario existente
    """
    try:
        # Verificar que el usuario existe
        existing_user = await get_user_by_id_admin(db, user_id)
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        # Preparar datos de actualización
        update_data = user_data.model_dump(exclude_unset=True)
        
        # Actualizar usuario
        updated_user = await update_user_admin(db, user_id, update_data)
        
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo actualizar el usuario"
            )
        
        logger.info(f"Usuario {user_id} actualizado por admin {current_user['email']}")
        
        return UserAdminResponse(**updated_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando usuario: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Elimina un usuario completamente
    """
    try:
        # Verificar que el usuario existe
        existing_user = await get_user_by_id_admin(db, user_id)
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        # No permitir eliminar administradores
        if existing_user.get("role_id") == 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede eliminar un usuario administrador"
            )
        
        # Eliminar usuario
        success = await delete_user_admin(db, user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo eliminar el usuario"
            )
        
        logger.info(f"Usuario {user_id} eliminado por admin {current_user['email']}")
        
        return {"message": "Usuario eliminado exitosamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando usuario: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/users/bulk-action")
async def bulk_action_users(
    bulk_action: BulkAction,
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Realiza acciones en lote sobre usuarios
    """
    try:
        success = await bulk_update_users(db, bulk_action.user_ids, bulk_action.action)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Acción no válida o no se pudo completar"
            )
        
        logger.info(f"Acción en lote '{bulk_action.action}' realizada por admin {current_user['email']} en {len(bulk_action.user_ids)} usuarios")
        
        return {"message": f"Acción '{bulk_action.action}' completada en {len(bulk_action.user_ids)} usuarios"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en acción en lote de usuarios: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

# ===============================================
# ENDPOINTS DE GESTIÓN DE DISPOSITIVOS
# ===============================================

@router.get("/devices", response_model=List[DeviceAdminResponse])
async def get_all_devices(
    device_type: Optional[str] = Query(None, description="Filtrar por tipo"),
    connected: Optional[bool] = Query(None, description="Filtrar por conexión"),
    active: Optional[bool] = Query(None, description="Filtrar por estado activo"),
    user_id: Optional[int] = Query(None, description="Filtrar por usuario"),
    search: Optional[str] = Query(None, description="Buscar en código, nombre, usuario"),
    page: int = Query(1, ge=1, description="Página"),
    limit: int = Query(20, ge=1, le=100, description="Elementos por página"),
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Obtiene lista de todos los dispositivos con filtros
    """
    try:
        filters = {
            "device_type": device_type,
            "connected": connected,
            "active": active,
            "user_id": user_id,
            "search": search,
            "page": page,
            "limit": limit
        }
        
        devices = await get_all_devices_admin(db, filters)
        
        # Convertir dispositivos a formato esperado
        device_responses = []
        for device in devices:
            try:
                device_response = DeviceAdminResponse(
                    id=device["id"],
                    device_code=device["device_code"],
                    name=device.get("name"),
                    device_type=device["device_type"],
                    location=device.get("location"),
                    plant_type=device.get("plant_type"),
                    user_id=device.get("user_id"),
                    user_name=device.get("user_name"),
                    user_email=device.get("user_email"),
                    created_at=device["created_at"],
                    last_seen=device.get("last_seen"),
                    connected_at=device.get("connected_at"),
                    active=device["active"],
                    connected=device["connected"]
                )
                device_responses.append(device_response)
            except Exception as convert_error:
                logger.error(f"Error convirtiendo dispositivo {device.get('id', 'unknown')}: {str(convert_error)}")
                logger.error(f"Datos del dispositivo: {device}")
                continue
        
        return device_responses
        
    except Exception as e:
        logger.error(f"Error obteniendo dispositivos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/devices/generate-codes", response_model=List[DeviceCodeResponse])
async def generate_device_codes_admin(
    batch_data: DeviceCodeBatch,
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Genera códigos de dispositivos en lote
    """
    try:
        # Generar códigos
        devices = await create_device_code(
            db, 
            batch_data.device_type, 
            batch_data.quantity
        )
        
        # Convertir a DeviceCodeResponse
        code_responses = []
        for device in devices:
            code_responses.append(DeviceCodeResponse(
                device_code=device["device_code"],
                device_type=device["device_type"],
                created_at=device["created_at"]
            ))
        
        logger.info(f"Admin {current_user['email']} generó {len(devices)} códigos de dispositivos tipo {batch_data.device_type}")
        
        return code_responses
        
    except Exception as e:
        logger.error(f"Error generando códigos de dispositivos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/devices/bulk-action")
async def bulk_action_devices(
    bulk_action: BulkDeviceAction,
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Realiza acciones en lote sobre dispositivos
    """
    try:
        success = await bulk_update_devices(db, bulk_action.device_ids, bulk_action.action)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Acción no válida o no se pudo completar"
            )
        
        logger.info(f"Acción en lote '{bulk_action.action}' realizada por admin {current_user['email']} en {len(bulk_action.device_ids)} dispositivos")
        
        return {"message": f"Acción '{bulk_action.action}' completada en {len(bulk_action.device_ids)} dispositivos"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en acción en lote de dispositivos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

# ===============================================
# ENDPOINTS DE ROLES
# ===============================================

@router.get("/roles", response_model=List[RoleResponse])
async def get_all_roles(
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Obtiene todos los roles disponibles
    """
    try:
        result = await db.fetch_records("roles", order_by=[("id", "ASC")])
        
        if result is not None and not result.empty:
            roles = result.to_dict('records')
            return [RoleResponse(**role) for role in roles]
        
        return []
        
    except Exception as e:
        logger.error(f"Error obteniendo roles: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )
