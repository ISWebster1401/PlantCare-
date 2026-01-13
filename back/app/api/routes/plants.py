from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
import logging
import json
import pandas as pd

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
    PokedexEntryResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/plants", tags=["plants"])


def require_admin(current_user: dict = Depends(get_current_active_user)):
    """Middleware para verificar que el usuario sea administrador (role_id = 2) o superadmin (role_id = 3)"""
    role_id = current_user.get("role_id")
    
    # Intentar convertir a int si es string numérico
    try:
        role_id_int = int(role_id) if role_id is not None else None
        if role_id_int not in [2, 3]:
            logger.warning(f"[DEBUG ADMIN] Acceso denegado: role_id={role_id} (esperado: 2 o 3)")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado. Se requieren permisos de administrador o superadministrador."
            )
    except (ValueError, TypeError):
        logger.warning(f"[DEBUG ADMIN] Acceso denegado: role_id={role_id} no es válido (esperado: 2 o 3)")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requieren permisos de administrador o superadministrador."
        )
    
    logger.info(f"[DEBUG ADMIN] Acceso permitido para usuario {current_user.get('email')} (role_id={role_id_int})")
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
        "ficus lira": "Ficus",
        "ficus lyrata": "Ficus",
        
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
        "planta del dinero": "Dólar",
        "pilea": "Dólar",
        "pilea peperomioides": "Dólar",
        "money plant": "Dólar",
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
        
        # DEBUG: Verificar qué modelos existen para este tipo
        debug_models = await db.execute_query("""
            SELECT id, plant_type, name, is_default, created_at, updated_at
            FROM plant_models
            WHERE plant_type = %s
            ORDER BY is_default DESC, created_at DESC
        """, (normalized_type,))
        if debug_models is not None and not debug_models.empty:
            logger.info(f"🔍 DEBUG: Encontrados {len(debug_models)} modelos para tipo '{normalized_type}':")
            for _, row in debug_models.iterrows():
                logger.info(f"   - ID: {row['id']}, Nombre: {row['name']}, is_default: {row['is_default']}, Creado: {row.get('created_at')}")
        else:
            logger.warning(f"🔍 DEBUG: No se encontraron modelos para tipo '{normalized_type}'")
        
        # 2. Buscar modelo predeterminado para el tipo de planta normalizado
        # Buscar el más reciente con is_default = TRUE (el más reciente es el último subido)
        model_df = await db.execute_query("""
            SELECT id, default_render_url, model_3d_url, name, plant_type
            FROM plant_models
            WHERE plant_type = %s AND is_default = TRUE
            ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC
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
            model_name = model_df.iloc[0].get("name", "Unknown")
            logger.info(f"✅ Modelo específico encontrado para '{normalized_type}' (id: {model_id}, nombre: {model_name})")
        
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


@router.get("/species", response_model=List[str])
async def get_plant_species(
    current_user: dict = Depends(get_current_active_user),
):
    """
    Devuelve una lista de todas las especies de plantas comunes disponibles.
    Útil para autocompletado en el frontend.
    """
    # Lista completa de especies de plantas comunes (nombres científicos y comunes)
    species_list = [
        # Araceae (Monstera, Pothos, etc.)
        "Monstera deliciosa",
        "Monstera adansonii",
        "Monstera obliqua",
        "Epipremnum aureum",  # Pothos
        "Philodendron hederaceum",
        "Philodendron bipinnatifidum",
        "Anthurium andraeanum",
        "Spathiphyllum wallisii",  # Espatifilo
        "Zamioculcas zamiifolia",  # Zamioculca
        "Aglaonema commutatum",
        "Dieffenbachia seguine",
        "Syngonium podophyllum",
        
        # Ficus
        "Ficus lyrata",  # Ficus Lira
        "Ficus elastica",  # Ficus de Goma
        "Ficus benjamina",
        "Ficus microcarpa",
        "Ficus pumila",
        
        # Suculentas y Cactus
        "Echeveria elegans",
        "Echeveria 'Perle von Nürnberg'",
        "Crassula ovata",  # Árbol de Jade
        "Aloe vera",
        "Aloe barbadensis",
        "Haworthia fasciata",
        "Kalanchoe blossfeldiana",
        "Sedum morganianum",  # Cola de Burro
        "Schlumbergera truncata",  # Cactus de Navidad
        "Opuntia ficus-indica",
        "Mammillaria",
        "Echinocactus grusonii",
        "Cereus",
        
        # Sansevieria
        "Sansevieria trifasciata",
        "Sansevieria cylindrica",
        "Sansevieria laurentii",
        
        # Dracaena
        "Dracaena marginata",
        "Dracaena fragrans",
        "Dracaena deremensis",
        
        # Helechos
        "Nephrolepis exaltata",  # Helecho Espada
        "Adiantum capillus-veneris",  # Culantrillo
        "Pteris cretica",
        "Asplenium nidus",  # Nido de Ave
        
        # Otras comunes
        "Pilea peperomioides",  # Planta del Dólar
        "Peperomia obtusifolia",
        "Calathea orbifolia",
        "Calathea makoyana",
        "Maranta leuconeura",
        "Stromanthe sanguinea",
        "Tradescantia zebrina",
        "Chlorophytum comosum",  # Cinta
        "Hedera helix",  # Hiedra
        "Schefflera arboricola",
        "Yucca elephantipes",
        "Beaucarnea recurvata",  # Nolina
        "Aspidistra elatior",
        "Cyperus alternifolius",
        "Lavandula angustifolia",  # Lavanda
        "Rosmarinus officinalis",  # Romero
        "Mentha",  # Menta
        "Ocimum basilicum",  # Albahaca
        "Petroselinum crispum",  # Perejil
    ]
    
    return sorted(species_list)


@router.post("/identify", response_model=PlantIdentify)
async def identify_plant(
    file: UploadFile = File(...),
    plant_species: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_active_user),
):
    """Sube una foto a Supabase Storage y usa GPT‑4o Vision para identificar la planta.
    
    Args:
        file: Imagen de la planta
        plant_species: (Opcional) Especie de la planta si el usuario la conoce. 
                      Si se proporciona, se usa para mejorar la precisión de la identificación.
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

        logger.info(f"✅ Archivo válido para identificación: {file.filename} ({file.content_type})")

        # Leer el contenido del archivo antes de subirlo
        # FastAPI UploadFile.file puede ser un SpooledTemporaryFile o similar
        file_content = await file.read()
        from io import BytesIO
        file_buffer = BytesIO(file_content)
        
        original_photo_url = upload_image(file_buffer, folder="plants/original")
        # Pasar especie si el usuario la proporcionó
        plant_data = await identify_plant_with_vision(original_photo_url, plant_species=plant_species)

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
    plant_species: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Flujo completo de creación de planta.

    1. Valida la imagen (JPEG/PNG)
    2. Sube foto original a Supabase Storage
    3. Identifica la planta con GPT‑4o Vision (mejorada si se proporciona plant_species)
    4. Guarda todo en la base de datos y devuelve la planta creada
    
    Args:
        file: Imagen de la planta
        plant_name: Nombre personalizado de la planta
        plant_species: (Opcional) Especie/tipo de planta si el usuario la conoce.
                      Se usa para mejorar la precisión de la identificación.
    
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
        # Leer el contenido del archivo antes de subirlo
        # FastAPI UploadFile.file puede ser un SpooledTemporaryFile o similar
        file_content = await file.read()
        from io import BytesIO
        file_buffer = BytesIO(file_content)
        
        original_photo_url = upload_image(file_buffer, folder="plants/original")

        # 2. Identificar planta (mejorada si el usuario proporcionó especie)
        logger.info("Identificando planta...")
        if plant_species:
            logger.info(f"Usuario proporcionó especie: {plant_species}. Mejorando identificación...")
        plant_data = await identify_plant_with_vision(original_photo_url, plant_species=plant_species)

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
                pm.model_3d_url,
                pm.default_render_url
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
        # Manejar valores NaN/None de pandas para campos de modelo 3D
        if pd.notna(plant.get("model_3d_url")):
            plant["model_3d_url"] = str(plant["model_3d_url"])
        else:
            plant["model_3d_url"] = None
        if pd.notna(plant.get("default_render_url")):
            plant["default_render_url"] = str(plant["default_render_url"])
        else:
            plant["default_render_url"] = None

        logger.info(f"✅ Planta creada exitosamente: {plant_name} (ID: {plant_id})")
        logger.info(f"   model_3d_url: {plant.get('model_3d_url')}")
        logger.info(f"   default_render_url: {plant.get('default_render_url')}")
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
                pm.model_3d_url,
                pm.default_render_url
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
                # Manejar valores NaN/None de pandas para campos de modelo 3D
                if pd.notna(plant.get("model_3d_url")):
                    plant["model_3d_url"] = str(plant["model_3d_url"])
                else:
                    plant["model_3d_url"] = None
                if pd.notna(plant.get("default_render_url")):
                    plant["default_render_url"] = str(plant["default_render_url"])
                else:
                    plant["default_render_url"] = None
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
                pm.model_3d_url,
                pm.default_render_url
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
        # Manejar valores NaN/None de pandas para campos de modelo 3D
        if pd.notna(plant.get("model_3d_url")):
            plant["model_3d_url"] = str(plant["model_3d_url"])
        else:
            plant["model_3d_url"] = None
        if pd.notna(plant.get("default_render_url")):
            plant["default_render_url"] = str(plant["default_render_url"])
        else:
            plant["default_render_url"] = None

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
    is_default: Optional[str] = Form(None),  # Cambiar a str para manejar "true"/"false" desde FormData
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
        
        # Preparar datos para insertar/actualizar en plant_models
        model_plant_type = plant_type or "Planta"
        model_name = name or f"Modelo 3D {file.filename}"
        
        metadata_dict = {
            "uploaded_by": "user",
            "original_filename": file.filename
        }
        
        # Convertir is_default de string a bool si viene como string
        is_default_bool = None
        if is_default is not None:
            if isinstance(is_default, str):
                is_default_bool = is_default.lower() in ('true', '1', 'yes', 'on')
            else:
                is_default_bool = bool(is_default)
        
        logger.info(f"📤 Subiendo modelo: tipo='{model_plant_type}', nombre='{model_name}', is_default={is_default_bool}")
        
        # Lógica mejorada para determinar si debe ser default:
        # 1. Si is_default es explícitamente True, marcar como default (y reemplazar si existe)
        # 2. Si is_default es None/False pero es el PRIMER modelo del tipo, marcarlo como default automáticamente
        # 3. Si ya existe un default y is_default es False, crear sin marcar como default
        if model_plant_type:
            # Verificar si ya existe algún modelo para este tipo
            any_model_for_type = await db.execute_query("""
                SELECT id FROM plant_models
                WHERE plant_type = %s
                LIMIT 1
            """, (model_plant_type,))
            
            existing_default_model = await db.execute_query("""
                SELECT id FROM plant_models
                WHERE plant_type = %s AND is_default = TRUE
                LIMIT 1
            """, (model_plant_type,))
            
            is_first_model = (any_model_for_type is None or any_model_for_type.empty)
            has_existing_default = (existing_default_model is not None and not existing_default_model.empty)
            
            # Determinar si debe ser default
            if is_default_bool is True:
                # Usuario marcó explícitamente como default
                should_be_default = True
                if has_existing_default:
                    # Reemplazar el modelo default existente
                    model_id = existing_default_model.iloc[0]["id"]
                    update_result = await db.execute_query("""
                        UPDATE plant_models
                        SET model_3d_url = %s, name = %s, metadata = %s::jsonb, updated_at = NOW()
                        WHERE id = %s
                        RETURNING id, plant_type, name, model_3d_url, default_render_url, is_default, metadata
                    """, (
                        model_url,
                        model_name,
                        json.dumps(metadata_dict),
                        model_id
                    ))
                    
                    if update_result is not None and not update_result.empty:
                        insert_result = update_result
                        logger.info(f"✅ Modelo default actualizado para tipo '{model_plant_type}' (id: {model_id})")
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="No se pudo actualizar el modelo existente",
                        )
                else:
                    # No hay default, crear nuevo como default
                    insert_result = await db.execute_query("""
                        INSERT INTO plant_models (plant_type, name, model_3d_url, is_default, metadata)
                        VALUES (%s, %s, %s, %s, %s::jsonb)
                        RETURNING id, plant_type, name, model_3d_url, default_render_url, is_default, metadata
                    """, (
                        model_plant_type,
                        model_name,
                        model_url,
                        True,
                        json.dumps(metadata_dict)
                    ))
                    logger.info(f"✅ Nuevo modelo creado para tipo '{model_plant_type}' como default")
            else:
                # is_default es None o False
                if is_first_model:
                    # Es el primer modelo de este tipo, marcarlo como default automáticamente
                    should_be_default = True
                    logger.info(f"✅ Primer modelo para tipo '{model_plant_type}', marcado como default automáticamente")
                else:
                    # Ya existe un modelo, no marcar como default a menos que sea explícito
                    should_be_default = False
                    logger.info(f"✅ Modelo adicional para tipo '{model_plant_type}', no marcado como default")
                
                insert_result = await db.execute_query("""
                    INSERT INTO plant_models (plant_type, name, model_3d_url, is_default, metadata)
                    VALUES (%s, %s, %s, %s, %s::jsonb)
                    RETURNING id, plant_type, name, model_3d_url, default_render_url, is_default, metadata, created_at
                """, (
                    model_plant_type,
                    model_name,
                    model_url,
                    should_be_default,
                    json.dumps(metadata_dict)
                ))
                
                if insert_result is not None and not insert_result.empty:
                    inserted_model = insert_result.iloc[0]
                    logger.info(f"✅ Modelo creado: ID={inserted_model['id']}, Tipo={inserted_model['plant_type']}, "
                              f"Nombre={inserted_model['name']}, is_default={inserted_model['is_default']}")
        else:
            # No hay plant_type específico, crear nuevo modelo
            insert_result = await db.execute_query("""
                INSERT INTO plant_models (plant_type, name, model_3d_url, is_default, metadata)
                VALUES (%s, %s, %s, %s, %s::jsonb)
                RETURNING id, plant_type, name, model_3d_url, default_render_url, is_default, metadata
            """, (
                model_plant_type,
                model_name,
                model_url,
                is_default_bool if is_default_bool is not None else False,
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


@router.put("/models/{model_id}", response_model=PlantModelResponse, status_code=status.HTTP_200_OK)
async def update_plant_model(
    model_id: int,
    file: Optional[UploadFile] = File(None),
    plant_type: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    is_default: Optional[str] = Form(None),
    current_user: dict = Depends(require_admin),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """
    Actualiza un modelo 3D existente.
    
    Permite actualizar:
    - El archivo .glb (opcional)
    - El nombre del modelo (opcional)
    - El tipo de planta (opcional)
    - Si es modelo default (opcional)
    
    Si se marca como default, desmarca otros defaults del mismo tipo.
    """
    try:
        # 1. Verificar que el modelo existe
        existing_model_df = await db.execute_query("""
            SELECT id, plant_type, name, model_3d_url, is_default, metadata
            FROM plant_models
            WHERE id = %s
            LIMIT 1
        """, (model_id,))
        
        if existing_model_df is None or existing_model_df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Modelo 3D con ID {model_id} no encontrado"
            )
        
        existing_model = existing_model_df.iloc[0]
        current_plant_type = existing_model["plant_type"]
        current_name = existing_model["name"]
        current_model_url = existing_model["model_3d_url"]
        current_is_default = existing_model["is_default"]
        current_metadata = existing_model.get("metadata") or {}
        
        # 2. Convertir is_default de string a bool si viene como string
        is_default_bool = None
        if is_default is not None:
            if isinstance(is_default, str):
                is_default_bool = is_default.lower() in ('true', '1', 'yes', 'on')
            else:
                is_default_bool = bool(is_default)
        
        # 3. Determinar valores a actualizar
        new_plant_type = plant_type if plant_type else current_plant_type
        new_name = name if name else current_name
        new_model_url = current_model_url
        new_is_default = is_default_bool if is_default_bool is not None else current_is_default
        
        # 4. Si se subió un nuevo archivo, reemplazarlo
        if file:
            logger.info(f"📤 Actualizando archivo del modelo {model_id}")
            new_model_url = upload_file(file.file, folder="3d_models", max_size_mb=50)
            
            # Actualizar metadata con información del nuevo archivo
            current_metadata["last_file_update"] = datetime.now().isoformat()
            current_metadata["original_filename"] = file.filename
            current_metadata["updated_by"] = "user"
        
        # 5. Si se cambió el tipo de planta o se marcó como default, manejar defaults
        if new_plant_type != current_plant_type or (is_default_bool is True and not current_is_default):
            # Si se marca como default, desmarcar otros defaults del mismo tipo
            if new_is_default:
                await db.execute_query("""
                    UPDATE plant_models
                    SET is_default = FALSE, updated_at = NOW()
                    WHERE plant_type = %s AND is_default = TRUE AND id != %s
                """, (new_plant_type, model_id))
                logger.info(f"✅ Otros modelos default de tipo '{new_plant_type}' desmarcados")
        
        # 6. Actualizar el modelo
        update_result = await db.execute_query("""
            UPDATE plant_models
            SET 
                plant_type = %s,
                name = %s,
                model_3d_url = %s,
                is_default = %s,
                metadata = %s::jsonb,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, plant_type, name, model_3d_url, default_render_url, is_default, metadata
        """, (
            new_plant_type,
            new_name,
            new_model_url,
            new_is_default,
            json.dumps(current_metadata),
            model_id
        ))
        
        if update_result is None or update_result.empty:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo actualizar el modelo en la base de datos"
            )
        
        model_row = update_result.iloc[0]
        model_data = {
            "id": int(model_row["id"]),
            "plant_type": str(model_row["plant_type"]),
            "name": str(model_row["name"]),
            "model_3d_url": str(model_row["model_3d_url"]),
            "default_render_url": model_row.get("default_render_url"),
            "is_default": bool(model_row["is_default"]),
            "metadata": model_row.get("metadata"),
        }
        
        logger.info(f"✅ Modelo 3D actualizado exitosamente: {model_data['id']} - {model_data['name']}")
        
        return PlantModelResponse(**model_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando modelo 3D: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error actualizando modelo 3D: {str(e)}",
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


# ============================================
# ENDPOINTS DE POKEDEX
# ============================================

@router.post("/pokedex/scan", response_model=PokedexEntryResponse, status_code=status.HTTP_201_CREATED)
async def scan_pokedex(
    file: UploadFile = File(...),
    plant_species: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """
    Escanea una planta y la agrega/actualiza en la pokedex del usuario.
    No crea una planta en el jardín, solo la registra en el catálogo personal.
    
    Args:
        file: Imagen de la planta
        plant_species: (Opcional) Especie de la planta si el usuario la conoce
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

        logger.info(f"✅ Archivo válido para pokedex: {file.filename} ({file.content_type})")

        # 1. Subir foto a Supabase Storage
        file_content = await file.read()
        from io import BytesIO
        file_buffer = BytesIO(file_content)
        
        original_photo_url = upload_image(file_buffer, folder="pokedex")

        # 2. Identificar planta con IA
        if plant_species:
            logger.info(f"Usuario proporcionó especie para pokedex: {plant_species}")
        plant_data = await identify_plant_with_vision(original_photo_url, plant_species=plant_species)

        # 3. Verificar si ya existe en la pokedex del usuario
        existing_entry = await db.execute_query("""
            SELECT id FROM plant_pokedex
            WHERE user_id = %s 
            AND plant_type = %s 
            AND scientific_name = %s
            LIMIT 1
        """, (current_user["id"], plant_data.get("plant_type"), plant_data.get("scientific_name")))

        if existing_entry is not None and not existing_entry.empty:
            # Actualizar entrada existente
            entry_id = existing_entry.iloc[0]["id"]
            logger.info(f"🔄 Actualizando entrada existente en pokedex (ID: {entry_id})")
            
            await db.execute_query("""
                UPDATE plant_pokedex
                SET care_level = %s,
                    care_tips = %s,
                    original_photo_url = %s,
                    optimal_humidity_min = %s,
                    optimal_humidity_max = %s,
                    optimal_temp_min = %s,
                    optimal_temp_max = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (
                plant_data.get("care_level"),
                plant_data.get("care_tips"),
                original_photo_url,
                plant_data.get("optimal_humidity_min"),
                plant_data.get("optimal_humidity_max"),
                plant_data.get("optimal_temp_min"),
                plant_data.get("optimal_temp_max"),
                entry_id
            ))
            
            # Recuperar entrada actualizada
            updated_entry = await db.execute_query("""
                SELECT * FROM plant_pokedex WHERE id = %s
            """, (entry_id,))
            
            entry_dict = updated_entry.iloc[0].to_dict()
            if pd.notna(entry_dict.get("optimal_humidity_min")):
                entry_dict["optimal_humidity_min"] = float(entry_dict["optimal_humidity_min"])
            if pd.notna(entry_dict.get("optimal_humidity_max")):
                entry_dict["optimal_humidity_max"] = float(entry_dict["optimal_humidity_max"])
            if pd.notna(entry_dict.get("optimal_temp_min")):
                entry_dict["optimal_temp_min"] = float(entry_dict["optimal_temp_min"])
            if pd.notna(entry_dict.get("optimal_temp_max")):
                entry_dict["optimal_temp_max"] = float(entry_dict["optimal_temp_max"])
            
            return PokedexEntryResponse(**entry_dict)
        else:
            # Crear nueva entrada
            logger.info(f"✨ Creando nueva entrada en pokedex para tipo: {plant_data.get('plant_type')}")
            
            result = await db.execute_query("""
                INSERT INTO plant_pokedex (
                    user_id, plant_type, scientific_name, care_level, care_tips,
                    original_photo_url, optimal_humidity_min, optimal_humidity_max,
                    optimal_temp_min, optimal_temp_max
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                current_user["id"],
                plant_data.get("plant_type", "Planta"),
                plant_data.get("scientific_name"),
                plant_data.get("care_level"),
                plant_data.get("care_tips"),
                original_photo_url,
                plant_data.get("optimal_humidity_min"),
                plant_data.get("optimal_humidity_max"),
                plant_data.get("optimal_temp_min"),
                plant_data.get("optimal_temp_max")
            ))
            
            entry_dict = result.iloc[0].to_dict()
            if pd.notna(entry_dict.get("optimal_humidity_min")):
                entry_dict["optimal_humidity_min"] = float(entry_dict["optimal_humidity_min"])
            if pd.notna(entry_dict.get("optimal_humidity_max")):
                entry_dict["optimal_humidity_max"] = float(entry_dict["optimal_humidity_max"])
            if pd.notna(entry_dict.get("optimal_temp_min")):
                entry_dict["optimal_temp_min"] = float(entry_dict["optimal_temp_min"])
            if pd.notna(entry_dict.get("optimal_temp_max")):
                entry_dict["optimal_temp_max"] = float(entry_dict["optimal_temp_max"])
            
            logger.info(f"✅ Entrada agregada a pokedex (ID: {entry_dict['id']})")
            return PokedexEntryResponse(**entry_dict)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error escaneando planta para pokedex: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error escaneando planta para pokedex: {str(e)}",
        )


@router.get("/pokedex/", response_model=List[PokedexEntryResponse])
async def get_pokedex_entries(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """
    Obtiene todas las plantas en la pokedex del usuario actual.
    Ordenadas por fecha de descubrimiento (más recientes primero).
    """
    try:
        entries_df = await db.execute_query("""
            SELECT * FROM plant_pokedex
            WHERE user_id = %s
            ORDER BY discovered_at DESC
        """, (current_user["id"],))

        if entries_df is None or entries_df.empty:
            return []

        entries = []
        for _, row in entries_df.iterrows():
            try:
                entry = row.to_dict()
                # Convertir valores NaN a None y floats correctamente
                if pd.notna(entry.get("optimal_humidity_min")):
                    entry["optimal_humidity_min"] = float(entry["optimal_humidity_min"])
                else:
                    entry["optimal_humidity_min"] = None
                if pd.notna(entry.get("optimal_humidity_max")):
                    entry["optimal_humidity_max"] = float(entry["optimal_humidity_max"])
                else:
                    entry["optimal_humidity_max"] = None
                if pd.notna(entry.get("optimal_temp_min")):
                    entry["optimal_temp_min"] = float(entry["optimal_temp_min"])
                else:
                    entry["optimal_temp_min"] = None
                if pd.notna(entry.get("optimal_temp_max")):
                    entry["optimal_temp_max"] = float(entry["optimal_temp_max"])
                else:
                    entry["optimal_temp_max"] = None
                entries.append(PokedexEntryResponse(**entry))
            except Exception as e:
                logger.warning(f"Error serializando entrada de pokedex {entry.get('id', 'unknown')}: {e}")
                continue

        logger.info(f"✅ {len(entries)} entradas de pokedex obtenidas para usuario {current_user['id']}")
        return entries

    except Exception as e:
        logger.error(f"Error obteniendo entradas de pokedex: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo entradas de pokedex: {str(e)}",
        )


@router.get("/pokedex/{entry_id}", response_model=PokedexEntryResponse)
async def get_pokedex_entry(
    entry_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """
    Obtiene el detalle de una entrada específica de la pokedex del usuario.
    """
    try:
        entry_df = await db.execute_query("""
            SELECT * FROM plant_pokedex
            WHERE id = %s AND user_id = %s
            LIMIT 1
        """, (entry_id, current_user["id"]))

        if entry_df is None or entry_df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada de pokedex no encontrada",
            )

        entry = entry_df.iloc[0].to_dict()
        # Convertir valores NaN a None y floats correctamente
        if pd.notna(entry.get("optimal_humidity_min")):
            entry["optimal_humidity_min"] = float(entry["optimal_humidity_min"])
        else:
            entry["optimal_humidity_min"] = None
        if pd.notna(entry.get("optimal_humidity_max")):
            entry["optimal_humidity_max"] = float(entry["optimal_humidity_max"])
        else:
            entry["optimal_humidity_max"] = None
        if pd.notna(entry.get("optimal_temp_min")):
            entry["optimal_temp_min"] = float(entry["optimal_temp_min"])
        else:
            entry["optimal_temp_min"] = None
        if pd.notna(entry.get("optimal_temp_max")):
            entry["optimal_temp_max"] = float(entry["optimal_temp_max"])
        else:
            entry["optimal_temp_max"] = None

        return PokedexEntryResponse(**entry)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo entrada de pokedex: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo entrada de pokedex: {str(e)}",
        )


@router.delete("/pokedex/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pokedex_entry(
    entry_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """
    Elimina una entrada de la pokedex del usuario.
    """
    try:
        # Verificar que la entrada pertenece al usuario
        entry_df = await db.execute_query("""
            SELECT id FROM plant_pokedex
            WHERE id = %s AND user_id = %s
            LIMIT 1
        """, (entry_id, current_user["id"]))

        if entry_df is None or entry_df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entrada de pokedex no encontrada",
            )

        # Eliminar entrada
        await db.execute_query("""
            DELETE FROM plant_pokedex
            WHERE id = %s AND user_id = %s
        """, (entry_id, current_user["id"]))

        logger.info(f"✅ Entrada de pokedex eliminada (ID: {entry_id})")
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando entrada de pokedex: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error eliminando entrada de pokedex: {str(e)}",
        )
