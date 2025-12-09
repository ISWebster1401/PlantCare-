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
from typing import List, Optional, Any, Dict
from datetime import datetime
import logging
from app.api.core.email_service import email_service

# Configurar logging
logger = logging.getLogger(__name__)

# Mensajes por defecto para actualización de estado de cotizaciones
STATUS_DEFAULT_MESSAGES = {
    "pending": "Tu solicitud está en revisión. Nuestro equipo te confirmará los próximos pasos muy pronto.",
    "contacted": "Ya tomamos contacto contigo para avanzar con tu solicitud. Revisa tu correo o teléfono para más detalles.",
    "quoted": "Tu cotización personalizada ya está disponible. Revisa la propuesta adjunta y cuéntanos tus comentarios.",
    "accepted": "¡Excelente noticia! Aceptamos avanzar con tu proyecto. Coordinaremos contigo los próximos pasos.",
    "rejected": "Hemos revisado tu solicitud y, por ahora, no podremos avanzar. Si deseas, conversemos alternativas.",
    "cancelled": "La cotización fue cancelada según lo solicitado. Estamos disponibles si quieres retomarla en el futuro.",
}

def safe_int(value: Optional[Any]) -> Optional[int]:
    try:
        if value is None:
            return None
        if isinstance(value, float) and pd.isna(value):
            return None
        return int(value)
    except (TypeError, ValueError):
        return None

def safe_float(value: Optional[Any]) -> Optional[float]:
    try:
        if value is None:
            return None
        if isinstance(value, float) and pd.isna(value):
            return None
        if isinstance(value, str) and not value.strip():
            return None
        return float(value)
    except (TypeError, ValueError):
        return None

def safe_bool(value: Optional[Any]) -> Optional[bool]:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        val = value.strip().lower()
        if val in ("true", "1", "t", "yes", "y"):
            return True
        if val in ("false", "0", "f", "no", "n"):
            return False
    return None

def safe_str(value: Optional[Any]) -> str:
    if value is None:
        return ""
    return str(value)

def safe_datetime(value: Optional[Any]) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if hasattr(value, "to_pydatetime"):
        try:
            return value.to_pydatetime()
        except Exception:
            pass
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            return None
    return None

def build_quote_dict(data: dict) -> Dict[str, Any]:
    # Primero convertir a int con safe_int, luego forzar con int()
    id_value = safe_int(data.get('id'))
    id_final = int(id_value) if id_value is not None else 0
    
    num_devices_value = safe_int(data.get('num_devices'))
    num_devices_final = int(num_devices_value) if num_devices_value is not None else 0
    
    payload = {
        "id": id_final,
        "user_id": safe_int(data.get('user_id')),
        "reference_id": safe_str(data.get('reference_id')),
        "name": safe_str(data.get('name')),
        "email": safe_str(data.get('email')),
        "phone": data.get('phone'),
        "company": data.get('company'),
        "vineyard_name": data.get('vineyard_name'),
        "location": data.get('location'),
        "project_type": data.get('project_type'),
        "coverage_area": data.get('coverage_area'),
        "desired_date": data.get('desired_date'),
        "has_existing_infrastructure": safe_bool(data.get('has_existing_infrastructure')),
        "requires_installation": safe_bool(data.get('requires_installation')),
        "requires_training": safe_bool(data.get('requires_training')),
        "num_devices": num_devices_final,
        "budget_range": data.get('budget_range'),
        "status": safe_str(data.get('status')) or "pending",
        "quoted_price": safe_float(data.get('quoted_price')),
        "quoted_at": safe_datetime(data.get('quoted_at')),
        "assigned_to": safe_int(data.get('assigned_to')),
        "status_message": data.get('status_message'),
        "ip_address": data.get('ip_address'),
        "created_at": safe_datetime(data.get('created_at')) or datetime.utcnow(),
        "updated_at": safe_datetime(data.get('updated_at')),
        "message": data.get('message')
    }
    return payload

def build_quote_response(data: dict) -> QuoteAdminResponse:
    return QuoteAdminResponse(**build_quote_dict(data))

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
        
        rows = await db.fetch_records("quotes", conditions=conditions)
        if rows is None or rows.empty:
            return []

        raw_quotes = []
        for _, row in rows.iterrows():
            record = row.to_dict()
            if record.get('deleted_at') is None:
                raw_quotes.append(record)

        if search:
            search_lower = search.lower()
            raw_quotes = [q for q in raw_quotes if (
                search_lower in str(q.get('name', '')).lower()
                or search_lower in str(q.get('email', '')).lower()
                or search_lower in str(q.get('reference_id', '')).lower()
                or search_lower in str(q.get('company', '')).lower()
            )]

        raw_quotes.sort(key=lambda x: safe_datetime(x.get('created_at')) or datetime.min, reverse=True)

        normalized_quotes: List[Dict[str, Any]] = []
        for q in raw_quotes:
            try:
                normalized_quotes.append(build_quote_dict(q))
            except Exception as item_error:
                logger.error(f"Error normalizando cotización {q.get('id')}: {item_error} | data={q}")

        result: List[QuoteAdminResponse] = []
        for item in normalized_quotes:
            try:
                result.append(QuoteAdminResponse(**item))
            except Exception as serialize_error:
                logger.error(f"Error serializando cotización {item.get('id')}: {serialize_error} | payload={item}")
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
        
        return build_quote_response(quote)
        
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
        notify_user = bool(update_data.pop('notify_user', False))
        status_message_input = update_data.get('status_message')
        if status_message_input is not None:
            trimmed_message = status_message_input.strip()
            update_data['status_message'] = trimmed_message if trimmed_message else None

        current_status = str(quote_df.iloc[0].get('status', 'pending'))
        new_status = update_data.get('status')
        if new_status:
            current_status = new_status
        
        # Normalizar precio si se envía
        if 'quoted_price' in update_data:
            quoted_price_value = update_data['quoted_price']
            if quoted_price_value is None or (isinstance(quoted_price_value, str) and not quoted_price_value.strip()):
                update_data['quoted_price'] = None
            else:
                try:
                    update_data['quoted_price'] = float(quoted_price_value)
                except (TypeError, ValueError):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="El precio cotizado debe ser un número válido"
                    )
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

        target_status = update_data.get('status', current_status)
        
        update_data['updated_at'] = datetime.utcnow()

        if notify_user and not update_data.get('status_message'):
            update_data['status_message'] = STATUS_DEFAULT_MESSAGES.get(
                target_status,
                STATUS_DEFAULT_MESSAGES['pending']
            )
        
        # Actualizar en la base de datos solo si hay cambios
        if update_data:
            set_clause = ", ".join([f"{field} = %s" for field in update_data.keys()])
            values = list(update_data.values()) + [quote_id]
            await db.execute_query(
                f"UPDATE quotes SET {set_clause} WHERE id = %s",
                values
            )
        else:
            logger.info(
                "Admin %s intentó actualizar cotización %s sin cambios detectados",
                current_user['email'],
                quote_id
            )
        
        # Obtener la cotización actualizada
        updated_quote_df = await db.fetch_records(
            "quotes",
            conditions={"id": quote_id}
        )
        
        updated_quote = updated_quote_df.iloc[0].to_dict()
        
        if notify_user:
            email_status = str(updated_quote.get('status', current_status))
            message_to_send = updated_quote.get('status_message') or STATUS_DEFAULT_MESSAGES.get(
                email_status,
                STATUS_DEFAULT_MESSAGES['pending']
            )
            admin_full_name = f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip() or current_user['email']

            try:
                success = await email_service.send_quote_status_update(
                    to_email=updated_quote.get('email'),
                    user_name=updated_quote.get('name', 'Cliente'),
                    reference_id=str(updated_quote.get('reference_id', '')),
                    status=email_status,
                    admin_message=message_to_send,
                    admin_name=admin_full_name
                )
                if success:
                    logger.info(
                        "Correo de estado enviado a %s para cotización %s con estado %s",
                        updated_quote.get('email'),
                        updated_quote.get('reference_id'),
                        email_status
                    )
                else:
                    logger.error(
                        "Fallo al enviar correo de estado a %s para cotización %s",
                        updated_quote.get('email'),
                        updated_quote.get('reference_id')
                    )
            except Exception as email_error:
                logger.error(
                    "Error enviando correo de actualización de cotización %s: %s",
                    quote_id,
                    str(email_error)
                )
        
        logger.info(f"Admin {current_user['email']} actualizó cotización {quote_id}")
        
        return QuoteAdminResponse(
            id=int(updated_quote.get('id', 0)),
            user_id=safe_int(updated_quote.get('user_id')),
            reference_id=str(updated_quote.get('reference_id', '')),
            name=str(updated_quote.get('name', '')),
            email=str(updated_quote.get('email', '')),
            phone=updated_quote.get('phone'),
            company=updated_quote.get('company'),
            vineyard_name=updated_quote.get('vineyard_name'),
            location=updated_quote.get('location'),
            project_type=updated_quote.get('project_type'),
            coverage_area=updated_quote.get('coverage_area'),
            desired_date=updated_quote.get('desired_date'),
            has_existing_infrastructure=updated_quote.get('has_existing_infrastructure'),
            requires_installation=updated_quote.get('requires_installation'),
            requires_training=updated_quote.get('requires_training'),
            num_devices=int(safe_int(updated_quote.get('num_devices')) or 0),  # ← AGREGUÉ int()
            budget_range=updated_quote.get('budget_range'),
            status=str(updated_quote.get('status', 'pending')),
            quoted_price=safe_float(updated_quote.get('quoted_price')),
            quoted_at=updated_quote.get('quoted_at'),
            assigned_to=safe_int(updated_quote.get('assigned_to')),
            status_message=updated_quote.get('status_message'),
            ip_address=updated_quote.get('ip_address'),
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