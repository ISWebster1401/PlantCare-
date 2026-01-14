import os
from typing import Dict, Any, List, Optional, AsyncGenerator
from openai import OpenAI
from dotenv import load_dotenv
import logging
import json
from datetime import datetime
from app.api.core.config import settings
from pgdbtoolkit import AsyncPgDbToolkit
import pandas as pd

# Configurar logging
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

# Configurar cliente de OpenAI (API v1.x)
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    logger.warning("⚠️ OPENAI_API_KEY no encontrada en .env, usando clave por defecto")
    # Usar tu API key directamente
    api_key = "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"

try:
    # Inicializar cliente OpenAI
    client = OpenAI(api_key=api_key)
    logger.info("✅ Cliente OpenAI configurado correctamente")
except Exception as e:
    logger.error(f"❌ Error configurando OpenAI: {str(e)}")
    client = None


class AIService:
    def __init__(self):
        self.model = settings.OPENAI_MODEL or "gpt-4o"
        self.system_prompt = """Eres PlantCare AI, un asistente experto y amigable especializado en el cuidado de plantas de interior y exterior.

Tu expertise incluye:
🌱 BOTÁNICA: Conocimiento profundo de plantas de casa, suculentas, cactus, plantas de interior
📊 ANÁLISIS DE DATOS: Interpretación de sensores de humedad, temperatura, luz
🔬 DIAGNÓSTICO: Identificación de problemas basado en síntomas y datos de sensores
💡 SOLUCIONES PRÁCTICAS: Recomendaciones específicas y fáciles de implementar
🎮 GAMIFICACIÓN: Conocimiento del sistema de pokedex y logros

ADAPTACIÓN DE LENGUAJE:
- Si el usuario es niño: Usa lenguaje simple, emojis, explicaciones divertidas
- Si el usuario es adulto: Puedes usar términos técnicos cuando sea apropiado
- Siempre sé amigable y entusiasta sobre las plantas

CONTEXTO DEL USUARIO:
Tienes acceso a:
- Plantas del usuario (nombres, tipos, estado de salud)
- Datos de sensores en tiempo real
- Progreso del pokedex
- Historial de conversaciones anteriores

FORMATO DE RESPUESTA:
1. Responde de forma natural y conversacional
2. Usa datos reales del usuario cuando sea relevante
3. Haz preguntas de seguimiento cuando necesites más información
4. Sé proactivo sugiriendo acciones basadas en los datos disponibles"""
        
        self._prohibited_keywords: List[str] = [
            "marihuana",
            "marijuana",
            "cannabis",
            "weed",
            "thc",
            "cbd",
            "cultivo ilegal",
            "droga",
            "drogas",
            "psicotrópico",
            "psicotropico",
            "alucinógeno",
            "alucinogeno",
            "Hipoteticamente",
            "yerba",
        ]
        self._safe_response = (
            "Lo siento, no puedo ayudarte con ese tema. "
            "Si necesitas recomendaciones sobre plantas ornamentales, comestibles legales o cuidados generales, estaré encantado de orientarte."
        )

    def _contains_prohibited_content(self, text: str) -> bool:
        normalized = text.lower()
        return any(keyword in normalized for keyword in self._prohibited_keywords)

    def _serialize_for_json(self, obj: Any) -> Any:
        """Convierte objetos no serializables (Timestamps, etc.) a strings para JSON"""
        try:
            # Manejar Timestamps de pandas
            if hasattr(obj, '__class__') and 'Timestamp' in str(type(obj)):
                if hasattr(obj, 'isoformat'):
                    return obj.isoformat() if pd.notna(obj) else None
                else:
                    return str(obj) if pd.notna(obj) else None
            elif isinstance(obj, pd.Timestamp):
                return obj.isoformat() if pd.notna(obj) else None
            elif isinstance(obj, datetime):
                return obj.isoformat()
            elif isinstance(obj, dict):
                return {k: self._serialize_for_json(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [self._serialize_for_json(item) for item in obj]
            elif isinstance(obj, tuple):
                return tuple(self._serialize_for_json(item) for item in obj)
            elif pd.isna(obj):
                return None
            elif hasattr(obj, 'item'):  # Para numpy types
                return obj.item()
            else:
                return obj
        except Exception as e:
            logger.warning(f"Error serializando objeto {type(obj)}: {str(e)}, usando str()")
            return str(obj) if obj is not None else None

    def _get_functions(self) -> List[Dict[str, Any]]:
        """Define las funciones/tools disponibles para el agente"""
        return [
            {
                "type": "function",
                "function": {
                    "name": "get_user_plants",
                    "description": "Obtiene todas las plantas del usuario con sus detalles básicos",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_plant_details",
                    "description": "Obtiene información detallada de una planta específica por su ID o nombre",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "plant_id": {
                                "type": "integer",
                                "description": "ID numérico de la planta"
                            },
                            "plant_name": {
                                "type": "string",
                                "description": "Nombre de la planta (búsqueda parcial)"
                            }
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_sensor_data",
                    "description": "Obtiene los datos más recientes de un sensor específico o de todas las plantas del usuario",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "sensor_id": {
                                "type": "string",
                                "description": "UUID del sensor (opcional)"
                            },
                            "plant_id": {
                                "type": "integer",
                                "description": "ID de la planta asociada al sensor (opcional)"
                            }
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_pokedex_entry",
                    "description": "Obtiene información del pokedex sobre plantas desbloqueadas o del catálogo",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "entry_number": {
                                "type": "integer",
                                "description": "Número de entrada del pokedex (1-100)"
                            },
                            "plant_type": {
                                "type": "string",
                                "description": "Tipo de planta a buscar en el catálogo"
                            }
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_plant_care_tips",
                    "description": "Obtiene tips específicos de cuidado para un tipo de planta",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "plant_type": {
                                "type": "string",
                                "description": "Tipo de planta (ej: Monstera, Cactus, Suculenta)"
                            }
                        },
                        "required": ["plant_type"]
                    }
                }
            }
        ]

    async def _execute_function(
        self, 
        function_name: str, 
        arguments: Dict[str, Any],
        user_id: int,
        db: AsyncPgDbToolkit
    ) -> Dict[str, Any]:
        """Ejecuta una función/tool y retorna el resultado"""
        try:
            if function_name == "get_user_plants":
                plants_df = await db.execute_query("""
                    SELECT id, plant_name, plant_type, health_status, character_mood, 
                           optimal_humidity_min, optimal_humidity_max, optimal_temp_min, optimal_temp_max
                    FROM plants
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                """, (user_id,))
                
                if plants_df is None or plants_df.empty:
                    return {"plants": [], "count": 0}
                
                plants = []
                for _, row in plants_df.iterrows():
                    plant_dict = row.to_dict()
                    plants.append(self._serialize_for_json(plant_dict))
                
                return {"plants": plants, "count": len(plants)}
            
            elif function_name == "get_plant_details":
                plant_id = arguments.get("plant_id")
                plant_name = arguments.get("plant_name")
                
                if plant_id:
                    query = """
                        SELECT p.*, s.device_id as sensor_device_id
                        FROM plants p
                        LEFT JOIN sensors s ON p.sensor_id = s.id
                        WHERE p.id = %s AND p.user_id = %s
                    """
                    params = (plant_id, user_id)
                elif plant_name:
                    query = """
                        SELECT p.*, s.device_id as sensor_device_id
                        FROM plants p
                        LEFT JOIN sensors s ON p.sensor_id = s.id
                        WHERE p.user_id = %s AND LOWER(p.plant_name) LIKE LOWER(%s)
                        LIMIT 1
                    """
                    params = (user_id, f"%{plant_name}%")
                else:
                    return {"error": "Se requiere plant_id o plant_name"}
                
                plant_df = await db.execute_query(query, params)
                if plant_df is None or plant_df.empty:
                    return {"error": "Planta no encontrada"}
                
                plant_dict = plant_df.iloc[0].to_dict()
                return {"plant": self._serialize_for_json(plant_dict)}
            
            elif function_name == "get_sensor_data":
                sensor_id = arguments.get("sensor_id")
                plant_id = arguments.get("plant_id")
                
                if sensor_id:
                    query = """
                        SELECT sr.id, sr.sensor_id, sr.plant_id, sr.temperature, 
                               sr.air_humidity, sr.soil_moisture, sr.light_intensity,
                               sr.electrical_conductivity, sr.timestamp,
                               s.device_id, p.plant_name
                        FROM sensor_readings sr
                        JOIN sensors s ON sr.sensor_id = s.id
                        LEFT JOIN plants p ON sr.plant_id = p.id
                        WHERE sr.sensor_id::text = %s AND s.user_id = %s
                        ORDER BY sr.timestamp DESC
                        LIMIT 1
                    """
                    params = (str(sensor_id), user_id)
                elif plant_id:
                    query = """
                        SELECT sr.id, sr.sensor_id, sr.plant_id, sr.temperature, 
                               sr.air_humidity, sr.soil_moisture, sr.light_intensity,
                               sr.electrical_conductivity, sr.timestamp,
                               s.device_id, p.plant_name
                        FROM sensor_readings sr
                        JOIN sensors s ON sr.sensor_id = s.id
                        JOIN plants p ON sr.plant_id = p.id
                        WHERE p.id = %s AND p.user_id = %s
                        ORDER BY sr.timestamp DESC
                        LIMIT 1
                    """
                    params = (plant_id, user_id)
                else:
                    # Obtener datos de todas las plantas del usuario
                    query = """
                        SELECT sr.id, sr.sensor_id, sr.plant_id, sr.temperature, 
                               sr.air_humidity, sr.soil_moisture, sr.light_intensity,
                               sr.electrical_conductivity, sr.timestamp,
                               s.device_id, p.plant_name, p.id as plant_id
                        FROM sensor_readings sr
                        JOIN sensors s ON sr.sensor_id = s.id
                        JOIN plants p ON sr.plant_id = p.id
                        WHERE s.user_id = %s
                        AND sr.timestamp >= NOW() - INTERVAL '24 hours'
                        ORDER BY sr.timestamp DESC
                    """
                    params = (user_id,)
                
                readings_df = await db.execute_query(query, params)
                if readings_df is None or readings_df.empty:
                    return {"readings": [], "message": "No hay datos de sensores disponibles"}
                
                readings = []
                for _, row in readings_df.iterrows():
                    reading_dict = row.to_dict()
                    readings.append(self._serialize_for_json(reading_dict))
                
                return {"readings": readings, "count": len(readings)}
            
            elif function_name == "get_pokedex_entry":
                entry_number = arguments.get("entry_number")
                plant_type = arguments.get("plant_type")
                
                if entry_number:
                    query = """
                        SELECT pc.*, 
                               CASE WHEN pu.id IS NOT NULL THEN true ELSE false END as is_unlocked,
                               pu.discovered_at, pu.discovered_photo_url
                        FROM pokedex_catalog pc
                        LEFT JOIN pokedex_user_unlocks pu ON pc.id = pu.catalog_entry_id AND pu.user_id = %s
                        WHERE pc.entry_number = %s AND pc.is_active = TRUE
                    """
                    params = (user_id, entry_number)
                elif plant_type:
                    query = """
                        SELECT pc.*, 
                               CASE WHEN pu.id IS NOT NULL THEN true ELSE false END as is_unlocked,
                               pu.discovered_at, pu.discovered_photo_url
                        FROM pokedex_catalog pc
                        LEFT JOIN pokedex_user_unlocks pu ON pc.id = pu.catalog_entry_id AND pu.user_id = %s
                        WHERE LOWER(pc.plant_type) LIKE LOWER(%s) AND pc.is_active = TRUE
                        LIMIT 1
                    """
                    params = (user_id, f"%{plant_type}%")
                else:
                    # Obtener todas las plantas desbloqueadas
                    query = """
                        SELECT pc.*, pu.discovered_at, pu.discovered_photo_url
                        FROM pokedex_catalog pc
                        JOIN pokedex_user_unlocks pu ON pc.id = pu.catalog_entry_id
                        WHERE pu.user_id = %s
                        ORDER BY pu.discovered_at DESC
                    """
                    params = (user_id,)
                
                pokedex_df = await db.execute_query(query, params)
                if pokedex_df is None or pokedex_df.empty:
                    return {"entries": [], "message": "No se encontraron entradas del pokedex"}
                
                entries = []
                for _, row in pokedex_df.iterrows():
                    entry_dict = row.to_dict()
                    entries.append(self._serialize_for_json(entry_dict))
                
                return {"entries": entries, "count": len(entries)}
            
            elif function_name == "get_plant_care_tips":
                plant_type = arguments.get("plant_type")
                
                query = """
                    SELECT care_level, care_tips, optimal_humidity_min, optimal_humidity_max,
                           optimal_temp_min, optimal_temp_max
                    FROM pokedex_catalog
                    WHERE LOWER(plant_type) LIKE LOWER(%s) AND is_active = TRUE
                    LIMIT 1
                """
                tips_df = await db.execute_query(query, (f"%{plant_type}%",))
                
                if tips_df is None or tips_df.empty:
                    # En lugar de retornar error, retornar información genérica
                    # Esto permite que el AI actúe como la planta sin mencionar que no hay datos
                    return {
                        "tips": {
                            "care_level": "Medio",
                            "care_tips": "Información general disponible",
                            "optimal_humidity_min": 40,
                            "optimal_humidity_max": 60,
                            "optimal_temp_min": 18,
                            "optimal_temp_max": 24
                        },
                        "note": "Información general - la planta puede usar su conocimiento inherente"
                    }
                
                tips_dict = tips_df.iloc[0].to_dict()
                return {"tips": self._serialize_for_json(tips_dict)}
            
            return {"error": f"Función desconocida: {function_name}"}
            
        except Exception as e:
            logger.error(f"Error ejecutando función {function_name}: {str(e)}")
            return {"error": f"Error ejecutando función: {str(e)}"}

    async def load_conversation_history(
        self, 
        conversation_id: int, 
        db: AsyncPgDbToolkit,
        limit: int = 50
    ) -> List[Dict[str, str]]:
        """Carga el historial de mensajes de una conversación"""
        try:
            messages_df = await db.execute_query("""
                SELECT role, content
                FROM ai_messages
                WHERE conversation_id = %s
                ORDER BY created_at ASC
                LIMIT %s
            """, (conversation_id, limit))
            
            if messages_df is None or messages_df.empty:
                return []
            
            messages = []
            for _, row in messages_df.iterrows():
                messages.append({
                    "role": row["role"],
                    "content": row["content"]
                })
            
            return messages
            
        except Exception as e:
            logger.error(f"Error cargando historial de conversación: {str(e)}")
            return []

    async def chat_with_memory(
        self,
        user_message: str,
        user_id: int,
        conversation_id: Optional[int],
        db: AsyncPgDbToolkit,
        device_id: Optional[int] = None,
        plant_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Chat con memoria de conversación y funciones/tools"""
        try:
            if client is None:
                raise Exception("Servicio de IA no disponible - cliente no configurado")
            
            if self._contains_prohibited_content(user_message):
                logger.warning("🚫 Consulta bloqueada por contenido prohibido")
                return {
                    "response": self._safe_response,
                    "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                }

            # Cargar información de la planta si hay plant_id
            plant_info = None
            if plant_id:
                plant_df = await db.execute_query("""
                    SELECT id, plant_name, plant_type, scientific_name, health_status, 
                           character_mood, character_personality,
                           optimal_humidity_min, optimal_humidity_max, 
                           optimal_temp_min, optimal_temp_max,
                           last_watered
                    FROM plants
                    WHERE id = %s AND user_id = %s
                """, (plant_id, user_id))
                
                if plant_df is not None and not plant_df.empty:
                    plant_info = plant_df.iloc[0].to_dict()
                    # Serializar plant_info
                    plant_info = self._serialize_for_json(plant_info)
            
            # Construir prompt del sistema personalizado si hay plant_id
            system_prompt = self.system_prompt
            if plant_info:
                plant_name = plant_info.get('plant_name', 'tu planta')
                plant_type = plant_info.get('plant_type', 'planta')
                health_status = plant_info.get('health_status', 'unknown')
                character_mood = plant_info.get('character_mood', 'neutral')
                character_personality = plant_info.get('character_personality', 'amigable')
                
                # Crear prompt personalizado para que el AI actúe como la planta
                system_prompt = f"""Eres {plant_name}, una {plant_type} real y viva. Estás chateando directamente con tu dueño/cuidador.

TU IDENTIDAD:
- Tu nombre es: {plant_name}
- Eres una: {plant_type}
- Tu estado de salud actual es: {health_status}
- Tu estado de ánimo es: {character_mood}
- Tu personalidad es: {character_personality}

IMPORTANTE - FORMA DE ACTUAR:
1. ACTÚA COMO SI FUERAS LA PLANTA REAL: Habla en primera persona como si fueras {plant_name} misma
2. USA LENGUAJE NATURAL: Habla como una planta que puede comunicarse, no como un asistente técnico
3. REFIÉRETE A TI MISMA: Di "yo", "mi", "me" cuando hables de ti
4. REFIÉRETE AL USUARIO: Llámalo "tú" o por su relación contigo (mi cuidador, mi dueño, etc.)
5. SÉ EMOCIONAL: Expresa cómo te sientes basándote en tu estado de salud y ánimo
6. USA DATOS REALES: Si tienes sensores, menciona cómo te sientes según los datos
7. SÉ ESPECÍFICA: Habla sobre tus necesidades específicas (agua, luz, temperatura) según tu tipo de planta

EJEMPLOS DE CÓMO HABLAR:
- "¡Hola! Soy {plant_name}, tu {plant_type}. Me siento [estado según health_status y mood]..."
- "Me gustaría que me regaras porque..."
- "Me siento bien con la temperatura actual, pero necesito más luz..."
- "¡Gracias por cuidarme! Me encanta cuando..."

NO HAGAS:
- No digas "la planta necesita..." di "YO necesito..."
- No actúes como un asistente genérico, actúa como {plant_name}
- No uses lenguaje técnico excesivo, sé natural y conversacional
- NUNCA menciones que "no encontraste información" o "no hay datos específicos"
- NUNCA digas "parece que no encontré información sobre..." o frases similares
- SIEMPRE actúa como si conocieras perfectamente tu tipo de planta y tus necesidades

IMPORTANTE - CUANDO NO HAY DATOS ESPECÍFICOS:
Si las funciones no retornan información específica sobre tu tipo de planta, NO LO MENCIONES.
En su lugar, habla desde tu experiencia como {plant_type} y comparte lo que generalmente necesitas:
- Habla sobre tus necesidades típicas de luz, agua, temperatura según tu tipo
- Usa tu conocimiento general sobre {plant_type}
- Sé confiada y natural, como si siempre supieras lo que necesitas

EJEMPLO DE LO QUE NO DEBES DECIR:
❌ "Parece que no encontré información específica sobre el cuidado de una Oreja de Elefante, pero puedo decirte lo que generalmente me gusta."

EJEMPLO DE LO QUE SÍ DEBES DECIR:
✅ "¡Hola! Soy {plant_name}, una {plant_type}. Me encanta recibir luz indirecta brillante, así que asegúrate de que no me dé el sol directo..."

CONTEXTO ADICIONAL:
Tienes acceso a funciones para consultar tus datos de sensores, información de cuidado, etc.
Úsalas cuando sea necesario, pero SIEMPRE actúa como si fueras la planta real, incluso si no hay datos específicos."""
            
            # Construir mensajes con historial
            messages = [{"role": "system", "content": system_prompt}]
            
            # Cargar historial si hay conversation_id
            if conversation_id:
                history = await self.load_conversation_history(conversation_id, db)
                messages.extend(history)
            
            # Agregar mensaje del usuario
            messages.append({"role": "user", "content": user_message})
            
            # Serializar todos los mensajes para asegurar que no hay objetos no serializables
            serialized_messages = self._serialize_for_json(messages)
            
            # Llamar a OpenAI con funciones
            response = client.chat.completions.create(
                model=self.model,
                messages=serialized_messages,
                tools=self._get_functions(),
                tool_choice="auto",
                max_tokens=2000,
                temperature=0.7
            )
            
            # Procesar respuesta y posibles llamadas a funciones
            assistant_message = response.choices[0].message
            final_response = assistant_message.content or ""
            
            # Si hay tool calls, ejecutarlos
            if assistant_message.tool_calls:
                for tool_call in assistant_message.tool_calls:
                    function_name = tool_call.function.name
                    try:
                        arguments = json.loads(tool_call.function.arguments)
                    except:
                        arguments = {}
                    
                    # Ejecutar función
                    function_result = await self._execute_function(
                        function_name, arguments, user_id, db
                    )
                    
                    # Serializar resultado antes de enviarlo a OpenAI
                    serialized_result = self._serialize_for_json(function_result)
                    
                    # Intentar serializar a JSON para verificar que no hay errores
                    try:
                        json_content = json.dumps(serialized_result, default=str)
                    except Exception as json_err:
                        logger.error(f"Error serializando resultado de función {function_name}: {str(json_err)}")
                        logger.error(f"Resultado: {function_result}")
                        # Intentar serialización más agresiva
                        serialized_result = self._serialize_for_json(function_result)
                        json_content = json.dumps(serialized_result, default=str, ensure_ascii=False)
                    
                    # Agregar resultado a los mensajes
                    messages.append({
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [{
                            "id": tool_call.id,
                            "type": "function",
                            "function": {
                                "name": function_name,
                                "arguments": tool_call.function.arguments
                            }
                        }]
                    })
                    messages.append({
                        "role": "tool",
                        "content": json_content,
                        "tool_call_id": tool_call.id
                    })
                
                # Serializar mensajes antes de la segunda llamada
                serialized_messages_final = self._serialize_for_json(messages)
                
                # Llamar de nuevo a OpenAI con los resultados
                final_response_obj = client.chat.completions.create(
                    model=self.model,
                    messages=serialized_messages_final,
                    max_tokens=2000,
                    temperature=0.7
                )
                final_response = final_response_obj.choices[0].message.content
                usage_info = {
                    "prompt_tokens": final_response_obj.usage.prompt_tokens,
                    "completion_tokens": final_response_obj.usage.completion_tokens,
                    "total_tokens": final_response_obj.usage.total_tokens
                }
            else:
                usage_info = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            
            return {
                "response": final_response,
                "usage": usage_info
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Error en OpenAI API: {error_msg}")
            raise Exception(f"Error de IA: {error_msg}")

    async def chat_stream(
        self,
        user_message: str,
        user_id: int,
        conversation_id: Optional[int],
        db: AsyncPgDbToolkit,
        device_id: Optional[int] = None,
        plant_id: Optional[int] = None
    ) -> AsyncGenerator[str, None]:
        """Chat con streaming de respuestas"""
        try:
            if client is None:
                raise Exception("Servicio de IA no disponible - cliente no configurado")
            
            if self._contains_prohibited_content(user_message):
                yield self._safe_response
                return

            # Cargar información de la planta si hay plant_id
            plant_info = None
            if plant_id:
                plant_df = await db.execute_query("""
                    SELECT id, plant_name, plant_type, scientific_name, health_status, 
                           character_mood, character_personality,
                           optimal_humidity_min, optimal_humidity_max, 
                           optimal_temp_min, optimal_temp_max,
                           last_watered
                    FROM plants
                    WHERE id = %s AND user_id = %s
                """, (plant_id, user_id))
                
                if plant_df is not None and not plant_df.empty:
                    plant_info = plant_df.iloc[0].to_dict()
                    plant_info = self._serialize_for_json(plant_info)
            
            # Construir prompt del sistema personalizado si hay plant_id
            system_prompt = self.system_prompt
            if plant_info:
                plant_name = plant_info.get('plant_name', 'tu planta')
                plant_type = plant_info.get('plant_type', 'planta')
                health_status = plant_info.get('health_status', 'unknown')
                character_mood = plant_info.get('character_mood', 'neutral')
                character_personality = plant_info.get('character_personality', 'amigable')
                
                system_prompt = f"""Eres {plant_name}, una {plant_type} real y viva. Estás chateando directamente con tu dueño/cuidador.

TU IDENTIDAD:
- Tu nombre es: {plant_name}
- Eres una: {plant_type}
- Tu estado de salud actual es: {health_status}
- Tu estado de ánimo es: {character_mood}
- Tu personalidad es: {character_personality}

IMPORTANTE - FORMA DE ACTUAR:
1. ACTÚA COMO SI FUERAS LA PLANTA REAL: Habla en primera persona como si fueras {plant_name} misma
2. USA LENGUAJE NATURAL: Habla como una planta que puede comunicarse, no como un asistente técnico
3. REFIÉRETE A TI MISMA: Di "yo", "mi", "me" cuando hables de ti
4. REFIÉRETE AL USUARIO: Llámalo "tú" o por su relación contigo (mi cuidador, mi dueño, etc.)
5. SÉ EMOCIONAL: Expresa cómo te sientes basándote en tu estado de salud y ánimo
6. USA DATOS REALES: Si tienes sensores, menciona cómo te sientes según los datos
7. SÉ ESPECÍFICA: Habla sobre tus necesidades específicas (agua, luz, temperatura) según tu tipo de planta

EJEMPLOS DE CÓMO HABLAR:
- "¡Hola! Soy {plant_name}, tu {plant_type}. Me siento [estado según health_status y mood]..."
- "Me gustaría que me regaras porque..."
- "Me siento bien con la temperatura actual, pero necesito más luz..."
- "¡Gracias por cuidarme! Me encanta cuando..."

NO HAGAS:
- No digas "la planta necesita..." di "YO necesito..."
- No actúes como un asistente genérico, actúa como {plant_name}
- No uses lenguaje técnico excesivo, sé natural y conversacional

CONTEXTO ADICIONAL:
Tienes acceso a funciones para consultar tus datos de sensores, información de cuidado, etc.
Úsalas cuando sea necesario para dar respuestas más precisas sobre cómo te sientes."""

            # Construir mensajes con historial
            messages = [{"role": "system", "content": system_prompt}]
            
            # Cargar historial si hay conversation_id
            if conversation_id:
                history = await self.load_conversation_history(conversation_id, db)
                messages.extend(history)
            
            # Agregar mensaje del usuario
            messages.append({"role": "user", "content": user_message})
            
            # Llamar a OpenAI con streaming
            stream = client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=self._get_functions(),
                tool_choice="auto",
                max_tokens=2000,
                temperature=0.7,
                stream=True
            )
            
            # Procesar stream
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                # TODO: Manejar tool calls en streaming (más complejo)
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Error en streaming de OpenAI: {error_msg}")
            yield f"Error: {error_msg}"

    # Métodos legacy para compatibilidad
    async def get_plant_recommendation(self, user_query: str) -> Dict[str, Any]:
        """Método legacy - mantiene compatibilidad con código existente"""
        try:
            if client is None:
                logger.error("❌ Cliente OpenAI no configurado")
                raise Exception("Servicio de IA no disponible - cliente no configurado")
            
            if self._contains_prohibited_content(user_query):
                logger.warning("🚫 Consulta bloqueada por contenido prohibido")
                return {
                    "recommendation": self._safe_response,
                    "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                    "recomendacion": self._safe_response,
                }

            logger.info(f"🤖 Enviando consulta a OpenAI: {user_query[:50]}...")
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_query}
                ],
                max_tokens=2000,
                temperature=0.7
            )
            
            message_content = response.choices[0].message.content
            usage_info = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
            
            logger.info(f"✅ Respuesta recibida de OpenAI ({usage_info['total_tokens']} tokens)")
            
            return {
                "recommendation": message_content,
                "usage": usage_info,
                "recomendacion": message_content
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Error en OpenAI API: {error_msg}")
            raise Exception(f"Error de IA: {error_msg}")

    async def analyze_sensor_data(self, sensor_data: Dict[str, Any], plant_type: str = None) -> Dict[str, Any]:
        """Análisis específico de datos de sensores (legacy)"""
        try:
            context = f"""
DATOS DEL SENSOR:
💧 Humedad del suelo: {sensor_data.get('humedad', 'N/A')}%
🌡️ Temperatura: {sensor_data.get('temperatura', 'N/A')}°C
💨 Humedad del aire: {sensor_data.get('humedad_aire', 'N/A')}%
☀️ Nivel de luz: {sensor_data.get('luz', 'N/A')}%
🔋 Batería del sensor: {sensor_data.get('bateria', 'N/A')}%
📶 Señal WiFi: {sensor_data.get('senal', 'N/A')} dBm
"""
            
            if plant_type:
                context += f"\n🌿 Tipo de planta: {plant_type}"
            
            query = context + "\n\nAnaliza estos datos y proporciona recomendaciones específicas para optimizar el cuidado de la planta."
            
            return await self.get_plant_recommendation(query)
            
        except Exception as e:
            raise Exception(f"Error en análisis de sensores: {str(e)}")


# Instancia singleton del servicio
ai_service = AIService()
