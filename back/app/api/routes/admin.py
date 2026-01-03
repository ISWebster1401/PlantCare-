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
import json

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
    
    # Log temporal para debug
    logger.info(f"[DEBUG ADMIN] Usuario intentando acceder: email={current_user.get('email')}, role_id={role_id}, tipo={type(role_id)}, user_keys={list(current_user.keys()) if isinstance(current_user, dict) else 'not_dict'}")
    
    # Aceptar role_id como int o como string "2"
    if role_id != 2 and role_id != "2":
        # Intentar convertir a int si es string numérico
        try:
            role_id_int = int(role_id) if role_id is not None else None
            if role_id_int != 2:
                logger.warning(f"[DEBUG ADMIN] Acceso denegado: role_id={role_id} (esperado: 2)")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Acceso denegado. Se requieren permisos de administrador."
                )
        except (ValueError, TypeError):
            logger.warning(f"[DEBUG ADMIN] Acceso denegado: role_id={role_id} no es válido (esperado: 2)")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. Se requieren permisos de administrador."
            )
    
    logger.info(f"[DEBUG ADMIN] Acceso permitido para usuario {current_user.get('email')}")
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

# ===============================================
# ENDPOINT PARA CONFIGURAR MODELO PREDETERMINADO
# ===============================================

@router.post("/models/set-box-default")
async def set_box_as_default(
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """Configura box.glb como modelo predeterminado para todas las plantas"""
    try:
        # 1. Buscar el modelo box.glb
        result = await db.execute_query("""
            SELECT id, name, plant_type, model_3d_url, is_default
            FROM plant_models
            WHERE name ILIKE '%box%' OR model_3d_url ILIKE '%box%'
            ORDER BY id DESC
            LIMIT 1
        """)
        
        if result is None or result.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró ningún modelo con 'box' en el nombre o URL"
            )
        
        model_id = result.iloc[0]["id"]
        model_name = result.iloc[0]["name"]
        model_url = result.iloc[0]["model_3d_url"]
        
        # 2. Desactivar otros modelos predeterminados
        await db.execute_query("""
            UPDATE plant_models
            SET is_default = FALSE
            WHERE id != %s AND is_default = TRUE
        """, (model_id,))
        
        # 3. Configurar box.glb como predeterminado con plant_type = 'Planta'
        await db.execute_query("""
            UPDATE plant_models
            SET is_default = TRUE, plant_type = 'Planta'
            WHERE id = %s
        """, (model_id,))
        
        logger.info(f"✅ Modelo box.glb (ID: {model_id}) configurado como predeterminado")
        
        return {
            "message": "Modelo box.glb configurado como predeterminado exitosamente",
            "model_id": int(model_id),
            "model_name": str(model_name),
            "model_url": str(model_url),
            "plant_type": "Planta",
            "is_default": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error configurando box.glb como predeterminado: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor: {str(e)}"
        )


# ===============================================
# ENDPOINT PARA MARCAR MODELO COMO DEFAULT
# ===============================================

@router.post("/models/{model_id}/set-default")
async def set_model_as_default(
    model_id: int,
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Marca un modelo como default para su tipo de planta.
    Desactiva otros modelos default del mismo tipo.
    """
    try:
        # 1. Verificar que el modelo existe
        model_result = await db.execute_query("""
            SELECT id, plant_type, name, model_3d_url
            FROM plant_models
            WHERE id = %s
        """, (model_id,))
        
        if model_result is None or model_result.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Modelo con id {model_id} no encontrado"
            )
        
        model_plant_type = model_result.iloc[0]["plant_type"]
        
        # 2. Desactivar otros modelos default del mismo tipo
        await db.execute_query("""
            UPDATE plant_models
            SET is_default = FALSE
            WHERE plant_type = %s AND id != %s AND is_default = TRUE
        """, (model_plant_type, model_id))
        
        # 3. Activar este modelo como default
        update_result = await db.execute_query("""
            UPDATE plant_models
            SET is_default = TRUE, updated_at = NOW()
            WHERE id = %s
            RETURNING id, plant_type, name, model_3d_url, is_default
        """, (model_id,))
        
        if update_result is None or update_result.empty:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo actualizar el modelo"
            )
        
        updated_model = update_result.iloc[0]
        
        logger.info(f"✅ Modelo {model_id} marcado como default para tipo '{model_plant_type}'")
        
        return {
            "message": f"Modelo marcado como default para tipo '{model_plant_type}'",
            "model_id": int(updated_model["id"]),
            "plant_type": str(updated_model["plant_type"]),
            "name": str(updated_model["name"]),
            "model_3d_url": str(updated_model["model_3d_url"]),
            "is_default": bool(updated_model["is_default"])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marcando modelo como default: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor: {str(e)}"
        )


# ===============================================
# ENDPOINT PARA INICIALIZAR MODELOS DEFAULT
# ===============================================

@router.post("/models/init-defaults")
async def init_default_plant_models(
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Inicializa 10 modelos 3D predeterminados para tipos de plantas comunes.
    
    NOTA: Este endpoint es temporal y crea placeholders. Para modelos 3D reales y únicos:
    - Sube cada modelo 3D individualmente usando POST /api/plants/models/upload
    - Especifica el plant_type correspondiente (ej: "Monstera", "Suculenta", etc.)
    - Usa is_default=true para que reemplace automáticamente el placeholder
    - Cada tipo de planta tendrá su propio modelo 3D único
    """
    try:
        # Obtener la URL de box.glb existente
        box_model_result = await db.execute_query("""
            SELECT model_3d_url
            FROM plant_models
            WHERE name ILIKE '%box%' OR model_3d_url ILIKE '%box%'
            ORDER BY id DESC
            LIMIT 1
        """)
        
        if box_model_result is None or box_model_result.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró el modelo box.glb. Por favor, súbelo primero usando /api/plants/models/upload"
            )
        
        box_model_url = box_model_result.iloc[0]["model_3d_url"]
        logger.info(f"📦 Usando box.glb como placeholder: {box_model_url}")
        
        # Definir los 10 tipos de plantas con sus modelos
        default_models = [
            {"plant_type": "Suculenta", "name": "Suculenta Default"},
            {"plant_type": "Monstera", "name": "Monstera Default"},
            {"plant_type": "Pothos", "name": "Pothos Default"},
            {"plant_type": "Sansevieria", "name": "Sansevieria Default"},
            {"plant_type": "Ficus", "name": "Ficus Default"},
            {"plant_type": "Cactus", "name": "Cactus Default"},
            {"plant_type": "Aloe", "name": "Aloe Default"},
            {"plant_type": "Helecho", "name": "Helecho Default"},
            {"plant_type": "Dólar", "name": "Dólar Default"},
            {"plant_type": "Planta", "name": "Planta Genérica"},
        ]
        
        created_count = 0
        updated_count = 0
        
        for model_data in default_models:
            plant_type = model_data["plant_type"]
            name = model_data["name"]
            
            # Verificar si ya existe un modelo para este tipo
            existing = await db.execute_query("""
                SELECT id FROM plant_models
                WHERE plant_type = %s AND is_default = TRUE
                LIMIT 1
            """, (plant_type,))
            
            if existing is not None and not existing.empty:
                # Actualizar modelo existente
                await db.execute_query("""
                    UPDATE plant_models
                    SET model_3d_url = %s, name = %s, is_default = TRUE
                    WHERE plant_type = %s AND is_default = TRUE
                """, (box_model_url, name, plant_type))
                updated_count += 1
                logger.info(f"✅ Modelo actualizado: {plant_type}")
            else:
                # Crear nuevo modelo
                await db.execute_query("""
                    INSERT INTO plant_models (plant_type, name, model_3d_url, is_default, metadata)
                    VALUES (%s, %s, %s, TRUE, %s::jsonb)
                """, (
                    plant_type,
                    name,
                    box_model_url,
                    json.dumps({"category": plant_type.lower(), "scale": 1.0, "placeholder": True})
                ))
                created_count += 1
                logger.info(f"✅ Modelo creado: {plant_type}")
        
        # Asegurar que solo estos 10 modelos tengan is_default = TRUE
        # Desactivar otros modelos que no sean de los tipos default
        plant_types_list = [m["plant_type"] for m in default_models]
        placeholders = ", ".join(["%s"] * len(plant_types_list))
        await db.execute_query(f"""
            UPDATE plant_models
            SET is_default = FALSE
            WHERE plant_type NOT IN ({placeholders})
        """, tuple(plant_types_list))
        
        return {
            "message": f"Modelos inicializados exitosamente",
            "created": created_count,
            "updated": updated_count,
            "total": len(default_models),
            "models": default_models,
            "placeholder_url": box_model_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inicializando modelos default: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor: {str(e)}"
        )

# ===============================================
# ENDPOINT DE DEBUG TEMPORAL
# ===============================================

@router.get("/debug/me")
async def debug_current_user(
    current_user: dict = Depends(get_current_active_user)
):
    """Endpoint temporal para debug - muestra info del usuario actual"""
    return {
        "user_data": current_user,
        "role_id": current_user.get("role_id"),
        "role_id_type": str(type(current_user.get("role_id"))),
        "is_admin": current_user.get("role_id") == 2,
        "all_keys": list(current_user.keys())
    }
