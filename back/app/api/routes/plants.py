from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
import logging

from pgdbtoolkit import AsyncPgDbToolkit

from ..core.auth_user import get_current_active_user
from ..core.database import get_db
from ..core.openai_config import identify_plant_with_vision
from ..core.supabase_storage import upload_image
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
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/plants", tags=["plants"])


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

        # Recuperar la planta completa
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
        plants_df = await db.execute_query(
            """
            SELECT * FROM plants
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (current_user["id"],),
        )

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
    Devuelve el detalle de una planta específica del usuario.
    """
    try:
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
