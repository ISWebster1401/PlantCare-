from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
import logging
import json

from pgdbtoolkit import AsyncPgDbToolkit

from ..core.auth_user import get_current_active_user
from ..core.database import get_db
from ..core.openai_config import identify_plant_with_vision
from ..core.supabase_storage import upload_image, upload_file
# Nota: La personalización de personajes se mantiene para cuando se suban los modelos 3D manualmente
from ..core.character_customization import (
    add_accessory_to_character,
    get_accessory_url,
    AVAILABLE_ACCESSORIES
)
from ..schemas.plants import (
    PlantResponse,
    PlantIdentify,
    PlantHealth,
    PlantModelResponse,
    PlantModelUploadRequest,
    PlantModelAssignRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/plants", tags=["plants"])


def require_admin(current_user: dict = Depends(get_current_active_user)):
    """Middleware para verificar que el usuario sea administrador (role_id == 2)"""
    role_id = current_user.get("role_id")
    if role_id != 2:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requieren permisos de administrador para subir modelos 3D."
        )
    return current_user


def _normalize_plant_type(plant_type: str) -> str:
    """
    Normaliza el nombre del tipo de planta a un tipo base estándar.
    Mapea variaciones de nombres a tipos base para mejor matching.
    
    Args:
        plant_type: Nombre del tipo de planta (ej: "Monstera Deliciosa", "Costilla de Adán")
    
    Returns:
        str: Tipo base normalizado (ej: "Monstera", "Planta")
    """
    if not plant_type:
        return "Planta"
    
    # Convertir a minúsculas para comparación case-insensitive
    plant_type_lower = plant_type.lower().strip()
    
    # Diccionario de mapeo: palabras clave -> tipo base
    type_mapping = {
        # Monstera / Costilla de Adán
        "monstera": "Monstera",
        "costilla": "Monstera",
        "costilla de adán": "Monstera",
        
        # Pothos / Potus / Epipremnum
        "pothos": "Pothos",
        "potus": "Pothos",
        "epipremnum": "Pothos",
        "pothos dorado": "Pothos",
        
        # Sansevieria / Lengua de suegra
        "sansevieria": "Sansevieria",
        "lengua": "Sansevieria",
        "lengua de suegra": "Sansevieria",
        "espada": "Sansevieria",
        "espada de san jorge": "Sansevieria",
        "snake plant": "Sansevieria",
        
        # Ficus
        "ficus": "Ficus",
        "higuera": "Ficus",
        
        # Cactus
        "cactus": "Cactus",
        "cacto": "Cactus",
        "cáctus": "Cactus",
        
        # Aloe
        "aloe": "Aloe",
        "sábila": "Aloe",
        "aloe vera": "Aloe",
        
        # Suculenta
        "suculenta": "Suculenta",
        "echeveria": "Suculenta",
        "crassula": "Suculenta",
        "haworthia": "Suculenta",
        "sedum": "Suculenta",
        
        # Helecho
        "helecho": "Helecho",
        "fern": "Helecho",
        
        # Dólar
        "dólar": "Dólar",
        "dolar": "Dólar",
        "plectranthus": "Dólar",
        "planta del dólar": "Dólar",
    }
    
    # Buscar match exacto primero
    if plant_type_lower in type_mapping:
        return type_mapping[plant_type_lower]
    
    # Buscar por palabras clave (si contiene alguna palabra clave)
    for keyword, base_type in type_mapping.items():
        if keyword in plant_type_lower:
            return base_type
    
    # Si no hay match, retornar tipo genérico
    return "Planta"


async def _assign_default_model(db: AsyncPgDbToolkit, plant_id: int, plant_type: str) -> Optional[int]:
    """
    Asigna automáticamente un modelo 3D predeterminado a una planta según su tipo.
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        plant_id: ID de la planta
        plant_type: Tipo de planta identificado (ej: "Cactus", "Monstera")
    
    Returns:
        Optional[int]: ID del modelo asignado, o None si no se pudo asignar
    """
    try:
        # 1. Normalizar el tipo de planta para mejor matching
        normalized_type = _normalize_plant_type(plant_type)
        logger.info(f"🔄 Tipo de planta normalizado: '{plant_type}' → '{normalized_type}'")
        
        # 2. Buscar modelo predeterminado para el tipo de planta normalizado
        model_df = await db.execute_query("""
            SELECT id, default_render_url
            FROM plant_models
            WHERE plant_type = %s AND is_default = TRUE
            LIMIT 1
        """, (normalized_type,))
        
        model_id = None
        default_render_url = None
        
        # 3. Si no encuentra modelo específico, buscar modelo genérico ("Planta")
        if model_df is None or model_df.empty:
            logger.info(f"⚠️ No se encontró modelo específico para '{normalized_type}', buscando modelo genérico...")
            generic_model_df = await db.execute_query("""
                SELECT id, default_render_url
                FROM plant_models
                WHERE plant_type = 'Planta' AND is_default = TRUE
                LIMIT 1
            """)
            
            if generic_model_df is not None and not generic_model_df.empty:
                model_id = generic_model_df.iloc[0]["id"]
                default_render_url = generic_model_df.iloc[0].get("default_render_url")
                logger.info(f"✅ Modelo genérico encontrado (id: {model_id})")
            else:
                logger.warning(f"⚠️ No se encontró ningún modelo predeterminado (ni específico ni genérico)")
                return None
        else:
            model_id = model_df.iloc[0]["id"]
            default_render_url = model_df.iloc[0].get("default_render_url")
            logger.info(f"✅ Modelo específico encontrado para '{normalized_type}' (id: {model_id})")
        
        # 3. Crear registro en plant_model_assignments
        assignment_result = await db.execute_query("""
            INSERT INTO plant_model_assignments (plant_id, model_id)
            VALUES (%s, %s)
            RETURNING id
        """, (plant_id, model_id))
        
        if assignment_result is None or assignment_result.empty:
            logger.error(f"❌ No se pudo crear plant_model_assignments para planta {plant_id}")
            return None
        
        assignment_id = assignment_result.iloc[0]["id"]
        logger.info(f"✅ Registro creado en plant_model_assignments (id: {assignment_id})")
        
        # 4. Si el modelo tiene default_render_url y no es placeholder, actualizar character_image_url
        # Si no hay default_render_url pero hay model_3d_url, usar una imagen placeholder genérica
        if default_render_url and not default_render_url.startswith("PLACEHOLDER_"):
            await db.execute_query("""
                UPDATE plants
                SET character_image_url = %s, updated_at = NOW()
                WHERE id = %s
            """, (default_render_url, plant_id))
            logger.info(f"✅ character_image_url actualizado con default_render_url del modelo")
        else:
            # Si no hay render, obtener el model_3d_url para referencia futura
            # Por ahora dejamos character_image_url como NULL y el frontend mostrará el placeholder
            # En el futuro se podría generar un render automático o usar un viewer 3D
            logger.info(f"⚠️ Modelo asignado pero no tiene default_render_url, character_image_url no se actualizará")
        
        return model_id
        
    except Exception as e:
        logger.error(f"❌ Error asignando modelo predeterminado: {e}", exc_info=True)
        # No lanzar excepción - la planta se crea exitosamente aunque falle la asignación del modelo
        return None


@router.post("/identify", response_model=PlantIdentify)
async def identify_plant(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user),
):
    """Sube una foto a Supabase Storage y usa GPT‑4o Vision para identificar la planta."""
    try:
        allowed_extensions = {".jpg", ".jpeg", ".png", ".heic", ".heif"}
        allowed_content_types = {"image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif"}

        file_extension = None
        if file.filename:
            file_extension = "." + file.filename.rsplit(".", 1)[-1].lower()

        if file_extension and file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de archivo no permitido. Solo se aceptan: JPEG, JPG, PNG, HEIC, HEIF. Recibido: {file_extension}",
            )

        if file.content_type and file.content_type.lower() not in allowed_content_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de contenido no permitido. Solo se aceptan: image/jpeg, image/png, image/heic, image/heif. Recibido: {file.content_type}",
            )

        logger.info(f"✅ Archivo válido para identificación: {file.filename} ({file.content_type})")

        original_photo_url = upload_image(file.file, folder="plants/original")
        plant_data = await identify_plant_with_vision(original_photo_url)

        return PlantIdentify(**plant_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error identificando planta: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error identificando planta: {str(e)}",
        )


@router.post("/", response_model=PlantResponse, status_code=status.HTTP_201_CREATED)
async def create_plant(
    file: UploadFile = File(...),
    plant_name: str = Form(...),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Flujo completo de creación de planta.

    1. Valida la imagen (JPEG/PNG)
    2. Sube foto original a Supabase Storage
    3. Identifica la planta con GPT‑4o Vision
    4. Guarda todo en la base de datos y devuelve la planta creada
    
    Nota: El modelo 3D y su render se crearán manualmente y se subirán después.
    """
    try:
        allowed_extensions = {".jpg", ".jpeg", ".png", ".heic", ".heif"}
        allowed_content_types = {"image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif"}

        file_extension = None
        if file.filename:
            file_extension = "." + file.filename.rsplit(".", 1)[-1].lower()

        if file_extension and file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de archivo no permitido. Solo se aceptan: JPEG, JPG, PNG, HEIC, HEIF. Recibido: {file_extension}",
            )

        if file.content_type and file.content_type.lower() not in allowed_content_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de contenido no permitido. Solo se aceptan: image/jpeg, image/png, image/heic, image/heif. Recibido: {file.content_type}",
            )

        logger.info(f"✅ Archivo válido: {file.filename} ({file.content_type})")
        if not plant_name or not plant_name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="plant_name es requerido",
            )

        # 1. Subir foto original
        logger.info(f"Subiendo foto original para planta {plant_name}")
        original_photo_url = upload_image(file.file, folder="plants/original")

        # 2. Identificar planta
        logger.info("Identificando planta...")
        plant_data = await identify_plant_with_vision(original_photo_url)

        # 3. Guardar en DB usando execute_query con INSERT
        # Nota: character_image_url se establecerá manualmente después cuando se cree el modelo 3D
        logger.info("Guardando planta en base de datos...")

        plant_data_clean = {
            "user_id": current_user["id"],
            "plant_name": plant_name,
            "plant_type": plant_data.get("plant_type", "Planta"),
            "scientific_name": plant_data.get("scientific_name"),
            "care_level": plant_data.get("care_level", "Medio"),
            "care_tips": plant_data.get(
                "care_tips",
                "Riega regularmente y mantén en un lugar con buena iluminación.",
            ),
            "original_photo_url": original_photo_url,
            "character_image_url": None,  # Se establecerá manualmente cuando se cree el modelo 3D
            "character_personality": "Aventurero",
            "character_mood": "happy",  # Se actualizará según salud
            "health_status": "healthy",  # Se actualizará según sensores
            "optimal_humidity_min": plant_data.get("optimal_humidity_min", 40.0),
            "optimal_humidity_max": plant_data.get("optimal_humidity_max", 70.0),
            "optimal_temp_min": plant_data.get("optimal_temp_min", 15.0),
            "optimal_temp_max": plant_data.get("optimal_temp_max", 25.0),
        }

        # Construir INSERT dinámicamente
        columns = [k for k, v in plant_data_clean.items() if v is not None]
        values = [plant_data_clean[k] for k in columns]
        placeholders = ", ".join(["%s"] * len(values))
        columns_str = ", ".join(columns)

        insert_query = f"""
            INSERT INTO plants ({columns_str})
            VALUES ({placeholders})
            RETURNING id
        """

        logger.info(f"Ejecutando INSERT: {insert_query[:200]}...")
        result = await db.execute_query(insert_query, tuple(values))

        plant_id = None
        if result is not None and not result.empty:
            plant_id = result.iloc[0]["id"]
            logger.info(f"✅ Planta creada con ID: {plant_id}")
        else:
            raise Exception("No se pudo obtener el ID de la planta creada")

        # 4. Auto-asignar modelo 3D predeterminado según plant_type
        plant_type = plant_data.get("plant_type", "Planta")
        model_id = await _assign_default_model(db, plant_id, plant_type)
        if model_id:
            logger.info(f"✅ Modelo 3D asignado automáticamente (model_id: {model_id}) para tipo: {plant_type}")

        # Recuperar la planta completa con información del modelo asignado
        plants_df = await db.execute_query("""
            SELECT 
                p.*,
                pma.id as assignment_id,
                pma.model_id as assigned_model_id,
                pm.model_3d_url
            FROM plants p
            LEFT JOIN plant_model_assignments pma ON p.id = pma.plant_id
            LEFT JOIN plant_models pm ON pma.model_id = pm.id
            WHERE p.id = %s AND p.user_id = %s
            LIMIT 1
        """, (plant_id, current_user["id"]))

        if plants_df is None or plants_df.empty:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Planta creada pero no se pudo recuperar",
            )

        plant = plants_df.iloc[0].to_dict()

        # Asegurar valores por defecto
        if "character_mood" not in plant or not plant["character_mood"]:
            plant["character_mood"] = "happy"
        if not plant.get("health_status"):
            plant["health_status"] = "healthy"

        logger.info(f"✅ Planta creada exitosamente: {plant_name} (ID: {plant_id})")
        return PlantResponse(**plant)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creando planta: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando planta: {str(e)}",
        )


@router.get("/", response_model=List[PlantResponse])
async def list_plants(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """
    Devuelve todas las plantas del usuario actual.
    """
    try:
        plants_df = await db.execute_query("""
            SELECT 
                p.*,
                pma.id as assignment_id,
                pma.model_id as assigned_model_id,
                pm.model_3d_url
            FROM plants p
            LEFT JOIN plant_model_assignments pma ON p.id = pma.plant_id
            LEFT JOIN plant_models pm ON pma.model_id = pm.id
            WHERE p.user_id = %s
            ORDER BY p.created_at DESC
        """, (current_user["id"],))

        if plants_df is None or plants_df.empty:
            return []

        plants = []
        for _, row in plants_df.iterrows():
            try:
                plant = row.to_dict()
                if not plant.get("character_mood"):
                    plant["character_mood"] = "happy"
                if not plant.get("health_status"):
                    plant["health_status"] = "healthy"
                plants.append(PlantResponse(**plant))
            except Exception as e:
                logger.warning(
                    f"Error serializando planta {plant.get('id', 'unknown')}: {e} | data={plant}"
                )

        return plants

    except Exception as e:
        logger.error(f"Error listando plantas: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listando plantas: {str(e)}",
        )


@router.get("/{plant_id}", response_model=PlantResponse)
async def get_plant(
    plant_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """
    Devuelve el detalle de una planta específica del usuario con información del modelo 3D.
    """
    try:
        plants_df = await db.execute_query("""
            SELECT 
                p.*,
                pma.id as assignment_id,
                pma.model_id as assigned_model_id,
                pm.model_3d_url
            FROM plants p
            LEFT JOIN plant_model_assignments pma ON p.id = pma.plant_id
            LEFT JOIN plant_models pm ON pma.model_id = pm.id
            WHERE p.id = %s AND p.user_id = %s
            LIMIT 1
        """, (plant_id, current_user["id"]))

        if plants_df is None or plants_df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Planta no encontrada",
            )

        plant = plants_df.iloc[0].to_dict()
        if not plant.get("character_mood"):
            plant["character_mood"] = "happy"
        if not plant.get("health_status"):
            plant["health_status"] = "healthy"

        return PlantResponse(**plant)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo planta: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo planta: {str(e)}",
        )


@router.post("/{plant_id}/add-accessory")
async def add_accessory_to_plant(
    plant_id: int,
    accessory_type: str = Form(...),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """
    Agrega un accesorio al personaje de la planta.
    
    Accesorios disponibles:
    - chupaya: Sombrero tradicional chileno (septiembre)
    - christmas_hat: Gorro navideño (diciembre)
    - party_hat: Gorro de fiesta (enero)
    - crown: Corona (todo el año)
    - sunglasses: Anteojos de sol (todo el año)
    
    Nota: Requiere que la planta tenga un modelo 3D/render asignado.
    """
    try:
        # 1. Verificar que el accesorio existe
        if accessory_type not in AVAILABLE_ACCESSORIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Accesorio '{accessory_type}' no disponible. Accesorios disponibles: {', '.join(AVAILABLE_ACCESSORIES.keys())}"
            )
        
        # 2. Obtener planta
        plants_df = await db.execute_query(
            """
            SELECT * FROM plants
            WHERE id = %s AND user_id = %s
            LIMIT 1
            """,
            (plant_id, current_user["id"]),
        )
        
        if plants_df is None or plants_df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Planta no encontrada",
            )
        
        plant = plants_df.iloc[0].to_dict()
        
        if not plant.get("character_image_url"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La planta no tiene un modelo 3D/render asignado aún. Por favor, sube el render del modelo 3D primero."
            )
        
        # 3. Obtener configuración del accesorio
        accessory_config = AVAILABLE_ACCESSORIES[accessory_type]
        
        # 4. Obtener URL del accesorio
        accessory_url = get_accessory_url(accessory_type)
        
        # 5. Superponer accesorio sobre el personaje
        logger.info(f"Agregando accesorio '{accessory_type}' a planta {plant_id}")
        customized_url = add_accessory_to_character(
            character_url=plant["character_image_url"],
            accessory_url=accessory_url,
            position=accessory_config["position"],
            scale=accessory_config["scale"]
        )
        
        # 6. Actualizar en DB
        await db.execute_query(
            """
            UPDATE plants 
            SET character_image_url = %s, updated_at = NOW()
            WHERE id = %s AND user_id = %s
            """,
            (customized_url, plant_id, current_user["id"]),
        )
        
        logger.info(f"✅ Accesorio '{accessory_type}' agregado exitosamente a planta {plant_id}")
        
        return {
            "message": f"Accesorio '{accessory_config['name']}' agregado exitosamente",
            "character_image_url": customized_url,
            "accessory_type": accessory_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error agregando accesorio: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error agregando accesorio: {str(e)}",
        )


@router.get("/accessories")
async def list_available_accessories(
    current_user: dict = Depends(get_current_active_user),
):
    """
    Lista todos los accesorios disponibles para personalizar personajes.
    """
    try:
        from datetime import datetime
        
        # Filtrar accesorios según temporada
        month = datetime.now().month
        available = []
        
        for accessory_id, config in AVAILABLE_ACCESSORIES.items():
            # Si tiene restricción estacional, verificar
            if config.get("seasonal"):
                if month in config["seasonal"]:
                    available.append({
                        "id": accessory_id,
                        "name": config["name"],
                        "description": config["description"],
                        "seasonal": True
                    })
            else:
                # Disponible todo el año
                available.append({
                    "id": accessory_id,
                    "name": config["name"],
                    "description": config["description"],
                    "seasonal": False
                })
        
        return {
            "accessories": available,
            "current_month": month
        }
        
    except Exception as e:
        logger.error(f"Error listando accesorios: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listando accesorios: {str(e)}",
        )


@router.post("/{plant_id}/upload-render")
async def upload_plant_render(
    plant_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """
    Sube el render del modelo 3D de la planta.
    Este endpoint permite subir manualmente el render del modelo 3D creado.
    
    Formatos aceptados: JPEG, JPG, PNG
    """
    try:
        # Validar tipo de archivo
        allowed_extensions = {".jpg", ".jpeg", ".png", ".heic", ".heif"}
        allowed_content_types = {"image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif"}

        file_extension = None
        if file.filename:
            file_extension = "." + file.filename.rsplit(".", 1)[-1].lower()

        if file_extension and file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de archivo no permitido. Solo se aceptan: JPEG, JPG, PNG, HEIC, HEIF. Recibido: {file_extension}",
            )

        if file.content_type and file.content_type.lower() not in allowed_content_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de contenido no permitido. Solo se aceptan: image/jpeg, image/png, image/heic, image/heif. Recibido: {file.content_type}",
            )

        # Verificar que la planta existe y pertenece al usuario
        plants_df = await db.execute_query(
            """
            SELECT * FROM plants
            WHERE id = %s AND user_id = %s
            LIMIT 1
            """,
            (plant_id, current_user["id"]),
        )

        if plants_df is None or plants_df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Planta no encontrada",
            )

        # Subir render a Supabase Storage
        logger.info(f"Subiendo render del modelo 3D para planta {plant_id}")
        render_url = upload_image(file.file, folder="plants/renders")

        # Actualizar en DB
        await db.execute_query(
            """
            UPDATE plants 
            SET character_image_url = %s, updated_at = NOW()
            WHERE id = %s AND user_id = %s
            """,
            (render_url, plant_id, current_user["id"]),
        )

        logger.info(f"✅ Render del modelo 3D subido exitosamente para planta {plant_id}")

        return {
            "message": "Render del modelo 3D subido exitosamente",
            "character_image_url": render_url,
            "plant_id": plant_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error subiendo render: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error subiendo render: {str(e)}",
        )


@router.post("/models/upload", response_model=PlantModelResponse, status_code=status.HTTP_201_CREATED)
async def upload_plant_model(
    file: UploadFile = File(...),
    plant_type: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    is_default: bool = Form(False),
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """
    Sube un modelo 3D (.glb) a Supabase Storage y crea un registro en plant_models.
    
    Modelos 3D de prueba disponibles (CC0 - dominio público):
    - Poly Pizza: https://poly.pizza/m/bTRzVhywtU (Zz Plant by Isa Lousberg)
    - Poly Pizza: https://poly.pizza/m/4f6vwL8vo9 (Plant Small by Kenney)
    - Poly Pizza: https://poly.pizza/m/xH5gNlQxAZ (Plant by Quaternius)
    
    Formatos aceptados: .glb
    Tamaño máximo: 50MB
    """
    try:
        # Validar extensión .glb
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo debe tener un nombre",
            )
        
        file_extension = "." + file.filename.rsplit(".", 1)[-1].lower()
        
        if file_extension != ".glb":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de archivo no permitido. Solo se aceptan archivos .glb. Recibido: {file_extension}",
            )
        
        # Validar tamaño (50MB máximo para modelos 3D)
        file.file.seek(0, 2)  # Ir al final del archivo
        file_size = file.file.tell()
        file.file.seek(0)  # Volver al inicio
        
        max_size = 50 * 1024 * 1024  # 50MB
        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El archivo es demasiado grande. Máximo: 50MB, recibido: {file_size / 1024 / 1024:.2f}MB",
            )
        
        # Subir archivo a Supabase Storage en carpeta 3d_models/
        logger.info(f"Subiendo modelo 3D: {file.filename} ({file_size} bytes)")
        model_url = upload_file(file.file, folder="3d_models", max_size_mb=50)
        
        # Preparar datos para insertar en plant_models
        model_plant_type = plant_type or "Planta"
        model_name = name or f"Modelo 3D {file.filename}"
        
        # Insertar registro en plant_models
        metadata_dict = {
            "uploaded_by": "user",
            "original_filename": file.filename
        }
        
        insert_result = await db.execute_query("""
            INSERT INTO plant_models (plant_type, name, model_3d_url, is_default, metadata)
            VALUES (%s, %s, %s, %s, %s::jsonb)
            RETURNING id, plant_type, name, model_3d_url, default_render_url, is_default, metadata
        """, (
            model_plant_type,
            model_name,
            model_url,
            is_default,
            json.dumps(metadata_dict)
        ))
        
        if insert_result is None or insert_result.empty:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo crear el registro del modelo en la base de datos",
            )
        
        model_row = insert_result.iloc[0]
        model_data = {
            "id": int(model_row["id"]),
            "plant_type": str(model_row["plant_type"]),
            "name": str(model_row["name"]),
            "model_3d_url": str(model_row["model_3d_url"]),
            "default_render_url": model_row.get("default_render_url"),
            "is_default": bool(model_row["is_default"]),
            "metadata": model_row.get("metadata"),
        }
        
        logger.info(f"✅ Modelo 3D subido exitosamente: {model_data['id']} - {model_data['name']}")
        
        return PlantModelResponse(**model_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error subiendo modelo 3D: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error subiendo modelo 3D: {str(e)}",
        )


@router.post("/{plant_id}/assign-model", status_code=status.HTTP_200_OK)
async def assign_model_to_plant(
    plant_id: int,
    request: PlantModelAssignRequest,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """
    Asigna un modelo 3D existente a una planta específica.
    
    Crea o actualiza el registro en plant_model_assignments.
    """
    try:
        # 1. Verificar que la planta existe y pertenece al usuario
        plants_df = await db.execute_query("""
            SELECT id FROM plants
            WHERE id = %s AND user_id = %s
            LIMIT 1
        """, (plant_id, current_user["id"]))
        
        if plants_df is None or plants_df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Planta no encontrada",
            )
        
        # 2. Verificar que el modelo existe
        models_df = await db.execute_query("""
            SELECT id, plant_type, name, model_3d_url
            FROM plant_models
            WHERE id = %s
            LIMIT 1
        """, (request.model_id,))
        
        if models_df is None or models_df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Modelo 3D no encontrado",
            )
        
        model_data = models_df.iloc[0]
        
        # 3. Verificar si ya existe un assignment para esta planta
        existing_assignment_df = await db.execute_query("""
            SELECT id FROM plant_model_assignments
            WHERE plant_id = %s
            LIMIT 1
        """, (plant_id,))
        
        if existing_assignment_df is not None and not existing_assignment_df.empty:
            # Actualizar assignment existente
            assignment_id = existing_assignment_df.iloc[0]["id"]
            await db.execute_query("""
                UPDATE plant_model_assignments
                SET model_id = %s, updated_at = NOW()
                WHERE id = %s
            """, (request.model_id, assignment_id))
            
            logger.info(f"✅ Modelo {request.model_id} actualizado para planta {plant_id}")
        else:
            # Crear nuevo assignment
            insert_result = await db.execute_query("""
                INSERT INTO plant_model_assignments (plant_id, model_id)
                VALUES (%s, %s)
                RETURNING id
            """, (plant_id, request.model_id))
            
            if insert_result is None or insert_result.empty:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="No se pudo asignar el modelo a la planta",
                )
            
            assignment_id = insert_result.iloc[0]["id"]
            logger.info(f"✅ Modelo {request.model_id} asignado a planta {plant_id} (assignment_id: {assignment_id})")
        
        return {
            "message": "Modelo 3D asignado exitosamente a la planta",
            "plant_id": plant_id,
            "model_id": request.model_id,
            "model_name": str(model_data["name"]),
            "model_url": str(model_data["model_3d_url"]),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error asignando modelo a planta: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error asignando modelo a planta: {str(e)}",
        )
