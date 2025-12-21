"""
Servicio para gestionar lecturas de sensores con cache Redis.
Implementa patrón Cache Aside para optimizar consultas frecuentes.
"""
import logging
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from uuid import UUID
from pgdbtoolkit import AsyncPgDbToolkit
from ..api.core.redis_cache import RedisCache
from ..api.core.config import settings

logger = logging.getLogger(__name__)


class SensorReadingsService:
    """Servicio para operaciones de lecturas de sensores con cache."""
    
    def __init__(self, db: AsyncPgDbToolkit, cache: RedisCache):
        """Inicializa el servicio.
        
        Args:
            db: Instancia de AsyncPgDbToolkit
            cache: Instancia de RedisCache
        """
        self.db = db
        self.cache = cache
    
    async def get_latest_reading(self, sensor_id: UUID) -> Optional[Dict[str, Any]]:
        """Obtiene la última lectura de un sensor (con cache).
        
        Patrón Cache Aside:
        1. Buscar en Redis
        2. Si no existe, buscar en PostgreSQL
        3. Guardar en Redis con TTL
        
        Args:
            sensor_id: UUID del sensor
            
        Returns:
            Dict con datos de la lectura o None si no hay lecturas
        """
        cache_key = f"sensor:{str(sensor_id)}:latest"
        
        # 1. Buscar en cache
        cached = await self.cache.get(cache_key)
        if cached:
            logger.debug(f"Cache HIT para última lectura de sensor {sensor_id}")
            return cached
        
        logger.debug(f"Cache MISS para última lectura de sensor {sensor_id}")
        
        # 2. Buscar en DB
        query = """
            SELECT * FROM sensor_readings
            WHERE sensor_id = %s
            ORDER BY timestamp DESC
            LIMIT 1
        """
        result = await self.db.execute_query(query, (str(sensor_id),))
        
        if result is None or result.empty:
            return None
        
        reading = result.iloc[0].to_dict()
        
        # Convertir a dict serializable
        reading_dict = {
            "id": str(reading["id"]),
            "sensor_id": str(reading["sensor_id"]),
            "user_id": int(reading["user_id"]),
            "plant_id": int(reading["plant_id"]) if reading.get("plant_id") else None,
            "temperature": int(reading["temperature"]),
            "air_humidity": float(reading["air_humidity"]),
            "soil_moisture": float(reading["soil_moisture"]),
            "light_intensity": int(reading["light_intensity"]) if reading.get("light_intensity") else None,
            "electrical_conductivity": float(reading["electrical_conductivity"]) if reading.get("electrical_conductivity") else None,
            "timestamp": reading["timestamp"].isoformat() if hasattr(reading["timestamp"], "isoformat") else str(reading["timestamp"]),
            "created_at": reading["created_at"].isoformat() if hasattr(reading.get("created_at"), "isoformat") else str(reading.get("created_at", ""))
        }
        
        # 3. Guardar en cache (15 minutos)
        await self.cache.set(cache_key, reading_dict, ttl=settings.REDIS_CACHE_TTL_LATEST)
        
        return reading_dict
    
    async def get_daily_readings(
        self, 
        sensor_id: UUID, 
        target_date: date
    ) -> List[Dict[str, Any]]:
        """Obtiene todas las lecturas de un día específico (con cache).
        
        Args:
            sensor_id: UUID del sensor
            target_date: Fecha objetivo
            
        Returns:
            Lista de dicts con lecturas del día
        """
        cache_key = f"sensor:{str(sensor_id)}:readings:daily:{target_date.isoformat()}"
        
        # 1. Buscar en cache
        cached = await self.cache.get(cache_key)
        if cached:
            logger.debug(f"Cache HIT para lecturas diarias de sensor {sensor_id} en {target_date}")
            return cached
        
        logger.debug(f"Cache MISS para lecturas diarias de sensor {sensor_id} en {target_date}")
        
        # 2. Buscar en DB
        start_datetime = datetime.combine(target_date, datetime.min.time())
        end_datetime = datetime.combine(target_date, datetime.max.time())
        
        query = """
            SELECT * FROM sensor_readings
            WHERE sensor_id = %s 
                AND timestamp >= %s 
                AND timestamp <= %s
            ORDER BY timestamp ASC
        """
        result = await self.db.execute_query(
            query, 
            (str(sensor_id), start_datetime, end_datetime)
        )
        
        if result is None or result.empty:
            readings_list = []
        else:
            readings_list = [
                {
                    "id": str(row["id"]),
                    "temperature": int(row["temperature"]),
                    "air_humidity": float(row["air_humidity"]),
                    "soil_moisture": float(row["soil_moisture"]),
                    "light_intensity": int(row["light_intensity"]) if row.get("light_intensity") else None,
                    "electrical_conductivity": float(row["electrical_conductivity"]) if row.get("electrical_conductivity") else None,
                    "timestamp": row["timestamp"].isoformat() if hasattr(row["timestamp"], "isoformat") else str(row["timestamp"])
                }
                for _, row in result.iterrows()
            ]
        
        # 3. Guardar en cache (24 horas)
        await self.cache.set(cache_key, readings_list, ttl=settings.REDIS_CACHE_TTL_DAILY)
        
        return readings_list
    
    async def get_daily_average(
        self, 
        sensor_id: UUID, 
        target_date: date
    ) -> Optional[Dict[str, Any]]:
        """Calcula promedio diario usando Polars (con cache).
        
        Args:
            sensor_id: UUID del sensor
            target_date: Fecha objetivo
            
        Returns:
            Dict con promedios y estadísticas o None si no hay lecturas
        """
        cache_key = f"sensor:{str(sensor_id)}:avg:daily:{target_date.isoformat()}"
        
        # 1. Buscar en cache
        cached = await self.cache.get(cache_key)
        if cached:
            logger.debug(f"Cache HIT para promedio diario de sensor {sensor_id} en {target_date}")
            return cached
        
        logger.debug(f"Cache MISS para promedio diario de sensor {sensor_id} en {target_date}")
        
        # 2. Obtener lecturas del día
        readings = await self.get_daily_readings(sensor_id, target_date)
        if not readings:
            return None
        
        # 3. Calcular promedios con Polars (más rápido que pandas)
        try:
            import polars as pl
            
            df = pl.DataFrame(readings)
            avg = {
                "date": target_date.isoformat(),
                "avg_temperature": float(df["temperature"].mean()) if "temperature" in df.columns else None,
                "avg_air_humidity": float(df["air_humidity"].mean()) if "air_humidity" in df.columns else None,
                "avg_soil_moisture": float(df["soil_moisture"].mean()) if "soil_moisture" in df.columns else None,
                "min_temperature": int(df["temperature"].min()) if "temperature" in df.columns else None,
                "max_temperature": int(df["temperature"].max()) if "temperature" in df.columns else None,
                "min_air_humidity": float(df["air_humidity"].min()) if "air_humidity" in df.columns else None,
                "max_air_humidity": float(df["air_humidity"].max()) if "air_humidity" in df.columns else None,
                "min_soil_moisture": float(df["soil_moisture"].min()) if "soil_moisture" in df.columns else None,
                "max_soil_moisture": float(df["soil_moisture"].max()) if "soil_moisture" in df.columns else None,
                "reading_count": len(readings)
            }
        except ImportError:
            # Fallback: calcular manualmente si Polars no está disponible
            logger.warning("Polars no disponible, calculando promedios manualmente")
            temps = [r["temperature"] for r in readings if r.get("temperature") is not None]
            air_hums = [r["air_humidity"] for r in readings if r.get("air_humidity") is not None]
            soil_mois = [r["soil_moisture"] for r in readings if r.get("soil_moisture") is not None]
            
            avg = {
                "date": target_date.isoformat(),
                "avg_temperature": sum(temps) / len(temps) if temps else None,
                "avg_air_humidity": sum(air_hums) / len(air_hums) if air_hums else None,
                "avg_soil_moisture": sum(soil_mois) / len(soil_mois) if soil_mois else None,
                "min_temperature": min(temps) if temps else None,
                "max_temperature": max(temps) if temps else None,
                "min_air_humidity": min(air_hums) if air_hums else None,
                "max_air_humidity": max(air_hums) if air_hums else None,
                "min_soil_moisture": min(soil_mois) if soil_mois else None,
                "max_soil_moisture": max(soil_mois) if soil_mois else None,
                "reading_count": len(readings)
            }
        
        # 4. Guardar en cache (24 horas)
        await self.cache.set(cache_key, avg, ttl=settings.REDIS_CACHE_TTL_DAILY)
        
        return avg
    
    async def create_reading(
        self, 
        sensor_id: UUID,
        user_id: int,
        plant_id: Optional[int],
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Crea una nueva lectura e invalida cache relacionado.
        
        Args:
            sensor_id: UUID del sensor
            user_id: ID del usuario (desnormalizado)
            plant_id: ID de la planta (desnormalizado, opcional)
            data: Dict con datos de la lectura:
                - temperature: int
                - air_humidity: float
                - soil_moisture: float
                - light_intensity: int (opcional)
                - electrical_conductivity: float (opcional)
                
        Returns:
            Dict con la lectura creada
        """
        # 1. Crear lectura en DB
        reading_dict = {
            "sensor_id": str(sensor_id),
            "user_id": user_id,
            "plant_id": plant_id,
            "temperature": data["temperature"],
            "air_humidity": data["air_humidity"],
            "soil_moisture": data["soil_moisture"],
            "light_intensity": data.get("light_intensity"),
            "electrical_conductivity": data.get("electrical_conductivity"),
            "timestamp": datetime.utcnow()
        }
        
        # Construir INSERT dinámicamente (filtrar None)
        columns = [k for k, v in reading_dict.items() if v is not None]
        values = [reading_dict[k] for k in columns]
        placeholders = ", ".join(["%s"] * len(values))
        columns_str = ", ".join(columns)
        
        insert_query = f"""
            INSERT INTO sensor_readings ({columns_str})
            VALUES ({placeholders})
            RETURNING id, timestamp, created_at
        """
        
        result = await self.db.execute_query(insert_query, tuple(values))
        
        if result is None or result.empty:
            raise Exception("No se pudo crear la lectura")
        
        created = result.iloc[0].to_dict()
        reading_id = created["id"]
        
        # 2. Obtener lectura completa
        query = "SELECT * FROM sensor_readings WHERE id = %s"
        full_result = await self.db.execute_query(query, (str(reading_id),))
        reading = full_result.iloc[0].to_dict()
        
        # 3. Invalidar caches relacionados
        today = date.today()
        await self.cache.delete(f"sensor:{str(sensor_id)}:latest")
        await self.cache.delete(f"sensor:{str(sensor_id)}:readings:daily:{today.isoformat()}")
        await self.cache.delete(f"sensor:{str(sensor_id)}:avg:daily:{today.isoformat()}")
        
        # También invalidar promedios semanales si aplica
        week_number = today.isocalendar()[1]
        await self.cache.invalidate_pattern(f"sensor:{str(sensor_id)}:avg:weekly:*")
        
        logger.info(f"✅ Lectura creada para sensor {sensor_id}, cache invalidado")
        
        # 4. Actualizar last_connection del sensor
        await self.db.execute_query(
            "UPDATE sensors SET last_connection = %s, updated_at = %s WHERE id = %s",
            (datetime.utcnow(), datetime.utcnow(), str(sensor_id))
        )
        
        return {
            "id": str(reading["id"]),
            "sensor_id": str(reading["sensor_id"]),
            "user_id": int(reading["user_id"]),
            "plant_id": int(reading["plant_id"]) if reading.get("plant_id") else None,
            "temperature": int(reading["temperature"]),
            "air_humidity": float(reading["air_humidity"]),
            "soil_moisture": float(reading["soil_moisture"]),
            "light_intensity": int(reading["light_intensity"]) if reading.get("light_intensity") else None,
            "electrical_conductivity": float(reading["electrical_conductivity"]) if reading.get("electrical_conductivity") else None,
            "timestamp": reading["timestamp"].isoformat() if hasattr(reading["timestamp"], "isoformat") else str(reading["timestamp"]),
            "created_at": reading["created_at"].isoformat() if hasattr(reading.get("created_at"), "isoformat") else str(reading.get("created_at", ""))
        }
