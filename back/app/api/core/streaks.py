"""
Rachas de cuidado (Fase 1 de gamificación).

Cuenta días de calendario consecutivos en los que el usuario cuidó alguna
planta. La racha sigue viva mientras el último cuidado haya sido hoy o ayer;
si pasa un día completo sin cuidar, vuelve a 0.

La racha se calcula al leerla (no hay trabajo programado que la resetee), así
que un usuario que abandona la app simplemente ve su racha en 0 la próxima vez.
"""
import logging
from datetime import date, timedelta
from typing import Dict, Optional

from pgdbtoolkit import AsyncPgDbToolkit

logger = logging.getLogger(__name__)


def _as_date(value) -> Optional[date]:
    """Normaliza a `date` lo que devuelva el driver (date, datetime, str o NaT)."""
    if value is None:
        return None
    if isinstance(value, date) and not hasattr(value, "hour"):
        return value
    # datetime / pandas.Timestamp
    if hasattr(value, "date"):
        try:
            return value.date()
        except Exception:
            return None
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


def _live_streak(current_streak: int, last_care: Optional[date], today: date) -> int:
    """La racha solo cuenta si el último cuidado fue hoy o ayer."""
    if not last_care:
        return 0
    if last_care >= today - timedelta(days=1):
        return current_streak
    return 0


async def register_care_activity(db: AsyncPgDbToolkit, user_id: int) -> Dict:
    """
    Registra que el usuario cuidó una planta hoy y actualiza su racha.

    Idempotente por día: cuidar varias plantas el mismo día suma un solo día
    de racha. Devuelve el estado de la racha después de registrar.
    """
    today = date.today()

    df = await db.execute_query(
        "SELECT current_streak, best_streak, last_care_date, total_care_days "
        "FROM user_streaks WHERE user_id = %s",
        (user_id,),
    )

    if df is None or df.empty:
        # Primer cuidado del usuario
        await db.execute_query(
            "INSERT INTO user_streaks (user_id, current_streak, best_streak, "
            "last_care_date, total_care_days, updated_at) "
            "VALUES (%s, 1, 1, %s, 1, NOW()) "
            "ON CONFLICT (user_id) DO NOTHING",
            (user_id, today),
        )
        logger.info(f"🔥 Racha iniciada para usuario {user_id}")
        return {"current_streak": 1, "best_streak": 1, "last_care_date": today,
                "total_care_days": 1, "cared_today": True, "is_new_record": True}

    row = df.iloc[0].to_dict()
    last_care = _as_date(row.get("last_care_date"))
    best = int(row.get("best_streak") or 0)
    total = int(row.get("total_care_days") or 0)
    stored = int(row.get("current_streak") or 0)

    if last_care == today:
        # Ya se contó hoy: no se toca la racha
        current = _live_streak(stored, last_care, today)
        return {"current_streak": current, "best_streak": best,
                "last_care_date": last_care, "total_care_days": total,
                "cared_today": True, "is_new_record": False}

    if last_care == today - timedelta(days=1):
        current = stored + 1          # día consecutivo
    else:
        current = 1                   # racha rota (o primera vez tras una pausa)

    is_new_record = current > best
    best = max(best, current)
    total += 1

    await db.execute_query(
        "UPDATE user_streaks SET current_streak = %s, best_streak = %s, "
        "last_care_date = %s, total_care_days = %s, updated_at = NOW() "
        "WHERE user_id = %s",
        (current, best, today, total, user_id),
    )

    logger.info(f"🔥 Racha usuario {user_id}: {current} días (récord {best})")
    return {"current_streak": current, "best_streak": best, "last_care_date": today,
            "total_care_days": total, "cared_today": True, "is_new_record": is_new_record}


async def get_streak(db: AsyncPgDbToolkit, user_id: int) -> Dict:
    """Devuelve el estado de la racha del usuario, ya evaluada contra hoy."""
    today = date.today()

    df = await db.execute_query(
        "SELECT current_streak, best_streak, last_care_date, total_care_days "
        "FROM user_streaks WHERE user_id = %s",
        (user_id,),
    )

    if df is None or df.empty:
        return {"current_streak": 0, "best_streak": 0, "last_care_date": None,
                "total_care_days": 0, "cared_today": False, "at_risk": False}

    row = df.iloc[0].to_dict()
    last_care = _as_date(row.get("last_care_date"))
    current = _live_streak(int(row.get("current_streak") or 0), last_care, today)

    return {
        "current_streak": current,
        "best_streak": int(row.get("best_streak") or 0),
        "last_care_date": last_care,
        "total_care_days": int(row.get("total_care_days") or 0),
        "cared_today": last_care == today,
        # Cuidó ayer pero aún no hoy: la racha se pierde si no cuida antes de medianoche
        "at_risk": current > 0 and last_care != today,
    }
