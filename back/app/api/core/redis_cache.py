"""
Módulo de cache Redis para PlantCare.
Implementa patrón Cache Aside para mejorar performance de consultas frecuentes.
"""
import json
import logging
import os
from typing import Any, Optional, Dict
from redis.asyncio import Redis as AsyncRedis
from redis.asyncio import from_url
from .config import settings

logger = logging.getLogger(__name__)

# Cliente Redis global
_redis_client: Optional[AsyncRedis] = None


def init_redis() -> Optional[AsyncRedis]:
    """Inicializa el cliente Redis."""
    global _redis_client
    
    if _redis_client is not None:
        return _redis_client
    
    if not settings.REDIS_URL:
        logger.warning("⚠️ REDIS_URL no está configurado. El cache no estará disponible.")
        return None
    
    try:
        # Construir URL de Redis con contraseña si está configurada
        redis_url = settings.REDIS_URL
        
        # Si la URL no tiene contraseña pero REDIS_PASSWORD está configurado, agregarla
        redis_password = os.getenv("REDIS_PASSWORD", "").strip()
        if redis_password and "@" not in redis_url:
            # Insertar contraseña en la URL: redis://host:port -> redis://:password@host:port
            if redis_url.startswith("redis://"):
                # Extraer host:port/db
                url_part = redis_url.replace("redis://", "")
                if "/" in url_part:
                    host_port, db_part = url_part.split("/", 1)
                    redis_url = f"redis://:{redis_password}@{host_port}/{db_part}"
                else:
                    redis_url = f"redis://:{redis_password}@{url_part}"
                logger.debug("Redis URL actualizada con contraseña")
        
        _redis_client = from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=10
        )
        logger.info("✅ Cliente Redis inicializado correctamente")
        return _redis_client
    except Exception as e:
        logger.error(f"❌ Error inicializando Redis: {str(e)}")
        return None


class RedisCache:
    """Clase wrapper para operaciones de cache con Redis."""
    
    def __init__(self, redis_client: Optional[AsyncRedis] = None):
        """Inicializa RedisCache con cliente Redis.
        
        Args:
            redis_client: Cliente Redis async. Si es None, usa el cliente global.
        """
        self.redis = redis_client or _redis_client
        
        if self.redis is None:
            logger.warning("RedisCache: Cliente Redis no disponible. Operaciones de cache fallarán silenciosamente.")
    
    async def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Obtiene un valor del cache.
        
        Args:
            key: Clave del cache
            
        Returns:
            Dict con los datos o None si no existe
        """
        if not self.redis:
            return None
        
        try:
            data = await self.redis.get(key)
            if data:
                return json.loads(data)
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Error deserializando JSON del cache (key: {key}): {str(e)}")
            # Si el JSON está corrupto, eliminar la key
            await self.delete(key)
            return None
        except Exception as e:
            logger.error(f"Error obteniendo del cache (key: {key}): {str(e)}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 900) -> bool:
        """Guarda un valor en el cache con TTL.
        
        Args:
            key: Clave del cache
            value: Valor a guardar (será serializado a JSON)
            ttl: Time to live en segundos (default: 900 = 15 minutos)
            
        Returns:
            True si se guardó exitosamente, False en caso contrario
        """
        if not self.redis:
            return False
        
        try:
            json_value = json.dumps(value, default=str)  # default=str para manejar datetime y otros tipos
            await self.redis.setex(key, ttl, json_value)
            return True
        except (TypeError, ValueError) as e:
            logger.error(f"Error serializando valor para cache (key: {key}): {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Error guardando en cache (key: {key}): {str(e)}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Elimina una key del cache.
        
        Args:
            key: Clave a eliminar
            
        Returns:
            True si se eliminó, False en caso contrario
        """
        if not self.redis:
            return False
        
        try:
            result = await self.redis.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Error eliminando del cache (key: {key}): {str(e)}")
            return False
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalida múltiples keys que coinciden con un patrón.
        
        Args:
            pattern: Patrón de keys a eliminar (ej: "sensor:123:*")
            
        Returns:
            Número de keys eliminadas
        """
        if not self.redis:
            return 0
        
        try:
            keys = []
            async for key in self.redis.scan_iter(match=pattern):
                keys.append(key)
            
            if keys:
                deleted = await self.redis.delete(*keys)
                logger.info(f"Invalidadas {deleted} keys con patrón: {pattern}")
                return deleted
            return 0
        except Exception as e:
            logger.error(f"Error invalidando patrón (pattern: {pattern}): {str(e)}")
            return 0
    
    async def exists(self, key: str) -> bool:
        """Verifica si una key existe en el cache.
        
        Args:
            key: Clave a verificar
            
        Returns:
            True si existe, False en caso contrario
        """
        if not self.redis:
            return False
        
        try:
            result = await self.redis.exists(key)
            return result > 0
        except Exception as e:
            logger.error(f"Error verificando existencia de key (key: {key}): {str(e)}")
            return False
    
    async def get_ttl(self, key: str) -> int:
        """Obtiene el TTL restante de una key en segundos.
        
        Args:
            key: Clave a verificar
            
        Returns:
            TTL en segundos, -1 si no tiene expiración, -2 si no existe
        """
        if not self.redis:
            return -2
        
        try:
            return await self.redis.ttl(key)
        except Exception as e:
            logger.error(f"Error obteniendo TTL (key: {key}): {str(e)}")
            return -2


def get_redis_cache() -> RedisCache:
    """Obtiene instancia de RedisCache usando el cliente global."""
    if _redis_client is None:
        init_redis()
    return RedisCache(_redis_client)
