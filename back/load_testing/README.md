# PlantCare Load Testing

Sistema de pruebas de carga para la API de PlantCare usando Locust.

## Características

- Simula hasta 300 usuarios concurrentes
- **Sin costo de OpenAI**: Las llamadas a la API se mockean cuando `TESTING_MODE=true`
- Prueba todos los endpoints principales: autenticación, plantas, sensores, IA
- Interfaz web para monitoreo en tiempo real

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOAD TESTING SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│   │   Locust    │     │  Mock Data  │     │   Config    │      │
│   │  300 users  │     │  (mock_data │     │  (config    │      │
│   │             │     │   .py)      │     │   .py)      │      │
│   └──────┬──────┘     └──────┬──────┘     └─────────────┘      │
│          │                   │                                  │
│          │                   │                                  │
│          ▼                   ▼                                  │
│   ┌──────────────────────────────────────────────────────┐     │
│   │              FastAPI Backend                          │     │
│   │   ┌─────────────────────────────────────────────┐    │     │
│   │   │  TESTING_MODE=true?                          │    │     │
│   │   │    ├─ YES → Return mock (no OpenAI cost)    │    │     │
│   │   │    └─ NO  → Call real OpenAI API            │    │     │
│   │   └─────────────────────────────────────────────┘    │     │
│   └──────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Instalación

```bash
# Desde la carpeta back/
pip install -r requirements.txt

# O instalar solo las dependencias de testing
pip install locust faker tqdm
```

## Uso Rápido

### 1. Activar modo testing

Edita `back/.env` y cambia:

```env
TESTING_MODE=true
```

### 2. Reiniciar el backend

```bash
cd back
uvicorn app.main:app --reload
```

Deberías ver en los logs:
```
🧪 TESTING_MODE ACTIVADO
⚠️ Las llamadas a OpenAI serán reemplazadas con mocks
```

### 3. Crear usuarios de prueba

```bash
cd back/load_testing
python create_test_users.py
```

Esto crea 100 usuarios con email `testuser{N}@plantcare.test`.

### 4. Ejecutar Locust

```bash
cd back/load_testing
locust -f locustfile.py --host http://localhost:8000
```

### 5. Abrir interfaz web

Navega a http://localhost:8089

Configura:
- **Number of users**: 300
- **Spawn rate**: 10 (usuarios por segundo)

¡Listo! Haz clic en "Start swarming".

## Comandos Útiles

### Ejecución sin interfaz web (headless)

```bash
locust -f locustfile.py --host http://localhost:8000 \
    --users 300 \
    --spawn-rate 10 \
    --run-time 5m \
    --headless
```

### Crear más usuarios

```bash
python create_test_users.py --count 200
```

### Verificar que los usuarios pueden hacer login

```bash
python create_test_users.py --verify
```

### Especificar URL del backend

```bash
python create_test_users.py --base-url http://192.168.1.100:8000
locust -f locustfile.py --host http://192.168.1.100:8000
```

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `locustfile.py` | Definición de tareas de Locust |
| `mock_data.py` | Respuestas mock para OpenAI |
| `config.py` | Configuración de endpoints y usuarios |
| `create_test_users.py` | Script para crear usuarios de prueba |
| `__init__.py` | Módulo Python |

## Tareas Simuladas

| Tarea | Peso | Descripción |
|-------|------|-------------|
| `get_plants` | 5 | Listar plantas del usuario |
| `get_sensors` | 4 | Listar sensores |
| `get_sensor_data` | 4 | Obtener datos de un sensor |
| `get_dashboard` | 3 | Dashboard principal |
| `scan_plant` | 2 | Identificar planta con IA |
| `ai_chat` | 2 | Chat con la IA |
| `get_profile` | 1 | Obtener perfil de usuario |

Los pesos determinan la frecuencia relativa de cada tarea.

## Configuración Avanzada

### Modificar pesos de tareas

Edita `config.py`:

```python
TASK_WEIGHTS = {
    "get_plants": 5,      # Más frecuente
    "scan_plant": 1,      # Menos frecuente
    # ...
}
```

### Agregar nuevos endpoints

1. Agregar endpoint en `config.py`:
```python
ENDPOINTS = {
    # ...
    "new_endpoint": "/api/new/endpoint",
}
```

2. Agregar tarea en `locustfile.py`:
```python
@task(3)  # Peso 3
def new_task(self):
    self.client.get(ENDPOINTS["new_endpoint"], headers=self.auth_headers)
```

## Interpretación de Resultados

### Métricas importantes

- **RPS (Requests Per Second)**: Solicitudes por segundo
- **Response Time (median)**: Tiempo de respuesta típico
- **Response Time (95%)**: 95% de requests por debajo de este tiempo
- **Failures**: Porcentaje de requests fallidos

### Valores de referencia

| Métrica | Bueno | Aceptable | Malo |
|---------|-------|-----------|------|
| RPS | >100 | 50-100 | <50 |
| Median RT | <200ms | 200-500ms | >500ms |
| 95% RT | <500ms | 500-1000ms | >1000ms |
| Failures | <1% | 1-5% | >5% |

## Troubleshooting

### "Login failed" para todos los usuarios

1. Verifica que el backend esté corriendo
2. Verifica que los usuarios fueron creados:
   ```bash
   python create_test_users.py --verify
   ```

### "Connection refused"

El backend no está corriendo o está en otra URL.

```bash
# Verificar que el backend responde
curl http://localhost:8000/health
```

### Errores 401 Unauthorized

El token JWT expiró. Locust maneja esto automáticamente relogueando.

### Alta tasa de errores en scan_plant

Verifica que `TESTING_MODE=true` esté activo. Si está en `false`, las llamadas a OpenAI pueden fallar por rate limiting o errores de API key.

## Seguridad

⚠️ **IMPORTANTE**:
- `TESTING_MODE` solo debe estar en `true` durante desarrollo/testing
- Los usuarios de prueba usan contraseñas débiles - no usar en producción
- Las credenciales en `.env` no deben subirse a repositorios públicos

## Desactivar Testing Mode

Cuando termines las pruebas:

```env
TESTING_MODE=false
```

Y reinicia el backend.
