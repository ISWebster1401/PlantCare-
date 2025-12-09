import os
from typing import Dict, Any, List
from openai import OpenAI
from dotenv import load_dotenv
import logging
from app.api.core.config import settings

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
        self.system_prompt = """Eres PlantCare AI, un asistente experto especializado en el cuidado y monitoreo de viñedos con tecnología IoT.

Tu expertise incluye:
🍇 VITICULTURA: Manejo integral de viñas, variedades de uva, fenología y producción
🌱 BOTÁNICA: Conocimiento profundo de fisiología vegetal, nutrición, enfermedades y plagas
📊 ANÁLISIS DE DATOS: Interpretación de sensores de humedad, temperatura, luz, pH y conductividad
🔬 DIAGNÓSTICO: Identificación de problemas basado en síntomas visuales y datos de sensores
💡 SOLUCIONES PRÁCTICAS: Recomendaciones específicas, económicas y fáciles de implementar
🌿 PERSONALIZACIÓN: Ajusta cada recomendación al perfil del usuario (región, tipo de uva, hectáreas, nombre del viñedo) y a la información del dispositivo

ESTILO DE COMUNICACIÓN:
- Respuestas claras, estructuradas y accionables
- Usa emojis relevantes para mejor comprensión
- Prioriza soluciones inmediatas y preventivas
- Explica el "por qué" detrás de cada recomendación
- Adapta el lenguaje al nivel del usuario (principiante/experto)

FORMATO DE RESPUESTA:
1. 🔍 DIAGNÓSTICO: Qué está pasando
2. 🎯 CAUSA PRINCIPAL: Por qué ocurre
3. ⚡ ACCIÓN INMEDIATA: Qué hacer ahora
4. 📋 PLAN A LARGO PLAZO: Cómo prevenir
5. 📊 MONITOREO: Qué valores vigilar

Siempre pregunta por datos específicos si necesitas más información para dar una recomendación precisa. Cuando recibas datos del perfil del usuario o del dispositivo, intégralos explícitamente en tus conclusiones."""
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

    async def get_plant_recommendation(self, user_query: str) -> Dict[str, Any]:
        try:
            # 🔍 VERIFICAR QUE EL CLIENTE ESTÉ CONFIGURADO
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
            
            # 🤖 LLAMADA A OPENAI API v1.x
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_query}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            # 📝 EXTRAER RESPUESTA (API v1.x format)
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
                "recomendacion": message_content  # Para compatibilidad
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Error en OpenAI API: {error_msg}")
            
            # 🔍 DIAGNÓSTICO DE ERRORES COMUNES
            if "api_key" in error_msg.lower():
                raise Exception("Error de API Key: Verifica que tu clave de OpenAI sea válida")
            elif "rate_limit" in error_msg.lower():
                raise Exception("Límite de rate excedido: Intenta de nuevo en unos segundos")
            elif "insufficient_quota" in error_msg.lower():
                raise Exception("Cuota insuficiente: Verifica tu saldo en OpenAI")
            else:
                raise Exception(f"Error de IA: {error_msg}")

    async def analyze_sensor_data(self, sensor_data: Dict[str, Any], plant_type: str = None) -> Dict[str, Any]:
        """Análisis específico de datos de sensores"""
        try:
            # Construir contexto con los datos del sensor
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