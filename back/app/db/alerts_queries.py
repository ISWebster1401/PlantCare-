"""
Consultas específicas para alertas con soporte de soft delete
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging
from pgdbtoolkit import AsyncPgDbToolkit

logger = logging.getLogger(__name__)

async def get_user_alerts(
    db: AsyncPgDbToolkit,
    user_id: int,
    active_only: bool = True,
    include_read: bool = True
) -> List[Dict[str, Any]]:
    """
    Obtiene alertas de un usuario con soporte de soft delete
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario
        active_only: Solo alertas activas (no resueltas)
        include_read: Incluir alertas leídas
        
    Returns:
        List[Dict]: Lista de alertas
    """
    try:
        base_query = """
            SELECT * FROM alerts 
            WHERE user_id = %s AND deleted_at IS NULL
        """
        params = [user_id]
        
        conditions = []
        
        if active_only:
            conditions.append("active = true")
        
        if not include_read:
            conditions.append("read_at IS NULL")
        
        if conditions:
            base_query += " AND " + " AND ".join(conditions)
        
        base_query += " ORDER BY created_at DESC"
        
        result = await db.execute_query(base_query, params)
        
        if result is not None and not result.empty:
            return result.to_dict('records')
        return []
        
    except Exception as e:
        logger.error(f"Error obteniendo alertas del usuario: {str(e)}")
        return []

async def soft_delete_alert(
    db: AsyncPgDbToolkit,
    alert_id: int,
    user_id: int
) -> bool:
    """
    Realiza soft delete de una alerta (marca deleted_at)
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        alert_id: ID de la alerta
        user_id: ID del usuario (para validar propiedad)
        
    Returns:
        bool: True si se marcó como eliminada
    """
    try:
        # Verificar que la alerta pertenece al usuario
        result = await db.execute_query(
            "SELECT id FROM alerts WHERE id = %s AND user_id = %s AND deleted_at IS NULL",
            (alert_id, user_id)
        )
        
        if result is None or result.empty:
            return False
        
        # Marcar como eliminada
        await db.execute_query(
            "UPDATE alerts SET deleted_at = %s WHERE id = %s",
            (datetime.utcnow(), alert_id)
        )
        
        return True
        
    except Exception as e:
        logger.error(f"Error en soft delete de alerta: {str(e)}")
        return False

async def restore_alert(
    db: AsyncPgDbToolkit,
    alert_id: int,
    user_id: int
) -> bool:
    """
    Restaura una alerta que fue eliminada con soft delete
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        alert_id: ID de la alerta
        user_id: ID del usuario
        
    Returns:
        bool: True si se restauró
    """
    try:
        await db.execute_query(
            "UPDATE alerts SET deleted_at = NULL WHERE id = %s AND user_id = %s",
            (alert_id, user_id)
        )
        return True
        
    except Exception as e:
        logger.error(f"Error restaurando alerta: {str(e)}")
        return False

async def get_alerts_with_aggregations(
    db: AsyncPgDbToolkit,
    user_id: int
) -> Dict[str, Any]:
    """
    Obtiene agregaciones de alertas (COUNT por tipo, severidad, etc.)
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario
        
    Returns:
        Dict: Estadísticas de alertas
    """
    try:
        query = """
            SELECT 
                COUNT(*) FILTER (WHERE deleted_at IS NULL) as total_active,
                COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as total_deleted,
                COUNT(*) FILTER (WHERE active = true AND deleted_at IS NULL) as unresolved,
                COUNT(*) FILTER (WHERE read_at IS NOT NULL AND deleted_at IS NULL) as read_count,
                COUNT(*) FILTER (WHERE alert_type = 'low_humidity' AND deleted_at IS NULL) as low_humidity,
                COUNT(*) FILTER (WHERE alert_type = 'high_humidity' AND deleted_at IS NULL) as high_humidity,
                COUNT(*) FILTER (WHERE alert_type = 'device_offline' AND deleted_at IS NULL) as device_offline,
                COUNT(*) FILTER (WHERE severity = 'critical' AND deleted_at IS NULL) as critical,
                MAX(created_at) FILTER (WHERE deleted_at IS NULL) as last_alert
            FROM alerts
            WHERE user_id = %s
        """
        
        result = await db.execute_query(query, (user_id,))
        
        if result is not None and not result.empty:
            return result.iloc[0].to_dict()
        
        return {
            "total_active": 0,
            "total_deleted": 0,
            "unresolved": 0,
            "read_count": 0,
            "low_humidity": 0,
            "high_humidity": 0,
            "device_offline": 0,
            "critical": 0,
            "last_alert": None
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo agregaciones de alertas: {str(e)}")
        return {}

async def search_alerts(
    db: AsyncPgDbToolkit,
    user_id: int,
    search_term: str,
    alert_type: Optional[str] = None,
    severity: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Busca alertas con filtros avanzados
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario
        search_term: Término de búsqueda
        alert_type: Filtro por tipo
        severity: Filtro por severidad
        
    Returns:
        List[Dict]: Lista de alertas encontradas
    """
    try:
        query = """
            SELECT * FROM alerts 
            WHERE user_id = %s 
            AND deleted_at IS NULL
            AND (message ILIKE %s OR alert_type ILIKE %s)
        """
        
        params = [user_id, f"%{search_term}%", f"%{search_term}%"]
        
        if alert_type:
            query += " AND alert_type = %s"
            params.append(alert_type)
        
        if severity:
            query += " AND severity = %s"
            params.append(severity)
        
        query += " ORDER BY created_at DESC LIMIT 50"
        
        result = await db.execute_query(query, params)
        
        if result is not None and not result.empty:
            return result.to_dict('records')
        return []
        
    except Exception as e:
        logger.error(f"Error buscando alertas: {str(e)}")
        return []

