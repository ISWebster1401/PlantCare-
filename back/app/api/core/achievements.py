"""
Logros (Fase 1 de gamificación).

Las tablas `achievements` y `user_achievements` ya existían con los criterios
definidos; acá va la lógica que mide el progreso del usuario y desbloquea los
que correspondan.

El progreso se calcula al consultarlo (no hay proceso programado), así que un
logro se desbloquea la primera vez que el usuario abre la pantalla después de
cumplirlo. La constraint única (user_id, achievement_id) hace que desbloquear
sea idempotente.
"""
import logging
from typing import Dict, List, Optional

import pandas as pd
from pgdbtoolkit import AsyncPgDbToolkit

logger = logging.getLogger(__name__)


def _has_earned_at(value) -> bool:
    """
    True si el LEFT JOIN trajo una fecha real de desbloqueo.

    Ojo: pandas representa los nulos de una columna de fechas como NaT, y
    `NaT is not None` es True. Sin este chequeo, en cuanto un usuario
    desbloquea su primer logro el resto parece ya conseguido y deja de
    desbloquearse ninguno más.
    """
    if value is None:
        return False
    try:
        if pd.isna(value):
            return False
    except (TypeError, ValueError):
        pass
    return str(value) not in ("", "NaT", "None")

# Criterios que aún no podemos medir de forma confiable: requieren histórico
# de lecturas de sensores a lo largo del tiempo. Se muestran como bloqueados
# con progreso desconocido en vez de inventar un número.
UNSUPPORTED_REQUIREMENTS = {"optimal_humidity_streak"}


async def _scalar(db: AsyncPgDbToolkit, query: str, params: tuple) -> int:
    """Ejecuta una consulta que devuelve un único número; 0 si no hay dato."""
    df = await db.execute_query(query, params)
    if df is None or df.empty:
        return 0
    value = df.iloc[0].iloc[0]
    try:
        return int(value) if value is not None else 0
    except (TypeError, ValueError):
        return 0


async def compute_progress(db: AsyncPgDbToolkit, user_id: int) -> Dict[str, int]:
    """Progreso actual del usuario por cada tipo de criterio."""
    return {
        # Cuántas plantas tiene registradas
        "plants_count": await _scalar(
            db, "SELECT COUNT(*) FROM plants WHERE user_id = %s", (user_id,)
        ),
        # Mejor racha de cuidado alcanzada (una vez logrado, no se pierde)
        "water_streak": await _scalar(
            db, "SELECT COALESCE(best_streak, 0) FROM user_streaks WHERE user_id = %s",
            (user_id,),
        ),
        # Especies distintas registradas
        "plants_identified": await _scalar(
            db, "SELECT COUNT(DISTINCT plant_type) FROM plants "
                "WHERE user_id = %s AND plant_type IS NOT NULL", (user_id,)
        ),
        # Plantas sanas al mismo tiempo
        "healthy_plants_simultaneous": await _scalar(
            db, "SELECT COUNT(*) FROM plants "
                "WHERE user_id = %s AND health_status = 'healthy'", (user_id,)
        ),
        # Días que lleva viva la planta sana más antigua
        "days_alive": await _scalar(
            db, "SELECT COALESCE(MAX(EXTRACT(DAY FROM (NOW() - created_at))), 0) "
                "FROM plants WHERE user_id = %s AND health_status = 'healthy'",
            (user_id,),
        ),
        # Riegos registrados (manuales o con sensor)
        "waterings_count": await _scalar(
            db, "SELECT COUNT(*) FROM watering_sessions WHERE user_id = %s", (user_id,)
        ),
        # Sensores IoT vinculados a una planta
        "sensors_count": await _scalar(
            db, "SELECT COUNT(*) FROM sensors WHERE user_id = %s AND plant_id IS NOT NULL",
            (user_id,),
        ),
    }


async def evaluate_achievements(db: AsyncPgDbToolkit, user_id: int) -> List[Dict]:
    """
    Revisa todos los logros y desbloquea los que el usuario ya cumplió.

    Returns:
        Los logros recién desbloqueados en esta llamada (para celebrarlos en
        la app). Si no hay ninguno nuevo, lista vacía.
    """
    progress = await compute_progress(db, user_id)

    achievements_df = await db.execute_query(
        "SELECT a.id, a.name, a.description, a.points, a.requirement_type, "
        "       a.requirement_value, ua.earned_at "
        "FROM achievements a "
        "LEFT JOIN user_achievements ua "
        "       ON ua.achievement_id = a.id AND ua.user_id = %s "
        "ORDER BY a.points ASC, a.id ASC",
        (user_id,),
    )

    if achievements_df is None or achievements_df.empty:
        return []

    newly_unlocked: List[Dict] = []

    for _, row in achievements_df.iterrows():
        data = row.to_dict()
        already_earned = _has_earned_at(data.get("earned_at"))
        req_type = data.get("requirement_type")
        req_value = int(data.get("requirement_value") or 0)

        if already_earned or req_type in UNSUPPORTED_REQUIREMENTS:
            continue

        current = progress.get(req_type)
        if current is None or current < req_value:
            continue

        await db.execute_query(
            "INSERT INTO user_achievements (user_id, achievement_id) "
            "VALUES (%s, %s) ON CONFLICT (user_id, achievement_id) DO NOTHING",
            (user_id, int(data["id"])),
        )
        newly_unlocked.append({
            "id": int(data["id"]),
            "name": data.get("name"),
            "description": data.get("description"),
            "points": int(data.get("points") or 0),
        })
        logger.info(f"🏅 Usuario {user_id} desbloqueó '{data.get('name')}'")

    return newly_unlocked


async def list_achievements(db: AsyncPgDbToolkit, user_id: int) -> Dict:
    """
    Todos los logros con su estado y progreso para el usuario.
    Evalúa primero, así lo que se muestra siempre está al día.
    """
    await evaluate_achievements(db, user_id)
    progress = await compute_progress(db, user_id)

    df = await db.execute_query(
        "SELECT a.id, a.name, a.description, a.icon_url, a.points, "
        "       a.requirement_type, a.requirement_value, ua.earned_at "
        "FROM achievements a "
        "LEFT JOIN user_achievements ua "
        "       ON ua.achievement_id = a.id AND ua.user_id = %s "
        "ORDER BY (ua.earned_at IS NULL), a.points ASC, a.id ASC",
        (user_id,),
    )

    items: List[Dict] = []
    total_points = 0
    earned_count = 0

    if df is not None and not df.empty:
        for _, row in df.iterrows():
            data = row.to_dict()
            req_type = data.get("requirement_type")
            req_value = int(data.get("requirement_value") or 0)
            earned_at = data.get("earned_at")
            earned = _has_earned_at(earned_at)

            measurable = req_type not in UNSUPPORTED_REQUIREMENTS
            current = progress.get(req_type, 0) if measurable else 0

            if earned:
                earned_count += 1
                total_points += int(data.get("points") or 0)

            items.append({
                "id": int(data["id"]),
                "name": data.get("name"),
                "description": data.get("description"),
                "points": int(data.get("points") or 0),
                "requirement_value": req_value,
                # Se muestra tope en el requisito: "3/1" queda raro en la UI
                "progress": min(current, req_value) if measurable else 0,
                "measurable": measurable,
                "earned": earned,
                "earned_at": str(earned_at) if earned else None,
            })

    return {
        "total_points": total_points,
        "earned_count": earned_count,
        "total_count": len(items),
        "achievements": items,
    }
