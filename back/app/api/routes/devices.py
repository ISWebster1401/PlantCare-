from fastapi import APIRouter, Depends, HTTPException, status
from app.api.core.auth_user import get_current_active_user
from app.api.core.database import get_db
from app.api.schemas.device import (
    DeviceConnect, DeviceCodeGenerate, DeviceResponse, 
    DeviceCodeResponse, DeviceListResponse, DeviceUpdate
)
from app.api.schemas.user import UserResponse
from app.db.queries import (
    create_device_code, get_device_by_code, connect_device_to_user,
    get_user_devices, disconnect_device, get_device_by_id,
    update_device_last_seen, get_device_stats
)
from pgdbtoolkit import AsyncPgDbToolkit
from typing import List
import logging

# Configurar logging
logger = logging.getLogger(__name__)

# Crear router para dispositivos
router = APIRouter(
    prefix="/devices",
    tags=["Dispositivos"],
    responses={
        401: {"description": "No autorizado"},
        400: {"description": "Datos inválidos"},
        404: {"description": "Dispositivo no encontrado"},
        500: {"description": "Error interno del servidor"}
    }
)

@router.post("/connect", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def connect_device(
    device_data: DeviceConnect,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Conecta un dispositivo al usuario actual usando un código verificador
    
    Args:
        device_data: Datos del dispositivo y código verificador
        current_user: Usuario actual obtenido del token
        db: Conexión a la base de datos
        
    Returns:
        DeviceResponse: Dispositivo conectado
        
    Raises:
        HTTPException: Si el código es inválido o el dispositivo ya está conectado
    """
    try:
        logger.info(f"Intentando conectar dispositivo {device_data.device_code} al usuario {current_user['email']}")
        
        # Verificar que el dispositivo existe
        device = await get_device_by_code(db, device_data.device_code)
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Código de dispositivo no encontrado"
            )
        
        if device.get("connected"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este dispositivo ya está conectado a otro usuario"
            )
        
        # Conectar dispositivo al usuario
        connected_device = await connect_device_to_user(
            db, 
            device_data.device_code, 
            current_user["id"],
            device_data.model_dump(exclude={"device_code"})
        )
        
        if not connected_device:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo conectar el dispositivo"
            )
        
        logger.info(f"Dispositivo {device_data.device_code} conectado exitosamente al usuario {current_user['email']}")
        
        return DeviceResponse.model_validate(connected_device)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error conectando dispositivo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/my-devices", response_model=DeviceListResponse)
async def get_my_devices(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Obtiene todos los dispositivos del usuario actual
    
    Args:
        current_user: Usuario actual obtenido del token
        db: Conexión a la base de datos
        
    Returns:
        DeviceListResponse: Lista de dispositivos del usuario
    """
    try:
        # Obtener dispositivos del usuario
        devices = await get_user_devices(db, current_user["id"])
        
        # Obtener estadísticas
        stats = await get_device_stats(db, current_user["id"])
        
        # Convertir a DeviceResponse
        device_responses = [DeviceResponse.model_validate(device) for device in devices]
        
        return DeviceListResponse(
            devices=device_responses,
            total=stats.get("total", 0),
            connected=stats.get("connected", 0),
            active=stats.get("active", 0),
            offline=stats.get("offline", 0)
        )
        
    except Exception as e:
        logger.error(f"Error obteniendo dispositivos del usuario: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Obtiene un dispositivo específico del usuario
    
    Args:
        device_id: ID del dispositivo
        current_user: Usuario actual obtenido del token
        db: Conexión a la base de datos
        
    Returns:
        DeviceResponse: Dispositivo solicitado
        
    Raises:
        HTTPException: Si el dispositivo no existe o no pertenece al usuario
    """
    try:
        device = await get_device_by_id(db, device_id)
        
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispositivo no encontrado"
            )
        
        # Verificar que el dispositivo pertenece al usuario
        if device.get("user_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para acceder a este dispositivo"
            )
        
        return DeviceResponse.model_validate(device)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo dispositivo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: int,
    device_data: DeviceUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Actualiza un dispositivo del usuario
    
    Args:
        device_id: ID del dispositivo
        device_data: Datos a actualizar
        current_user: Usuario actual obtenido del token
        db: Conexión a la base de datos
        
    Returns:
        DeviceResponse: Dispositivo actualizado
    """
    try:
        device = await get_device_by_id(db, device_id)
        
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispositivo no encontrado"
            )
        
        # Verificar que el dispositivo pertenece al usuario
        if device.get("user_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para modificar este dispositivo"
            )
        
        # Actualizar dispositivo
        update_data = device_data.model_dump(exclude_unset=True)
        if not update_data:
            return DeviceResponse.model_validate(device)
        
        # Actualizar usando SQL directo
        set_clause = ", ".join([f"{k} = %s" for k in update_data.keys()])
        values = list(update_data.values()) + [device_id]
        
        await db.execute_query(
            f"UPDATE devices SET {set_clause} WHERE id = %s",
            values
        )
        
        # Obtener dispositivo actualizado
        updated_device = await get_device_by_id(db, device_id)
        
        logger.info(f"Dispositivo {device_id} actualizado por usuario {current_user['email']}")
        
        return DeviceResponse.model_validate(updated_device)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando dispositivo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.delete("/{device_id}")
async def disconnect_device_endpoint(
    device_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Desconecta un dispositivo del usuario (no lo elimina, solo lo desvincula)
    
    Args:
        device_id: ID del dispositivo
        current_user: Usuario actual obtenido del token
        db: Conexión a la base de datos
        
    Returns:
        dict: Mensaje de confirmación
    """
    try:
        success = await disconnect_device(db, device_id, current_user["id"])
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispositivo no encontrado o no tienes permiso para desconectarlo"
            )
        
        logger.info(f"Dispositivo {device_id} desconectado del usuario {current_user['email']}")
        
        return {"message": "Dispositivo desconectado exitosamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error desconectando dispositivo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/heartbeat/{device_id}")
async def device_heartbeat(
    device_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Actualiza la última conexión del dispositivo (heartbeat)
    
    Args:
        device_id: ID del dispositivo
        current_user: Usuario actual obtenido del token
        db: Conexión a la base de datos
        
    Returns:
        dict: Mensaje de confirmación
    """
    try:
        device = await get_device_by_id(db, device_id)
        
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispositivo no encontrado"
            )
        
        # Verificar que el dispositivo pertenece al usuario
        if device.get("user_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para acceder a este dispositivo"
            )
        
        # Actualizar última conexión
        success = await update_device_last_seen(db, device_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo actualizar el estado del dispositivo"
            )
        
        return {"message": "Heartbeat registrado exitosamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registrando heartbeat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

# Rutas administrativas para generar códigos (solo para administradores)
@router.post("/admin/generate-codes", response_model=List[DeviceCodeResponse])
async def generate_device_codes(
    code_data: DeviceCodeGenerate,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Genera nuevos códigos de dispositivos (solo para administradores)
    
    Args:
        code_data: Datos para generar códigos
        current_user: Usuario actual obtenido del token
        db: Conexión a la base de datos
        
    Returns:
        List[DeviceCodeResponse]: Lista de códigos generados
        
    Raises:
        HTTPException: Si el usuario no es administrador
    """
    try:
        # Verificar que el usuario es administrador
        if current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo los administradores pueden generar códigos de dispositivos"
            )
        
        # Generar códigos
        devices = await create_device_code(
            db, 
            code_data.device_type.value, 
            code_data.quantity
        )
        
        # Convertir a DeviceCodeResponse
        code_responses = []
        for device in devices:
            code_responses.append(DeviceCodeResponse(
                device_code=device["device_code"],
                device_type=device["device_type"],
                created_at=device["created_at"]
            ))
        
        logger.info(f"Administrador {current_user['email']} generó {len(devices)} códigos de dispositivos")
        
        return code_responses
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generando códigos de dispositivos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )
