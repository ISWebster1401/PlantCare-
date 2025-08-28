import os
from typing import Dict, Any
import openai
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configurar la API key de OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")

class AIService:
    def __init__(self):
        self.system_prompt = (
            "Eres PlantCare, un asistente experto en el cuidado de plantas. "
            "Ayudas a los usuarios a interpretar datos de sensores como humedad, luz y temperatura, "
            "y das recomendaciones simples y claras para mantener sus plantas saludables. "
            "Hablas de forma amable, breve y sin usar jerga técnica complicada."
        )

    async def get_plant_recommendation(self, user_query: str) -> Dict[str, Any]:
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo-0125",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_query}
                ]
            )
            
            return {
                "recommendation": response["choices"][0]["message"]["content"],
                "usage": response["usage"]
            }
        except Exception as e:
            raise Exception(f"Error al obtener recomendación de IA: {str(e)}")

# Instancia singleton del servicio
ai_service = AIService() 