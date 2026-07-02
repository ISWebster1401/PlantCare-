"""
PlantCare Load Testing Module

Este módulo contiene herramientas para realizar pruebas de carga
sin gastar dinero en llamadas a OpenAI.

Uso:
    1. Configurar TESTING_MODE=true en .env
    2. Ejecutar create_test_users.py para crear usuarios
    3. Ejecutar locust -f locustfile.py --host http://localhost:8000
    4. Abrir http://localhost:8089 para la interfaz de Locust
"""

__version__ = "1.0.0"
