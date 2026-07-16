"""
Identificación de plantas con Pl@ntNet API (https://my.plantnet.org/).

Alternativa gratuita y especializada a GPT-4o Vision: Pl@ntNet identifica la
especie a partir de la foto, sin requerir créditos de pago de OpenAI.

Pl@ntNet devuelve identificación taxonómica (especie, nombre científico,
familia) pero NO datos de cuidado (riego, humedad, temperatura). Esos los
completamos con una tabla por familia botánica + valores por defecto, para
mantener el mismo formato de respuesta que espera el resto de la app.
"""
import requests
import logging
from typing import Dict, Optional
from .config import settings

logger = logging.getLogger(__name__)

PLANTNET_BASE_URL = "https://my-api.plantnet.org/v2/identify"


# Cuidados por familia botánica. Valores razonables para plantas de interior/
# jardín comunes; si la familia no está mapeada se usa DEFAULT_CARE.
# care_level: "Fácil" | "Medio" | "Difícil"
_FAMILY_CARE = {
    # Cactus
    "Cactaceae": {
        "care_level": "Fácil",
        "care_tips": "Riega poco (deja secar bien la tierra entre riegos) y dale mucha luz solar directa.",
        "optimal_humidity_min": 20.0, "optimal_humidity_max": 40.0,
        "optimal_temp_min": 15.0, "optimal_temp_max": 30.0,
    },
    # Suculentas
    "Crassulaceae": {
        "care_level": "Fácil",
        "care_tips": "Riego escaso, tierra con buen drenaje y luz brillante. Evita el exceso de agua.",
        "optimal_humidity_min": 20.0, "optimal_humidity_max": 45.0,
        "optimal_temp_min": 15.0, "optimal_temp_max": 28.0,
    },
    "Aizoaceae": {
        "care_level": "Fácil",
        "care_tips": "Suculenta: muy poca agua y sol pleno.",
        "optimal_humidity_min": 20.0, "optimal_humidity_max": 40.0,
        "optimal_temp_min": 15.0, "optimal_temp_max": 30.0,
    },
    # Tropicales (Monstera, Pothos, Filodendro, Anthurium...)
    "Araceae": {
        "care_level": "Medio",
        "care_tips": "Luz indirecta brillante y humedad media-alta. Riega cuando los primeros cm de tierra estén secos.",
        "optimal_humidity_min": 50.0, "optimal_humidity_max": 70.0,
        "optimal_temp_min": 18.0, "optimal_temp_max": 27.0,
    },
    # Sansevieria, Dracaena, Aloe (hoy en Asphodelaceae, pero mapeamos ambas)
    "Asparagaceae": {
        "care_level": "Fácil",
        "care_tips": "Muy resistente: tolera poca luz y riego infrecuente.",
        "optimal_humidity_min": 30.0, "optimal_humidity_max": 50.0,
        "optimal_temp_min": 15.0, "optimal_temp_max": 28.0,
    },
    "Asphodelaceae": {
        "care_level": "Fácil",
        "care_tips": "Poca agua y luz brillante indirecta. El aloe tolera sol directo suave.",
        "optimal_humidity_min": 25.0, "optimal_humidity_max": 45.0,
        "optimal_temp_min": 15.0, "optimal_temp_max": 30.0,
    },
    # Ficus / higueras
    "Moraceae": {
        "care_level": "Medio",
        "care_tips": "Luz brillante indirecta. Riega de forma moderada y evita cambios bruscos de ubicación.",
        "optimal_humidity_min": 40.0, "optimal_humidity_max": 60.0,
        "optimal_temp_min": 16.0, "optimal_temp_max": 27.0,
    },
    # Helechos
    "Polypodiaceae": {
        "care_level": "Difícil",
        "care_tips": "Necesita mucha humedad y luz indirecta suave. Mantén la tierra siempre ligeramente húmeda.",
        "optimal_humidity_min": 60.0, "optimal_humidity_max": 80.0,
        "optimal_temp_min": 16.0, "optimal_temp_max": 24.0,
    },
    "Dryopteridaceae": {
        "care_level": "Difícil",
        "care_tips": "Alta humedad y sombra parcial. No dejes que la tierra se seque del todo.",
        "optimal_humidity_min": 60.0, "optimal_humidity_max": 80.0,
        "optimal_temp_min": 16.0, "optimal_temp_max": 24.0,
    },
    # Rosas y afines
    "Rosaceae": {
        "care_level": "Medio",
        "care_tips": "Sol directo varias horas al día y riego regular sin encharcar.",
        "optimal_humidity_min": 40.0, "optimal_humidity_max": 60.0,
        "optimal_temp_min": 15.0, "optimal_temp_max": 26.0,
    },
}

DEFAULT_CARE = {
    "care_level": "Medio",
    "care_tips": "Riega cuando la tierra esté seca al tacto y ubícala en un lugar con buena luz indirecta.",
    "optimal_humidity_min": 40.0, "optimal_humidity_max": 70.0,
    "optimal_temp_min": 15.0, "optimal_temp_max": 25.0,
}


def _care_for_family(family: Optional[str]) -> Dict:
    """Devuelve los cuidados de la familia botánica, o los valores por defecto."""
    if family and family in _FAMILY_CARE:
        return _FAMILY_CARE[family]
    return DEFAULT_CARE


def identify_plant_with_plantnet(
    image_bytes: bytes,
    filename: str = "plant.jpg",
    plant_species: Optional[str] = None,
) -> Dict[str, any]:
    """
    Identifica una planta con Pl@ntNet a partir de los bytes de la imagen.

    Args:
        image_bytes: Contenido binario de la foto (JPG/PNG).
        filename: Nombre del archivo (para el content-type del multipart).
        plant_species: Pista opcional del usuario (no la usa Pl@ntNet directamente,
            pero se conserva por compatibilidad de firma con el flujo OpenAI).

    Returns:
        Dict con el mismo formato que identify_plant_with_vision:
        plant_type, scientific_name, care_level, care_tips,
        optimal_humidity_min/max, optimal_temp_min/max.

    Raises:
        AIServiceError: si Pl@ntNet no está configurado, no hay cuota, o no
            reconoce la planta (mensaje ya amigable para el usuario).
    """
    # Import diferido para evitar dependencia circular con openai_config
    from .openai_config import AIServiceError

    if not settings.PLANTNET_API_KEY:
        logger.error("PLANTNET_API_KEY no configurada")
        raise AIServiceError(
            "El servicio de identificación no está disponible por ahora. "
            "Vuelve a intentarlo más tarde.", 503,
        )

    project = settings.PLANTNET_PROJECT or "all"
    url = f"{PLANTNET_BASE_URL}/{project}"
    params = {"api-key": settings.PLANTNET_API_KEY, "lang": "es", "nb-results": 3}
    files = [("images", (filename, image_bytes))]
    data = {"organs": ["auto"]}

    try:
        resp = requests.post(url, params=params, files=files, data=data, timeout=25)
    except requests.Timeout:
        raise AIServiceError(
            "La identificación tardó demasiado. Revisa tu conexión e intenta de nuevo.", 504,
        )
    except requests.RequestException as e:
        logger.error(f"Error de red con Pl@ntNet: {e}")
        raise AIServiceError(
            "No se pudo conectar con el servicio de identificación. Intenta de nuevo.", 502,
        )

    # 404 = Pl@ntNet no reconoció ninguna especie con confianza
    if resp.status_code == 404:
        raise AIServiceError(
            "No pudimos identificar esta planta. Prueba con otra foto más clara "
            "o más cercana a las hojas o flores.", 404,
        )
    # 401/403 = key inválida; 429 = cuota diaria agotada
    if resp.status_code in (401, 403):
        logger.error(f"Pl@ntNet key inválida ({resp.status_code}): {resp.text[:200]}")
        raise AIServiceError(
            "El servicio de identificación no está disponible por ahora. "
            "Vuelve a intentarlo más tarde.", 503,
        )
    if resp.status_code == 429:
        raise AIServiceError(
            "Se alcanzó el límite diario de identificaciones. Intenta de nuevo mañana.", 429,
        )
    if resp.status_code != 200:
        logger.error(f"Pl@ntNet respondió {resp.status_code}: {resp.text[:200]}")
        raise AIServiceError(
            "No se pudo identificar la planta. Intenta con otra foto.", 502,
        )

    payload = resp.json()
    results = payload.get("results") or []
    if not results:
        raise AIServiceError(
            "No pudimos identificar esta planta. Prueba con otra foto más clara.", 404,
        )

    top = results[0]
    species = top.get("species", {})
    scientific_name = species.get("scientificNameWithoutAuthor") or species.get("scientificName")
    common_names = species.get("commonNames") or []
    family = (species.get("family") or {}).get("scientificNameWithoutAuthor")
    score = top.get("score", 0)

    # plant_type: preferir nombre común (en español si vino), si no el científico
    plant_type = common_names[0] if common_names else (scientific_name or "Planta")

    care = _care_for_family(family)

    remaining = payload.get("remainingIdentificationRequests")
    logger.info(
        f"✅ Pl@ntNet identificó: {plant_type} ({scientific_name}) "
        f"score={score:.2f} familia={family} | cuota restante hoy: {remaining}"
    )

    return {
        "plant_type": plant_type,
        "scientific_name": scientific_name or plant_type,
        "care_level": care["care_level"],
        "care_tips": care["care_tips"],
        "optimal_humidity_min": care["optimal_humidity_min"],
        "optimal_humidity_max": care["optimal_humidity_max"],
        "optimal_temp_min": care["optimal_temp_min"],
        "optimal_temp_max": care["optimal_temp_max"],
    }
