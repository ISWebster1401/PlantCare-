# PC-012: Documentación del estado actual del firmware embebido

**Proyecto:** PlantCare — Sistema IoT de monitoreo de plantas  
**Autor:** Sebastián Vargas  
**Fecha del informe:** 10 de junio de 2026  
**Código de tarea:** PC-012

---

## 1. Resumen ejecutivo

PlantCare cuenta con un nodo IoT basado en **ESP8266 (Wemos D1 Mini)** cuyo software embebido está concentrado en un único archivo Arduino: `back/wemos_plantcare/wemos_plantcare.ino` (412 líneas).

El firmware **lee sensores y envía datos por HTTP**, pero está **desalineado con el backend actual**. Mientras el ecosistema del proyecto evolucionó hacia una API v2 de sensores (febrero 2026), el código del Wemos quedó apuntando a un endpoint legacy con URL, puerto y autenticación incorrectos.

| Capa | Última actividad | Estado |
|------|------------------|--------|
| Firmware embebido (`.ino`) | Dic 2025 (archivo en disco) / Nov 2025 (último commit git) | Funcional en lectura de sensores; no conecta al backend actual |
| Ecosistema IoT integrado (API v2 + móvil) | **10 feb 2026** (~4 meses) | Operativo en backend y app móvil |
| Archivo `.ino` sin cambios locales | Verificado 10 jun 2026 | Limpio en git (sin diff pendiente) |

**Conclusión:** El punto de partida al retomar el trabajo es **cerrar la brecha entre el Wemos y la API v2**, no reescribir el firmware desde cero.

---

## 2. Cronología verificada

### 2.1 Firmware embebido (`.ino`)

| Fecha | Evento |
|-------|--------|
| Oct 2025 | Desarrollo iterativo del firmware (refactors, WiFi, JSON, `deviceCode`) |
| 3 nov 2025 | Commit `5984a07` — actualización explícita del firmware Wemos para nuevo endpoint de servidor |
| 6 nov 2025 | Commit `cce9837` — archivo agregado en ruta `back/wemos_plantcare/wemos_plantcare.ino` |
| **9 dic 2025** | Última modificación del archivo en disco (`mtime`) |
| 10 jun 2026 | Verificación: sin cambios locales pendientes en git |

### 2.2 Ecosistema IoT (backend + móvil)

| Fecha | Evento |
|-------|--------|
| Ene 2026 | Tablas `sensors` y `sensor_readings` (UUID), panel admin de sensores, datos demo |
| **10 feb 2026** | Pantallas de riego en móvil con lectura real de humedad vía `sensorsAPI` |
| **10 feb 2026** | Historial de riego en AsyncStorage, eliminación de lógica simulada |
| 13 feb 2026 | Último commit general del repositorio |

> **Nota:** El trabajo de ~4 meses atrás que se recuerda corresponde al **stack IoT integrado (feb 2026)**, no a cambios en el archivo `.ino`, que no tuvo commits desde noviembre/diciembre 2025.

---

## 3. Inventario del software embebido

| Ítem | Detalle |
|------|---------|
| **Ubicación** | `back/wemos_plantcare/wemos_plantcare.ino` |
| **Líneas de código** | 412 |
| **Plataforma** | ESP8266 — Wemos D1 Mini |
| **IDE / toolchain** | Arduino IDE (no hay `platformio.ini` en el repo) |
| **Archivos adicionales** | Ninguno (sin tests, sin OTA, sin `libraries.txt`) |
| **Historial git** | 5 commits con cambios en la cadena del archivo (desde `cheche.ino` y versiones previas) |

### Librerías utilizadas

```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <Adafruit_BMP085.h>
#include <Wire.h>
```

---

## 4. Hardware configurado

### 4.1 Microcontrolador

- **Wemos D1 Mini** (ESP8266)
- LED integrado en **GPIO2** (`LED_PIN = 2`) — feedback de WiFi y envío exitoso

### 4.2 Sensores conectados

| Sensor | Conexión | Función | Estado en firmware |
|--------|----------|---------|-------------------|
| Sensor de humedad de suelo (analógico) | Pin **A0** | Humedad del sustrato 0–100% | Implementado |
| **BMP180** | I2C — SDA: D2 (GPIO4), SCL: D1 (GPIO5) | Temperatura, presión, altitud | Implementado (opcional, degradación graceful) |

### 4.3 Sensores previstos en API v2 pero NO en firmware

| Campo API v2 | Hardware típico | Estado |
|--------------|-----------------|--------|
| `air_humidity` | DHT11 / DHT22 / BME280 | No implementado |
| `light_intensity` | LDR / BH1750 | No implementado |
| `electrical_conductivity` | Sensor EC de suelo | No implementado |
| RSSI WiFi | Software (`WiFi.RSSI()`) | Se lee en Serial, no se envía |

---

## 5. Arquitectura del firmware

```
┌─────────────┐
│   setup()   │
├─────────────┤
│ Serial 115200
│ Inicializar I2C + BMP180
│ Conectar WiFi
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│            loop() cada 10s          │
├─────────────────────────────────────┤
│ 1. leerHumedadSuelo()      → A0     │
│ 2. leerDatosBMP180()       → I2C    │
│ 3. mostrarResumen()        → Serial │
│ 4. verificarWiFi()                  │
│ 5. enviarDatosAPI()        → HTTP   │
└─────────────────────────────────────┘
```

### 5.1 Parámetros de operación

| Parámetro | Valor |
|-----------|-------|
| Intervalo de lectura | 10 000 ms (10 segundos) |
| Baud rate Serial | 115200 |
| Timeout HTTP | 5 000 ms |
| Calibración humedad | `map(raw, 1024, 0, 0, 100)` + `constrain(0, 100)` |

### 5.2 Configuración hardcodeada (requiere actualización)

```cpp
const char WIFI_SSID[]       = "CPM";
const char WIFI_PASSWORD[]   = "EPDPM2025";
const char SERVER_URL[]      = "http://192.168.103.209:5001/sensor-humedad-suelo";
const char DEVICE_CODE[]     = "KWZ-1401";  // definido pero NO enviado en HTTP
```

### 5.3 Funcionalidades implementadas

- Lectura de humedad de suelo (analógico)
- Lectura BMP180 (temperatura, presión, altitud) con fallback si no está conectado
- Conexión y reconexión WiFi
- Envío HTTP POST con JSON
- Diagnóstico detallado por Serial Monitor
- Feedback LED (3 parpadeos en envío exitoso)
- Umbrales de estado en consola (seco / óptimo / húmedo, etc.)
- Optimización de memoria (`PROGMEM`, `ICACHE_FLASH_ATTR`, `snprintf_P`)

---

## 6. Comunicación con el backend

### 6.1 Lo que envía el firmware hoy

**Método:** `HTTP POST`  
**URL configurada:** `http://192.168.103.209:5001/sensor-humedad-suelo`  
**Headers:** solo `Content-Type: application/json`  
**Sin header `X-Device-Code`** a pesar de tener `DEVICE_CODE` definido

**Payload con BMP180:**
```json
{
  "humedad": 45.50,
  "temperatura": 22.3,
  "presion": 1013.25,
  "altitud": 520.0
}
```

**Payload sin BMP180:**
```json
{
  "humedad": 45.50
}
```

### 6.2 Dos sistemas paralelos en el backend

El proyecto mantiene **dos arquitecturas IoT coexistiendo**:

#### Sistema legacy (v1) — target actual del firmware

| Aspecto | Backend real | Firmware actual | ¿Coincide? |
|---------|--------------|-----------------|------------|
| URL | `POST /api/sensor-humedad-suelo` | `/sensor-humedad-suelo` (sin `/api`) | No |
| Puerto | **5000** (FastAPI) | **5001** | No |
| Autenticación | Header `X-Device-Code` | No se envía | No |
| Body JSON | `humedad`, `temperatura`, `presion`, `altitud` | Igual | Sí |
| Tabla destino | `sensor_humedad_suelo` | — | — |
| Registro previo | Tabla `devices` con `device_code` | `KWZ-1401` definido, no usado | No |

El backend valida el dispositivo mediante header obligatorio:

```python
# back/app/api/routes/humedad.py
async def get_device_id(
    device_code: str = Header(..., alias="X-Device-Code"),
    db = Depends(get_db)
) -> int:
```

Sin ese header, el firmware recibe **HTTP 422/401** aunque el servidor esté corriendo.

#### Sistema nuevo (v2) — arquitectura actual de PlantCare

| Aspecto | Detalle |
|---------|---------|
| Endpoint | `POST /api/sensors/data` |
| Autenticación | `device_id` en el body (sin JWT) |
| Campos requeridos | `device_id`, `temperature` (int), `air_humidity`, `soil_moisture` |
| Campos opcionales | `light_intensity`, `electrical_conductivity` |
| Tabla destino | `sensor_readings` (UUID) |
| Precondiciones | Sensor registrado, `status=active`, asignado a una planta |
| Cache | Redis vía `SensorReadingsService` |

**Payload esperado por v2:**
```json
{
  "device_id": "WEMOS_KWZ1401",
  "temperature": 22,
  "air_humidity": 60.0,
  "soil_moisture": 45.5
}
```

El firmware **no está adaptado** a esta API.

---

## 7. Integración con el resto del proyecto

### 7.1 Backend (FastAPI — puerto 5000)

| Módulo | Sistema | Relación con firmware |
|--------|---------|----------------------|
| `humedad.py` | Legacy v1 | Target del firmware actual (con correcciones) |
| `sensors.py` | v2 UUID | API objetivo a mediano plazo |
| `devices.py` | Gestión códigos `KWZ-XXXX` | Registro previo del dispositivo |
| `reports.py`, `demo.py` | Legacy `sensor_humedad_suelo` | Consumen datos v1 |
| `SensorReadingsService` | v2 + Redis | No alimentado por firmware actual |
| `ai.py` / `ai_service.py` | v2 `sensor_readings` | Análisis IA sobre lecturas v2 |

### 7.2 Frontend web (React)

| Componente | API usada | Estado |
|------------|-----------|--------|
| `HumedadView` | Legacy — `deviceAPI` + `humedadAPI` | Funcional con sistema v1 |
| `DeviceManager` | Legacy — `/api/devices` | Conectar dispositivo por código |
| `SensorManager` | v2 — `/api/sensors` | Registro y asignación de sensores |
| `DashboardCharts` | v2 — lecturas de sensores | Gráficos si hay datos v2 |

### 7.3 App móvil (Expo)

| Pantalla | Estado | Notas |
|----------|--------|-------|
| `sensors.tsx` | Placeholder ("Próximamente") | Sin gestión de sensores en UI |
| `watering.tsx` | **Operativo** (feb 2026) | Polling real a `sensorsAPI` cada 1s durante riego |
| `watering-history.tsx` | Operativo (feb 2026) | Sesiones guardadas en AsyncStorage |
| Resto de la app | Sin dependencia directa del firmware | — |

---

## 8. Diagrama del estado actual

```
┌─────────────────────────┐
│   Wemos D1 Mini         │
│   wemos_plantcare.ino   │
│   (últ. cambio: dic 25) │
└───────────┬─────────────┘
            │ HTTP POST
            │ :5001/sensor-humedad-suelo  ← ROTO
            │ (sin X-Device-Code)         ← ROTO
            ▼
┌──────────────────────────────────────────────────────────┐
│              Backend FastAPI (:5000)                        │
│                                                           │
│  ┌─────────────────────┐    ┌──────────────────────────┐  │
│  │ LEGACY (v1)         │    │ NUEVO (v2)               │  │
│  │ /api/sensor-        │    │ /api/sensors/data        │  │
│  │ humedad-suelo       │    │                          │  │
│  │                     │    │ sensors (UUID)           │  │
│  │ devices             │    │ sensor_readings          │  │
│  │ sensor_humedad_suelo│    │ + Redis cache            │  │
│  └────────┬────────────┘    └──────────┬───────────────┘  │
└───────────┼────────────────────────────┼──────────────────┘
            │                            │
     HumedadView                   DashboardCharts
     DeviceManager                 SensorManager
     Reports / Demo                Mobile watering.tsx
                                   AI analysis
```

---

## 9. Problemas conocidos y deuda técnica

### 9.1 Críticos (bloquean envío de datos)

1. **URL incorrecta** — falta prefijo `/api`, puerto 5001 en vez de 5000
2. **Header `X-Device-Code` ausente** — `DEVICE_CODE` definido pero nunca enviado
3. **Dispositivo no registrado** — `KWZ-1401` debe existir en tabla `devices` y estar conectado a un usuario

### 9.2 Importantes

4. **Dos modelos de datos coexistiendo** — confusión sobre cuál es el camino oficial
5. **Firmware desconectado de API v2** — la app móvil (riego) consume v2, el Wemos apunta a v1
6. **Campos requeridos en v2 no disponibles** — `air_humidity` no tiene sensor físico

### 9.3 Menores

7. **Credenciales en texto plano** — WiFi y device code hardcodeados en el `.ino`
8. **Comentarios obsoletos** — referencias a MySQL y puerto 5001; backend actual es PostgreSQL en 5000
9. **Intervalo agresivo** — 10 segundos en firmware vs. 5–10 minutos recomendados en producción
10. **Sin OTA, deep sleep, WiFiManager ni almacenamiento local**

---

## 10. Funcionalidades: implementado vs. pendiente

### Implementado en firmware

- [x] Lectura humedad de suelo (A0)
- [x] Lectura BMP180 (I2C)
- [x] Conexión / reconexión WiFi
- [x] Envío HTTP POST JSON
- [x] Diagnóstico Serial
- [x] Feedback LED
- [x] Degradación graceful sin BMP180

### Pendiente en firmware

| Prioridad | Item |
|-----------|------|
| Alta | Corregir URL (`/api/sensor-humedad-suelo`, puerto 5000) |
| Alta | Enviar header `X-Device-Code` |
| Alta | Migrar a API v2 `/api/sensors/data` |
| Media | Enviar RSSI WiFi |
| Media | Sensor humedad de aire (DHT22) |
| Media | Sensor de luz (LDR) |
| Media | WiFiManager / portal cautivo |
| Baja | Deep sleep, OTA, watchdog, almacenamiento local |

---

## 11. Plan de acción recomendado

### Fase 0 — Verificación hardware (1–2 horas)

1. Flashear firmware actual en Wemos D1 Mini
2. Abrir Serial Monitor (115200 baud)
3. Confirmar lecturas de A0 y BMP180
4. Actualizar credenciales WiFi si la red cambió

### Fase 1 — Quick win: conectar con backend legacy (medio día)

Cambios mínimos en `wemos_plantcare.ino`:

```cpp
const char SERVER_URL[] PROGMEM = "http://<IP_SERVIDOR>:5000/api/sensor-humedad-suelo";

// En enviarDatosAPI(), agregar:
http.addHeader(F("X-Device-Code"), FPSTR(DEVICE_CODE));
```

Pasos adicionales:
1. Registrar `KWZ-1401` en BD (admin o `POST /api/devices/admin/generate-codes`)
2. Conectar dispositivo a usuario desde `DeviceManager` (web)
3. Validar datos en `HumedadView`

### Fase 2 — Migración a API v2 (1–2 días)

1. Adaptar payload del firmware al schema `SensorDataInput`
2. Registrar sensor en `POST /api/sensors/register`
3. Asignar a planta con `POST /api/sensors/{id}/assign`
4. Validar en `DashboardCharts` y `watering.tsx` (móvil)
5. Para `air_humidity`: valor estimado temporal o agregar DHT22

### Fase 3 — Mejoras de hardware/firmware (según prioridad)

1. DHT22 para humedad de aire real
2. Enviar `WiFi.RSSI()` en payload
3. Subir intervalo a 60–300 s en producción
4. WiFiManager para configuración sin recompilar

---

## 12. Checklist de arranque rápido

```
[ ] Wemos D1 Mini + sensor humedad + BMP180 cableados
[ ] Arduino IDE con board ESP8266 y librería Adafruit BMP085
[ ] Backend corriendo en :5000 (docker-compose o local)
[ ] PostgreSQL con tablas devices y sensor_humedad_suelo (v1)
      y/o sensors + sensor_readings (v2)
[ ] Código KWZ-1401 registrado y conectado a mi usuario
[ ] IP, puerto y header X-Device-Code actualizados en el .ino
[ ] Lecturas visibles en Serial Monitor
[ ] Datos llegando a HumedadView (v1) o watering.tsx (v2)
```

---

## 13. Conclusión

El firmware es un **MVP funcional** para lectura de sensores con buena instrumentación por Serial. El hardware base (humedad de suelo + BMP180) está implementado y probado a nivel de código.

Sin embargo, el Wemos **no puede guardar datos en el backend actual** por tres fallas concretas: URL incorrecta, puerto incorrecto y ausencia del header de autenticación.

El ecosistema PlantCare avanzó significativamente en **febrero 2026** (~4 meses atrás) con la API v2, integración de riego en móvil y cache Redis, pero el archivo `.ino` no fue actualizado en ese período.

**Recomendación:** iniciar con la **Fase 1** (fix mínimo legacy) para tener datos reales en pantalla esta semana, y planificar la **Fase 2** (migración v2) como siguiente hito de integración formal con el resto del sistema.

---

*Documento generado como parte de la tarea PC-012. Última verificación del repositorio: 10 de junio de 2026.*
