"""
Locust Load Testing para PlantCare API.

Simula 300 usuarios concurrentes interactuando con la aplicación.
Las llamadas a OpenAI se mockeanan cuando TESTING_MODE=true en el backend.

Uso:
    locust -f locustfile.py --host http://localhost:8000 --users 300 --spawn-rate 10

Luego abre http://localhost:8089 para la interfaz web de Locust.
"""

import random
import base64
from locust import HttpUser, task, between, events
import logging

from config import (
    ENDPOINTS,
    TEST_USER_EMAIL_TEMPLATE,
    TEST_USER_PASSWORD,
    TEST_USER_COUNT,
    TASK_WEIGHTS,
    LOCUST_CONFIG,
    FAKE_PLANT_IMAGE_BASE64,
)

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PlantCareUser(HttpUser):
    """
    Usuario simulado de PlantCare.
    
    Cada usuario hace login al inicio y luego ejecuta tareas
    ponderadas según TASK_WEIGHTS.
    """
    
    wait_time = between(
        LOCUST_CONFIG["min_wait"] / 1000,  # Convertir a segundos
        LOCUST_CONFIG["max_wait"] / 1000
    )
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.token = None
        self.user_number = None
        self.plants = []
        self.sensors = []
        self.logged_in = False
    
    def on_start(self):
        """
        Se ejecuta cuando un usuario simulado inicia.
        Hace login y guarda el token JWT.
        """
        # Asignar un número de usuario aleatorio
        self.user_number = random.randint(1, TEST_USER_COUNT)
        email = TEST_USER_EMAIL_TEMPLATE.format(self.user_number)
        
        # Intentar login
        with self.client.post(
            ENDPOINTS["login"],
            json={
                "email": email,
                "password": TEST_USER_PASSWORD
            },
            catch_response=True,
            name="login"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.logged_in = True
                response.success()
                logger.debug(f"✅ Usuario {email} logueado correctamente")
            else:
                response.failure(f"Login failed: {response.status_code}")
                logger.warning(f"❌ Login fallido para {email}: {response.status_code}")
                self.logged_in = False
    
    @property
    def auth_headers(self):
        """Headers con token de autenticación."""
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}
    
    def _ensure_logged_in(self):
        """Asegura que el usuario esté logueado."""
        if not self.logged_in or not self.token:
            self.on_start()
        return self.logged_in
    
    # ============================================
    # TAREAS DE PLANTAS
    # ============================================
    
    @task(TASK_WEIGHTS.get("get_plants", 5))
    def get_plants(self):
        """Obtener lista de plantas del usuario."""
        if not self._ensure_logged_in():
            return
            
        with self.client.get(
            ENDPOINTS["plants"],
            headers=self.auth_headers,
            catch_response=True,
            name="get_plants"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                # Guardar IDs de plantas para otras operaciones
                if isinstance(data, list):
                    self.plants = [p.get("id") for p in data if p.get("id")]
                response.success()
            elif response.status_code == 401:
                response.failure("Unauthorized - token expired")
                self.logged_in = False
            else:
                response.failure(f"Error: {response.status_code}")
    
    @task(TASK_WEIGHTS.get("scan_plant", 2))
    def scan_plant(self):
        """
        Escanear una planta (identificación con IA).
        Esta es la operación más pesada - usa multipart/form-data.
        """
        if not self._ensure_logged_in():
            return
        
        # Crear imagen fake para el upload
        image_bytes = base64.b64decode(FAKE_PLANT_IMAGE_BASE64)
        
        files = {
            "file": ("test_plant.png", image_bytes, "image/png")
        }
        
        # plant_species es opcional - a veces lo enviamos, a veces no
        data = {}
        if random.random() > 0.5:
            data["plant_species"] = random.choice([
                "Monstera",
                "Ficus",
                "Pothos",
                "Aloe",
                None
            ])
        
        with self.client.post(
            ENDPOINTS["identify"],
            headers=self.auth_headers,
            files=files,
            data=data if data else None,
            catch_response=True,
            name="scan_plant (AI)"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                response.failure("Unauthorized")
                self.logged_in = False
            elif response.status_code == 422:
                # Error de validación - probablemente la imagen
                response.failure("Validation error")
            else:
                response.failure(f"Error: {response.status_code}")
    
    # ============================================
    # TAREAS DE SENSORES
    # ============================================
    
    @task(TASK_WEIGHTS.get("get_sensors", 4))
    def get_sensors(self):
        """Obtener lista de sensores del usuario."""
        if not self._ensure_logged_in():
            return
            
        with self.client.get(
            ENDPOINTS["sensors"],
            headers=self.auth_headers,
            catch_response=True,
            name="get_sensors"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                # Guardar IDs de sensores para otras operaciones
                if isinstance(data, list):
                    self.sensors = [s.get("id") for s in data if s.get("id")]
                response.success()
            elif response.status_code == 401:
                response.failure("Unauthorized")
                self.logged_in = False
            else:
                response.failure(f"Error: {response.status_code}")
    
    @task(TASK_WEIGHTS.get("get_sensor_data", 4))
    def get_sensor_data(self):
        """Obtener datos del sensor más reciente."""
        if not self._ensure_logged_in():
            return
        
        # Si tenemos sensores guardados, usar uno de ellos
        if self.sensors:
            sensor_id = random.choice(self.sensors)
            url = ENDPOINTS["sensor_latest"].format(sensor_id)
            
            with self.client.get(
                url,
                headers=self.auth_headers,
                catch_response=True,
                name="get_sensor_latest"
            ) as response:
                if response.status_code == 200:
                    response.success()
                elif response.status_code == 404:
                    # Sensor no encontrado - OK, puede que no tenga datos
                    response.success()
                elif response.status_code == 401:
                    response.failure("Unauthorized")
                    self.logged_in = False
                else:
                    response.failure(f"Error: {response.status_code}")
    
    # ============================================
    # TAREAS DE DASHBOARD Y PERFIL
    # ============================================
    
    @task(TASK_WEIGHTS.get("get_dashboard", 3))
    def get_dashboard(self):
        """Obtener datos del dashboard."""
        if not self._ensure_logged_in():
            return
            
        with self.client.get(
            ENDPOINTS["dashboard"],
            headers=self.auth_headers,
            catch_response=True,
            name="get_dashboard"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                response.failure("Unauthorized")
                self.logged_in = False
            else:
                response.failure(f"Error: {response.status_code}")
    
    @task(TASK_WEIGHTS.get("get_profile", 1))
    def get_profile(self):
        """Obtener perfil del usuario."""
        if not self._ensure_logged_in():
            return
            
        with self.client.get(
            ENDPOINTS["me"],
            headers=self.auth_headers,
            catch_response=True,
            name="get_profile"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                response.failure("Unauthorized")
                self.logged_in = False
            else:
                response.failure(f"Error: {response.status_code}")
    
    # ============================================
    # TAREAS DE IA (CHAT)
    # ============================================
    
    @task(TASK_WEIGHTS.get("ai_chat", 2))
    def ai_chat(self):
        """Enviar mensaje al chat de IA."""
        if not self._ensure_logged_in():
            return
        
        # Mensajes de prueba variados
        messages = [
            "¿Cómo está mi planta?",
            "¿Necesito regar mis plantas?",
            "Dame consejos de cuidado",
            "¿Qué significa humedad del 45%?",
            "Mi planta tiene hojas amarillas",
            "¿Cuánta luz necesita un Pothos?",
            "¿Cada cuánto debo fertilizar?",
            "¿Qué temperatura es ideal para mis plantas?",
        ]
        
        # Construir payload
        payload = {
            "message": random.choice(messages),
        }
        
        # A veces incluir plant_id si tenemos plantas
        if self.plants and random.random() > 0.5:
            payload["plant_id"] = random.choice(self.plants)
        
        with self.client.post(
            ENDPOINTS["ai_chat"],
            json=payload,
            headers=self.auth_headers,
            catch_response=True,
            name="ai_chat"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                response.failure("Unauthorized")
                self.logged_in = False
            else:
                response.failure(f"Error: {response.status_code}")


# ============================================
# EVENTOS DE LOCUST
# ============================================

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Se ejecuta cuando inicia el test."""
    print("=" * 60)
    print("🌱 PlantCare Load Test - INICIANDO")
    print("=" * 60)
    print("⚠️ Asegúrate de que TESTING_MODE=true en el backend")
    print("⚠️ Las llamadas a OpenAI serán mockeadas")
    print("=" * 60)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Se ejecuta cuando termina el test."""
    print("=" * 60)
    print("🌱 PlantCare Load Test - FINALIZADO")
    print("=" * 60)


# ============================================
# PARA EJECUTAR DIRECTAMENTE
# ============================================

if __name__ == "__main__":
    import subprocess
    import sys
    
    print("Ejecutando Locust...")
    print("Abre http://localhost:8089 en tu navegador")
    
    subprocess.run([
        sys.executable, "-m", "locust",
        "-f", __file__,
        "--host", "http://localhost:8000"
    ])
