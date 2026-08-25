"""
Estado de salud de una planta.

Se calcula al leer, no se guarda: así una planta se marchita sola con el paso
de los días sin necesidad de un proceso que corra en segundo plano.

Hay dos fuentes, en orden de prioridad:

1. La humedad del suelo que reporta el sensor físico. Es el dato real y manda
   cuando existe.
2. Los días desde el último riego. Es la estimación que usamos mientras no haya
   sensor, que hoy es el caso de casi todos los usuarios.

Cuando el sensor esté listo no hay que reescribir nada: empieza a llegar
`soil_moisture` y esta función lo prefiere sola.
"""
from datetime import datetime
from typing import Optional, Tuple

# Días que aguanta cada tipo entre riegos. Un cactus y un helecho no se
# descuidan al mismo ritmo, y tratarlos igual haría que la mitad de las plantas
# se vean marchitas sin razón.
WATERING_INTERVAL_DAYS = {
    "Cactus": 14,
    "Suculenta": 14,
    "Aloe": 12,
    "Sansevieria": 12,
    "Ficus": 8,
    "Monstera": 7,
    "Pothos": 7,
    "Dólar": 7,
    "Peral": 5,
    "Pata de Vaca": 5,
    "Patata": 4,
    "Pimenton": 3,
    "Petunia": 3,
    "Amapola": 3,
    "Helecho": 3,
}
DEFAULT_INTERVAL_DAYS = 7

HEALTHY = ("healthy", "happy")
WARNING = ("warning", "sad")
CRITICAL = ("critical", "sick")


def interval_for(plant_type: Optional[str]) -> int:
    """Días entre riegos esperados para un tipo de planta."""
    if not plant_type:
        return DEFAULT_INTERVAL_DAYS
    return WATERING_INTERVAL_DAYS.get(plant_type, DEFAULT_INTERVAL_DAYS)


def health_from_moisture(
    soil_moisture: float,
    optimal_min: Optional[float],
) -> Tuple[str, str]:
    """Estado según la humedad real del suelo."""
    # Sin umbral configurado usamos uno conservador para tierra de maceta
    umbral = optimal_min if optimal_min else 30.0
    if soil_moisture >= umbral:
        return HEALTHY
    if soil_moisture >= umbral * 0.6:
        return WARNING
    return CRITICAL


def health_from_days(days_since_water: Optional[float], interval: int) -> Tuple[str, str]:
    """Estado estimado por los días sin agua."""
    if days_since_water is None:
        return HEALTHY
    if days_since_water <= interval:
        return HEALTHY
    if days_since_water <= interval * 2:
        return WARNING
    return CRITICAL


def compute_health(
    plant_type: Optional[str],
    last_watered: Optional[datetime],
    created_at: Optional[datetime] = None,
    soil_moisture: Optional[float] = None,
    optimal_humidity_min: Optional[float] = None,
    now: Optional[datetime] = None,
) -> Tuple[str, str]:
    """
    Devuelve (health_status, character_mood).

    Si nunca se ha regado, el reloj corre desde que se creó la planta: recién
    adoptada no debería aparecer marchita.
    """
    if soil_moisture is not None:
        return health_from_moisture(soil_moisture, optimal_humidity_min)

    reference = last_watered or created_at
    if reference is None:
        return HEALTHY

    ahora = now or datetime.now()
    try:
        days = (ahora - reference).total_seconds() / 86400.0
    except TypeError:
        # Fechas con y sin zona horaria no se restan entre sí
        return HEALTHY

    return health_from_days(days, interval_for(plant_type))
