from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from app.api.core.auth_user import get_current_active_user
from app.api.core.database import get_db
from app.api.schemas.admin import (
    UserAdminResponse, UserAdminCreate, UserAdminUpdate, DeviceAdminResponse,
    DeviceCodeBatch, AdminStats, UserListFilters, DeviceListFilters,
    BulkAction, BulkDeviceAction, RoleResponse, QuoteAdminResponse, QuoteAdminUpdate
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
import pandas as pd
from typing import List, Optional
from datetime import datetime
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

@router.get("/users")
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
        
        logger.info(f"Total usuarios obtenidos: {len(users)}")
        
        user_responses = []
        for user in users:
            try:
                cleaned_user = {
                    "id": int(user["id"]) if user.get("id") is not None else 0,
                    "first_name": user["first_name"],
                    "last_name": user["last_name"],
                    "email": user["email"],
                    "phone": user.get("phone"),
                    "region": user.get("region"),
                    "vineyard_name": user.get("vineyard_name"),
                    "hectares": float(user.get("hectares")) if user.get("hectares") is not None else None,
                    "grape_type": user.get("grape_type"),
                    "role_id": int(user.get("role_id", 1)),
                    "role_name": user.get("role_name"),
                    "created_at": user["created_at"],
                    "last_login": user.get("last_login"),
                    "active": bool(user.get("active", True)),
                    "device_count": int(user.get("device_count", 0)) if user.get("device_count") is not None else 0
                }
                
                user_response = UserAdminResponse(**cleaned_user)
                user_responses.append(user_response.model_dump())
            except Exception as convert_error:
                logger.error(f"Error convirtiendo usuario {user.get('id', 'unknown')}: {str(convert_error)}")
                continue
        
        logger.info(f"Usuarios procesados: {len(user_responses)}")
        return user_responses
        
    except Exception as e:
        logger.error(f"Error obteniendo usuarios: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/users/{user_id}")
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
        
        return UserAdminResponse(**user).model_dump()
        
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
        from app.db.queries import get_user_by_email
        existing_user = await get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un usuario con este email"
            )
        
        user_dict = user_data.model_dump()
        password = user_dict.pop("password")
        user_dict["password_hash"] = AuthService.get_password_hash(password)
        
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
        existing_user = await get_user_by_id_admin(db, user_id)
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        update_data = user_data.model_dump(exclude_unset=True)
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
        existing_user = await get_user_by_id_admin(db, user_id)
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        if existing_user.get("role_id") == 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede eliminar un usuario administrador"
            )
        
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

@router.get("/devices")
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
        
        logger.info(f"Total dispositivos obtenidos: {len(devices)}")
        
        device_responses = []
        for device in devices:
            try:
                user_id_val = device.get("user_id")
                if user_id_val is None or (isinstance(user_id_val, float) and pd.isna(user_id_val)):
                    user_id_clean = None
                else:
                    user_id_clean = int(user_id_val)
                
                device_id = int(device["id"]) if device.get("id") is not None else 0
                
                device_response = DeviceAdminResponse(
                    id=device_id,
                    device_code=device["device_code"],
                    name=device.get("name"),
                    device_type=device["device_type"],
                    location=device.get("location"),
                    plant_type=device.get("plant_type"),
                    user_id=user_id_clean,
                    user_name=device.get("user_name"),
                    user_email=device.get("user_email"),
                    created_at=device["created_at"],
                    last_seen=device.get("last_seen"),
                    connected_at=device.get("connected_at"),
                    active=bool(device["active"]),
                    connected=bool(device["connected"])
                )
                device_responses.append(device_response.model_dump())
            except Exception as convert_error:
                logger.error(f"Error convirtiendo dispositivo {device.get('id', 'unknown')}: {str(convert_error)}")
                continue
        
        logger.info(f"Dispositivos procesados: {len(device_responses)}")
        return device_responses
        
    except Exception as e:
        logger.error(f"Error obteniendo dispositivos: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
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
        devices = await create_device_code(
            db, 
            batch_data.device_type, 
            batch_data.quantity
        )
        
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

# ===============================================
# ENDPOINTS DE COTIZACIONES
# ===============================================

@router.get("/quotes", response_model=List[QuoteAdminResponse])
async def get_all_quotes(
    status: Optional[str] = Query(None, description="Filtrar por estado"),
    search: Optional[str] = Query(None, description="Buscar por nombre, email o referencia"),
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Obtiene todas las cotizaciones (solo admin)
    """
    try:
        # Obtener todas las cotizaciones
        conditions = {"deleted_at": None}
        if status:
            conditions["status"] = status
        
        quotes_df = await db.fetch_records("quotes", conditions=conditions)
        
        quotes = []
        if quotes_df is not None and not quotes_df.empty:
            all_quotes = quotes_df.to_dict('records')
            # Filtrar deleted_at
            for q in all_quotes:
                if q.get('deleted_at') is None:
                    quotes.append(q)
            
            # Aplicar búsqueda si se proporciona
            if search:
                search_lower = search.lower()
                quotes = [q for q in quotes if (
                    search_lower in q.get('name', '').lower() or
                    search_lower in q.get('email', '').lower() or
                    search_lower in q.get('reference_id', '').lower() or
                    search_lower in q.get('company', '').lower()
                )]
        
        # Ordenar por fecha de creación descendente
        quotes.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        # Convertir a QuoteAdminResponse
        result = []
        for q in quotes:
            try:
                result.append(QuoteAdminResponse(
                    id=int(q.get('id', 0)),
                    user_id=int(q.get('user_id')) if q.get('user_id') else None,
                    reference_id=str(q.get('reference_id', '')),
                    name=str(q.get('name', '')),
                    email=str(q.get('email', '')),
                    phone=q.get('phone'),
                    company=q.get('company'),
                    vineyard_name=q.get('vineyard_name'),
                    location=q.get('location'),
                    num_devices=int(q.get('num_devices', 0)),
                    budget_range=q.get('budget_range'),
                    status=str(q.get('status', 'pending')),
                    quoted_price=float(q.get('quoted_price')) if q.get('quoted_price') else None,
                    quoted_at=q.get('quoted_at'),
                    assigned_to=int(q.get('assigned_to')) if q.get('assigned_to') else None,
                    created_at=q.get('created_at'),
                    updated_at=q.get('updated_at'),
                    message=q.get('message')
                ))
            except Exception as e:
                logger.warning(f"Error procesando cotización {q.get('id')}: {str(e)}")
                continue
        
        return result
        
    except Exception as e:
        logger.error(f"Error obteniendo cotizaciones: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/quotes/{quote_id}", response_model=QuoteAdminResponse)
async def get_quote_by_id(
    quote_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Obtiene una cotización por ID (solo admin)
    """
    try:
        quote_df = await db.fetch_records(
            "quotes",
            conditions={"id": quote_id, "deleted_at": None}
        )
        
        if quote_df is None or quote_df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cotización no encontrada"
            )
        
        quote = quote_df.iloc[0].to_dict()
        
        return QuoteAdminResponse(
            id=int(quote.get('id', 0)),
            user_id=int(quote.get('user_id')) if quote.get('user_id') else None,
            reference_id=str(quote.get('reference_id', '')),
            name=str(quote.get('name', '')),
            email=str(quote.get('email', '')),
            phone=quote.get('phone'),
            company=quote.get('company'),
            vineyard_name=quote.get('vineyard_name'),
            location=quote.get('location'),
            num_devices=int(quote.get('num_devices', 0)),
            budget_range=quote.get('budget_range'),
            status=str(quote.get('status', 'pending')),
            quoted_price=float(quote.get('quoted_price')) if quote.get('quoted_price') else None,
            quoted_at=quote.get('quoted_at'),
            assigned_to=int(quote.get('assigned_to')) if quote.get('assigned_to') else None,
            created_at=quote.get('created_at'),
            updated_at=quote.get('updated_at'),
            message=quote.get('message')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo cotización {quote_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.put("/quotes/{quote_id}", response_model=QuoteAdminResponse)
async def update_quote(
    quote_id: int,
    quote_update: QuoteAdminUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Actualiza una cotización (solo admin)
    """
    try:
        # Verificar que la cotización existe
        quote_df = await db.fetch_records(
            "quotes",
            conditions={"id": quote_id, "deleted_at": None}
        )
        
        if quote_df is None or quote_df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cotización no encontrada"
            )
        
        # Preparar datos de actualización
        update_data = quote_update.model_dump(exclude_unset=True)
        
        # Si se actualiza el precio, también actualizar quoted_at
        if 'quoted_price' in update_data and update_data['quoted_price'] is not None:
            from datetime import datetime
            update_data['quoted_at'] = datetime.utcnow()
        
        # Validar estado si se proporciona
        if 'status' in update_data and update_data['status']:
            valid_statuses = ['pending', 'contacted', 'quoted', 'accepted', 'rejected', 'cancelled']
            if update_data['status'] not in valid_statuses:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Estado inválido. Debe ser uno de: {', '.join(valid_statuses)}"
                )
        
        update_data['updated_at'] = datetime.utcnow()
        
        # Actualizar en la base de datos
        await db.update_records(
            "quotes",
            conditions={"id": quote_id},
            updates=update_data
        )
        
        # Obtener la cotización actualizada
        updated_quote_df = await db.fetch_records(
            "quotes",
            conditions={"id": quote_id}
        )
        
        updated_quote = updated_quote_df.iloc[0].to_dict()
        
        logger.info(f"Admin {current_user['email']} actualizó cotización {quote_id}")
        
        return QuoteAdminResponse(
            id=int(updated_quote.get('id', 0)),
            user_id=int(updated_quote.get('user_id')) if updated_quote.get('user_id') else None,
            reference_id=str(updated_quote.get('reference_id', '')),
            name=str(updated_quote.get('name', '')),
            email=str(updated_quote.get('email', '')),
            phone=updated_quote.get('phone'),
            company=updated_quote.get('company'),
            vineyard_name=updated_quote.get('vineyard_name'),
            location=updated_quote.get('location'),
            num_devices=int(updated_quote.get('num_devices', 0)),
            budget_range=updated_quote.get('budget_range'),
            status=str(updated_quote.get('status', 'pending')),
            quoted_price=float(updated_quote.get('quoted_price')) if updated_quote.get('quoted_price') else None,
            quoted_at=updated_quote.get('quoted_at'),
            assigned_to=int(updated_quote.get('assigned_to')) if updated_quote.get('assigned_to') else None,
            created_at=updated_quote.get('created_at'),
            updated_at=updated_quote.get('updated_at'),
            message=updated_quote.get('message')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando cotización {quote_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )