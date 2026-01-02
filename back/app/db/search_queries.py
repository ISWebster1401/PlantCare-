"""
Consultas avanzadas de búsqueda con filtros y agregaciones
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging
from pgdbtoolkit import AsyncPgDbToolkit

logger = logging.getLogger(__name__)

async def advanced_user_search(
    db: AsyncPgDbToolkit,
    search_term: str,
    region: Optional[str] = None,
    role_id: Optional[int] = None,
    active: Optional[bool] = None,
    page: int = 1,
    limit: int = 20
) -> Dict[str, Any]:
    """
    Búsqueda avanzada de usuarios con filtros y agregaciones
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        search_term: Término de búsqueda
        region: Filtro por región
        role_id: Filtro por rol
        active: Filtro por estado activo
        page: Número de página
        limit: Elementos por página
        
    Returns:
        Dict: Resultados con totales y agregaciones
    """
    try:
        offset = (page - 1) * limit
        
        # Query principal con búsqueda
        base_query = """
            SELECT u.*,
                   CASE 
                       WHEN u.role_id = 2 THEN 'admin'
                       ELSE 'user'
                   END as role_name,
                   COALESCE(device_counts.device_count, 0) as device_count
            FROM users u
            LEFT JOIN (
                SELECT user_id, COUNT(*) as device_count
                FROM sensors 
                WHERE status = 'active'
                GROUP BY user_id
            ) device_counts ON u.id = device_counts.user_id
        """
        
        conditions = []
        params = []
        
        # Condiciones de búsqueda
        if search_term:
            conditions.append("""
                (u.first_name ILIKE %s OR u.last_name ILIKE %s 
                 OR u.email ILIKE %s OR u.vineyard_name ILIKE %s)
            """)
            search_pattern = f"%{search_term}%"
            params.extend([search_pattern] * 4)
        
        if region:
            conditions.append("u.region ILIKE %s")
            params.append(f"%{region}%")
        
        if role_id is not None:
            conditions.append("u.role_id = %s")
            params.append(role_id)
        
        if active is not None:
            conditions.append("u.active = %s")
            params.append(active)
        
        # Agregar WHERE si hay condiciones
        if conditions:
            base_query += " WHERE " + " AND ".join(conditions)
        
        # Query para contar totales
        count_query = """
            SELECT COUNT(*) as total
            FROM users u
        """
        if conditions:
            count_query += " WHERE " + " AND ".join(conditions)
        
        # Agregar límites
        base_query += f" ORDER BY u.created_at DESC LIMIT {limit} OFFSET {offset}"
        
        # Ejecutar consultas
        results = await db.execute_query(base_query, params)
        total_result = await db.execute_query(count_query, params)
        
        total = 0
        if total_result is not None and not total_result.empty:
            total = int(total_result.iloc[0]["total"])
        
        # Query de agregaciones
        agg_query = """
            SELECT 
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE active = true) as active_users,
                COUNT(*) FILTER (WHERE role_id = 2) as admin_users,
                COUNT(*) FILTER (WHERE region IS NOT NULL) as users_with_region
            FROM users u
        """
        if conditions:
            agg_query += " WHERE " + " AND ".join(conditions)
        
        agg_result = await db.execute_query(agg_query, params)
        
        return {
            "results": results.to_dict('records') if results is not None and not results.empty else [],
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
            "aggregations": agg_result.iloc[0].to_dict() if agg_result is not None and not agg_result.empty else {}
        }
        
    except Exception as e:
        logger.error(f"Error en búsqueda avanzada de usuarios: {str(e)}")
        return {
            "results": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "total_pages": 0,
            "aggregations": {}
        }

async def advanced_device_search(
    db: AsyncPgDbToolkit,
    search_term: str,
    device_type: Optional[str] = None,
    connected: Optional[bool] = None,
    active: Optional[bool] = None,
    user_id: Optional[int] = None,
    page: int = 1,
    limit: int = 20
) -> Dict[str, Any]:
    """
    Búsqueda avanzada de dispositivos con filtros y agregaciones
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        search_term: Término de búsqueda
        device_type: Filtro por tipo
        connected: Filtro por conexión
        active: Filtro por estado activo
        user_id: Filtro por usuario
        page: Número de página
        limit: Elementos por página
        
    Returns:
        Dict: Resultados con totales y agregaciones
    """
    try:
        offset = (page - 1) * limit
        
        # Query principal con búsqueda (usando tabla sensors v2)
        base_query = """
            SELECT d.id::text as id,
                   d.device_id as device_code,
                   d.name,
                   d.device_type,
                   NULL as location,
                   NULL as plant_type,
                   d.user_id,
                   d.plant_id,
                   u.first_name || ' ' || u.last_name as user_name,
                   u.email as user_email,
                   d.created_at,
                   d.last_connection as last_seen,
                   d.last_connection as connected_at,
                   (d.status = 'active') as active,
                   (d.last_connection > NOW() - INTERVAL '1 hour') as connected
            FROM sensors d
            LEFT JOIN users u ON d.user_id = u.id
        """
        
        conditions = []
        params = []
        
        # Condiciones de búsqueda
        if search_term:
            conditions.append("""
                (d.device_id ILIKE %s OR d.name ILIKE %s 
                 OR u.email ILIKE %s OR u.first_name ILIKE %s OR u.last_name ILIKE %s)
            """)
            search_pattern = f"%{search_term}%"
            params.extend([search_pattern] * 5)
        
        if device_type:
            conditions.append("d.device_type = %s")
            params.append(device_type)
        
        if connected is not None:
            # connected se determina por last_connection reciente
            if connected:
                conditions.append("d.last_connection > NOW() - INTERVAL '1 hour'")
            else:
                conditions.append("(d.last_connection IS NULL OR d.last_connection <= NOW() - INTERVAL '1 hour')")
        
        if active is not None:
            if active:
                conditions.append("d.status = 'active'")
            else:
                conditions.append("d.status != 'active'")
        
        if user_id:
            conditions.append("d.user_id = %s")
            params.append(user_id)
        
        # Agregar WHERE si hay condiciones
        if conditions:
            base_query += " WHERE " + " AND ".join(conditions)
        
        # Query para contar totales
        count_query = """
            SELECT COUNT(*) as total
            FROM sensors d
            LEFT JOIN users u ON d.user_id = u.id
        """
        if conditions:
            count_query += " WHERE " + " AND ".join(conditions)
        
        # Agregar límites
        base_query += f" ORDER BY d.created_at DESC LIMIT {limit} OFFSET {offset}"
        
        # Ejecutar consultas
        results = await db.execute_query(base_query, params)
        total_result = await db.execute_query(count_query, params)
        
        total = 0
        if total_result is not None and not total_result.empty:
            total = int(total_result.iloc[0]["total"])
        
        # Query de agregaciones
        agg_query = """
            SELECT 
                COUNT(*) as total_devices,
                COUNT(*) FILTER (WHERE last_connection > NOW() - INTERVAL '1 hour') as connected_devices,
                COUNT(*) FILTER (WHERE status = 'active') as active_devices,
                COUNT(*) FILTER (WHERE device_type = 'humidity_sensor') as humidity_sensors,
                AVG(CASE WHEN last_connection > NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as recent_activity_rate
            FROM sensors d
        """
        if conditions:
            agg_query += " LEFT JOIN users u ON d.user_id = u.id"
            agg_query += " WHERE " + " AND ".join(conditions)
        
        agg_result = await db.execute_query(agg_query, params if conditions else [])
        
        return {
            "results": results.to_dict('records') if results is not None and not results.empty else [],
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
            "aggregations": agg_result.iloc[0].to_dict() if agg_result is not None and not agg_result.empty else {}
        }
        
    except Exception as e:
        logger.error(f"Error en búsqueda avanzada de dispositivos: {str(e)}")
        return {
            "results": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "total_pages": 0,
            "aggregations": {}
        }

async def get_sensor_data_with_aggregations(
    db: AsyncPgDbToolkit,
    device_id: int,
    days: int = 7
) -> Dict[str, Any]:
    """
    Obtiene datos de sensores con agregaciones (AVG, MAX, MIN, COUNT)
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        device_id: ID del dispositivo
        days: Número de días hacia atrás
        
    Returns:
        Dict: Datos agregados
    """
    try:
        query = """
            SELECT 
                COUNT(*) as total_readings,
                AVG(valor) as avg_humidity,
                MAX(valor) as max_humidity,
                MIN(valor) as min_humidity,
                AVG(temperatura) as avg_temperature,
                AVG(luz) as avg_light,
                AVG(battery_level) as avg_battery,
                MAX(fecha) as last_reading,
                MIN(fecha) as first_reading
            FROM sensor_humedad_suelo
            WHERE device_id = %s
            AND fecha >= NOW() - INTERVAL '%s days'
        """
        
        result = await db.execute_query(query, (device_id, days))
        
        if result is not None and not result.empty:
            return result.iloc[0].to_dict()
        
        return {}
        
    except Exception as e:
        logger.error(f"Error obteniendo datos agregados de sensores: {str(e)}")
        return {}

async def get_sensor_stats_by_device(
    db: AsyncPgDbToolkit,
    user_id: int
) -> List[Dict[str, Any]]:
    """
    Obtiene estadísticas de sensores por dispositivo usando GROUP BY
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario
        
    Returns:
        List[Dict]: Estadísticas por dispositivo
    """
    try:
        query = """
            SELECT 
                d.id::text as device_id,
                d.device_id as device_code,
                d.name,
                COUNT(sr.id) as reading_count,
                AVG(sr.soil_moisture) as avg_humidity,
                MAX(sr.soil_moisture) as max_humidity,
                MIN(sr.soil_moisture) as min_humidity,
                MAX(sr.timestamp) as last_reading_date
            FROM sensors d
            LEFT JOIN sensor_readings sr ON d.id = sr.sensor_id
            WHERE d.user_id = %s AND d.status = 'active'
            GROUP BY d.id, d.device_id, d.name
            ORDER BY last_reading_date DESC NULLS LAST
        """
        
        result = await db.execute_query(query, (user_id,))
        
        if result is not None and not result.empty:
            return result.to_dict('records')
        
        return []
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas por dispositivo: {str(e)}")
        return []

