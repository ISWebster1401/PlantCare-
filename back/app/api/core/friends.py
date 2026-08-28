"""
Amistades y ranking de rachas (fase social).

Una amistad se guarda como UNA fila con quien invita y quien recibe, así que
toda consulta de "mis amigos" tiene que mirar las dos direcciones. Es el detalle
que hace que estas queries se vean más largas de lo esperado.
"""
import logging
from typing import Dict, List, Optional

from pgdbtoolkit import AsyncPgDbToolkit

logger = logging.getLogger(__name__)

PENDING = "pending"
ACCEPTED = "accepted"

# La racha guardada solo vale si el último cuidado fue hoy o ayer. Es la misma
# regla que aplica core/streaks.py al leer; si una cambia, la otra también.
LIVE_STREAK_SQL = (
    "CASE WHEN s.last_care_date >= CURRENT_DATE - INTERVAL '1 day' "
    "THEN COALESCE(s.current_streak, 0) ELSE 0 END"
)


def _row_to_friend(d: Dict) -> Dict:
    """Normaliza una fila de amigo, cuidando los NaN que trae pandas."""
    def _int(v, default=0):
        try:
            if v is None or str(v) in ("nan", "NaT", "None"):
                return default
            return int(v)
        except (TypeError, ValueError):
            return default

    def _str(v):
        if v is None or str(v) in ("nan", "NaT", "None"):
            return None
        return str(v)

    return {
        "friendship_id": _int(d.get("friendship_id")),
        "user_id": _int(d.get("user_id")),
        "full_name": _str(d.get("full_name")) or "Jardinero",
        "email": _str(d.get("email")),
        "current_streak": _int(d.get("current_streak")),
        "best_streak": _int(d.get("best_streak")),
        "plants_count": _int(d.get("plants_count")),
    }


async def find_user_by_email(db: AsyncPgDbToolkit, email: str) -> Optional[Dict]:
    df = await db.execute_query(
        "SELECT id, full_name, email FROM users WHERE LOWER(email) = LOWER(%s)",
        (email.strip(),),
    )
    if df is None or df.empty:
        return None
    return df.iloc[0].to_dict()


async def get_friendship(db: AsyncPgDbToolkit, a: int, b: int) -> Optional[Dict]:
    """Amistad entre dos usuarios, en cualquiera de las dos direcciones."""
    df = await db.execute_query(
        "SELECT id, requester_id, addressee_id, status FROM friendships "
        "WHERE (requester_id = %s AND addressee_id = %s) "
        "   OR (requester_id = %s AND addressee_id = %s)",
        (a, b, b, a),
    )
    if df is None or df.empty:
        return None
    return df.iloc[0].to_dict()


async def list_friends(db: AsyncPgDbToolkit, user_id: int) -> List[Dict]:
    """Amigos aceptados, con su racha viva y cuántas plantas tienen."""
    df = await db.execute_query(
        f"""
        SELECT f.id AS friendship_id,
               u.id AS user_id, u.full_name, u.email,
               {LIVE_STREAK_SQL} AS current_streak,
               COALESCE(s.best_streak, 0) AS best_streak,
               (SELECT COUNT(*) FROM plants p WHERE p.user_id = u.id) AS plants_count
        FROM friendships f
        JOIN users u
          ON u.id = CASE WHEN f.requester_id = %s THEN f.addressee_id
                         ELSE f.requester_id END
        LEFT JOIN user_streaks s ON s.user_id = u.id
        WHERE f.status = %s
          AND (f.requester_id = %s OR f.addressee_id = %s)
        ORDER BY current_streak DESC, u.full_name ASC
        """,
        (user_id, ACCEPTED, user_id, user_id),
    )
    if df is None or df.empty:
        return []
    return [_row_to_friend(r.to_dict()) for _, r in df.iterrows()]


async def list_pending_requests(db: AsyncPgDbToolkit, user_id: int) -> List[Dict]:
    """Invitaciones que le llegaron al usuario y aún no responde."""
    df = await db.execute_query(
        f"""
        SELECT f.id AS friendship_id,
               u.id AS user_id, u.full_name, u.email,
               {LIVE_STREAK_SQL} AS current_streak,
               COALESCE(s.best_streak, 0) AS best_streak,
               (SELECT COUNT(*) FROM plants p WHERE p.user_id = u.id) AS plants_count
        FROM friendships f
        JOIN users u ON u.id = f.requester_id
        LEFT JOIN user_streaks s ON s.user_id = u.id
        WHERE f.addressee_id = %s AND f.status = %s
        ORDER BY f.created_at DESC
        """,
        (user_id, PENDING),
    )
    if df is None or df.empty:
        return []
    return [_row_to_friend(r.to_dict()) for _, r in df.iterrows()]


async def list_sent_requests(db: AsyncPgDbToolkit, user_id: int) -> List[Dict]:
    """Invitaciones que el usuario envió y siguen sin respuesta."""
    df = await db.execute_query(
        f"""
        SELECT f.id AS friendship_id,
               u.id AS user_id, u.full_name, u.email,
               {LIVE_STREAK_SQL} AS current_streak,
               COALESCE(s.best_streak, 0) AS best_streak,
               0 AS plants_count
        FROM friendships f
        JOIN users u ON u.id = f.addressee_id
        LEFT JOIN user_streaks s ON s.user_id = u.id
        WHERE f.requester_id = %s AND f.status = %s
        ORDER BY f.created_at DESC
        """,
        (user_id, PENDING),
    )
    if df is None or df.empty:
        return []
    return [_row_to_friend(r.to_dict()) for _, r in df.iterrows()]


async def get_ranking(db: AsyncPgDbToolkit, user_id: int) -> List[Dict]:
    """
    El usuario y sus amigos ordenados por racha viva.

    Se incluye a sí mismo a propósito: un ranking donde no apareces no dice
    nada. Cada entrada trae su posición ya calculada.
    """
    amigos = await list_friends(db, user_id)

    me_df = await db.execute_query(
        f"""
        SELECT u.id AS user_id, u.full_name, u.email,
               {LIVE_STREAK_SQL} AS current_streak,
               COALESCE(s.best_streak, 0) AS best_streak,
               (SELECT COUNT(*) FROM plants p WHERE p.user_id = u.id) AS plants_count
        FROM users u
        LEFT JOIN user_streaks s ON s.user_id = u.id
        WHERE u.id = %s
        """,
        (user_id,),
    )

    filas = list(amigos)
    if me_df is not None and not me_df.empty:
        yo = _row_to_friend(me_df.iloc[0].to_dict())
        yo["friendship_id"] = 0
        filas.append(yo)

    filas.sort(key=lambda f: (-f["current_streak"], -f["best_streak"], f["full_name"]))
    for i, f in enumerate(filas, start=1):
        f["position"] = i
        f["is_me"] = f["user_id"] == user_id
    return filas
