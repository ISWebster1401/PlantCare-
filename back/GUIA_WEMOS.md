# 🌱 Guía para Subir Código al Wemos D1 Mini (ESP8266)

## 📋 Requisitos

1. **Arduino IDE** (versión 1.8.x o superior)
2. **Cable USB** para conectar el Wemos a tu PC
3. **Drivers USB** del chip CH340/CH341 (si Windows no lo reconoce)

---

## 🔧 Paso 1: Instalar Arduino IDE

1. Descarga Arduino IDE desde: https://www.arduino.cc/en/software
2. Instala normalmente (siguiente, siguiente...)
3. Abre Arduino IDE

---

## 🔧 Paso 2: Configurar Arduino IDE para ESP8266

1. **Abrir Preferencias:**
   - Menú: `Archivo` → `Preferencias`
   - En "URLs adicionales de Gestor de placas", agrega:
     ```
     http://arduino.esp8266.com/stable/package_esp8266com_index.json
     ```

2. **Instalar placa ESP8266:**
   - Menú: `Herramientas` → `Placa` → `Gestor de Placas...`
   - Busca: `esp8266`
   - Instala: **"esp8266 by ESP8266 Community"** (versión 3.x.x)
   - Cierra cuando termine

3. **Instalar librería BMP180:**
   - Menú: `Herramientas` → `Administrar Bibliotecas...`
   - Busca: `Adafruit BMP085`
   - Instala: **"Adafruit BMP085 Library"**
   - También instala: **"Adafruit Unified Sensor"** (dependencia)

---

## 🔧 Paso 3: Configurar Placa en Arduino IDE

1. **Seleccionar placa:**
   - Menú: `Herramientas` → `Placa` → `ESP8266 Boards` → `NodeMCU 1.0 (ESP-12E Module)`
   
   **O si tu Wemos es D1 Mini:**
   - `Herramientas` → `Placa` → `ESP8266 Boards` → `LOLIN(WEMOS) D1 R2 & mini`

2. **Configurar puerto:**
   - Menú: `Herramientas` → `Puerto`
   - Selecciona el puerto COM donde está conectado tu Wemos
   - Si no aparece, verifica que el cable USB esté conectado y los drivers instalados

3. **Otras configuraciones:**
   - `Herramientas` → `Velocidad de carga`: `115200`
   - `Herramientas` → `Velocidad CPU`: `80 MHz`
   - `Herramientas` → `Flash Size`: `4MB (FS:2MB OTA:~1019KB)`

---

## 🔧 Paso 4: Configurar el Código

1. **Abrir el archivo:**
   - En Arduino IDE: `Archivo` → `Abrir`
   - Navega a: `back/wemos_plantcare.ino`

2. **Actualizar configuración:**
   ```cpp
   // WiFi
   const char WIFI_SSID[] PROGMEM = "TU_WIFI";  // ⚠️ CAMBIAR
   const char WIFI_PASSWORD[] PROGMEM = "TU_PASSWORD";  // ⚠️ CAMBIAR
   
   // API - ACTUALIZA CON TU IP LOCAL
   const char SERVER_URL[] PROGMEM = "http://TU_IP_LOCAL:5001/sensor-humedad-suelo";  // ⚠️ CAMBIAR
   ```

   **Para obtener tu IP local (Windows):**
   ```powershell
   ipconfig
   ```
   Busca "IPv4 Address" (ejemplo: 192.168.1.100)

---

## 🔧 Paso 5: Subir Código al Wemos

1. **Verificar código:**
   - Clic en el botón ✓ (Verificar)
   - Debe compilar sin errores

2. **Subir al Wemos:**
   - Conecta el Wemos por USB
   - Selecciona el puerto COM correcto
   - Clic en el botón → (Subir)
   - Espera a que diga "¡Subida completada!"

3. **Abrir Monitor Serie:**
   - Menú: `Herramientas` → `Monitor Serie`
   - Velocidad: `115200` baudios
   - Deberías ver los logs del sensor

---

## 🐛 Solución de Problemas

### No aparece el puerto COM:
- Instala drivers CH340/CH341 desde: https://github.com/WCHSoftGroup/ch34xser_linux_mac/blob/main/windows/CH341SER.EXE
- Revisa que el cable USB funcione (prueba otro cable)
- Reinicia Arduino IDE después de instalar drivers

### Error de compilación:
- Verifica que instalaste el paquete ESP8266
- Verifica que instalaste las librerías BMP085
- Revisa que la placa esté seleccionada correctamente

### No se conecta al WiFi:
- Verifica SSID y contraseña
- Asegúrate de que el WiFi esté en 2.4GHz (ESP8266 no soporta 5GHz)

### No envía datos al servidor:
- Verifica que `server.py` esté corriendo en el puerto 5001
- Verifica que la IP en `SERVER_URL` sea correcta
- Revisa el Monitor Serie para ver errores

---

## ✅ Verificación

Una vez subido el código:

1. **Abre el Monitor Serie** (115200 baudios)
2. Deberías ver:
   ```
   🌱 MONITOR AMBIENTAL - ESP8266 + SERVIDOR PYTHON
   🔗 Conectando a WiFi...
   ✅ ¡CONECTADO AL WiFi!
   📍 IP asignada: 192.168.x.x
   📊 === LECTURA #1 ===
   💧 Humedad: XX%
   📡 === ENVIANDO DATOS AL SERVIDOR PYTHON ===
   ✅ ¡DATOS ENVIADOS EXITOSAMENTE!
   ```

3. **Verifica en el servidor:**
   - Deberías ver en la consola de `server.py`:
   ```
   📊 Humedad recibida: XX% | 🟩 ÓPTIMO
   ```

---

## 🚀 Próximos Pasos

Una vez que funcione con `server.py`, podemos integrarlo con FastAPI para:
- Guardar lecturas en PostgreSQL
- Conectar el dispositivo con código "KWZ-1401" a tu cuenta
- Mostrar datos en el dashboard de PlantCare

---

**¿Dudas?** Revisa los logs en el Monitor Serie del Arduino IDE.

