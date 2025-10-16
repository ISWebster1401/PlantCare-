#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <Adafruit_BMP085.h>
#include <Wire.h>

// ==================== CONFIGURACIÓN USUARIO ====================
// WiFi
const char WIFI_SSID[] PROGMEM = "CPM";
const char WIFI_PASSWORD[] PROGMEM = "EPDPM2025";

// API - ACTUALIZA ESTOS VALORES CON TUS DATOS
const char SERVER_URL[] PROGMEM = "http://192.168.101.213:5000/api/lecturas";  // ⚠️ Endpoint actualizado
const int DEVICE_ID = "PGA-1234";  // ⚠️ IMPORTANTE: ID del dispositivo en la BD

// Intervalo de lecturas (en milisegundos)
const unsigned long INTERVALO_LECTURA = 10000; // 10 segundos
// ===============================================================

// Pines
const int SENSOR_HUMEDAD_PIN = A0;
const int LED_PIN = 2;

// Objeto BMP180
Adafruit_BMP085 bmp;

// Variables optimizadas
bool wifiConectado = false;
bool bmpConectado = false;
unsigned long ultimaLectura = 0;
uint16_t contadorLecturas = 0;

// Buffer ampliado para JSON según schema de Pydantic
char jsonBuffer[512];

// Estructura para almacenar datos según SensorReadingCreate schema
struct DatosSensores {
  int device_id;           // Obligatorio (int)
  float valor;             // Obligatorio: humedad del suelo (0-100%)
  float temperatura;       // Opcional: temperatura ambiente (-20 a 60°C)
  float luz;               // Opcional: nivel de luz (>=0 lux)
  float humedad_ambiente;  // Opcional: humedad ambiente (0-100%)
  float battery_level;     // Opcional: nivel batería (0-100%)
  int signal_strength;     // Opcional: fuerza señal (-100 a 0 dBm)
};

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);
  
  delay(2000);
  
  Serial.println(F("\n============================================================"));
  Serial.println(F("🌱 MONITOR AMBIENTAL - ESP8266 + FASTAPI"));
  Serial.println(F("💧 Sensores: Humedad del Suelo + BMP180"));
  Serial.print(F("📡 API Endpoint: "));
  Serial.println(FPSTR(SERVER_URL));
  Serial.print(F("🆔 Device ID: "));
  Serial.println(DEVICE_ID);
  Serial.println(F("============================================================"));
  
  // Inicializar I2C para BMP180
  Wire.begin();
  
  // Inicializar BMP180
  inicializarBMP180();
  
  // Conectar WiFi
  conectarWiFi();
  
  Serial.println(F("============================================================"));
  Serial.print(F("🚀 SISTEMA INICIADO - Leyendo cada "));
  Serial.print(INTERVALO_LECTURA/1000);
  Serial.println(F(" segundos"));
  Serial.println(F("============================================================"));
  
  delay(1000);
}

void loop() {
  if (millis() - ultimaLectura >= INTERVALO_LECTURA) {
    contadorLecturas++;
    
    Serial.print(F("\n📊 === LECTURA #"));
    Serial.print(contadorLecturas);
    Serial.println(F(" ==="));
    Serial.print(F("🕒 "));
    Serial.print(millis()/1000);
    Serial.println(F("s desde el inicio"));
    
    // Estructura para almacenar todos los datos
    DatosSensores datos;
    datos.device_id = DEVICE_ID;
    
    // Leer todos los sensores según schema
    datos.valor = leerHumedadSuelo();  // Campo obligatorio: humedad del suelo
    leerDatosBMP180(datos);            // Temperatura opcional
    datos.luz = 0;                     // Placeholder - añadir sensor de luz si existe
    datos.humedad_ambiente = 0;        // Placeholder - añadir DHT11/22 si existe
    datos.battery_level = 0;           // Placeholder - añadir lectura de batería si aplica
    datos.signal_strength = WiFi.RSSI(); // Fuerza de señal WiFi
    
    // Mostrar resumen completo
    mostrarResumen(datos);
    
    // Enviar datos a la API
    if (verificarWiFi()) {
      enviarDatosAPI(datos);
    }
    
    ultimaLectura = millis();
  }
  
  delay(100);
}

ICACHE_FLASH_ATTR void inicializarBMP180() {
  Serial.println(F("\n🌡️ Inicializando sensor BMP180..."));
  
  if (bmp.begin()) {
    bmpConectado = true;
    Serial.println(F("✅ BMP180 inicializado correctamente"));
    Serial.println(F("📊 Sensores disponibles: Temperatura, Presión"));
  } else {
    bmpConectado = false;
    Serial.println(F("❌ Error: No se pudo inicializar BMP180"));
    Serial.println(F("💡 Verifica las conexiones I2C:"));
    Serial.println(F("   - VCC -> 3.3V"));
    Serial.println(F("   - GND -> GND"));
    Serial.println(F("   - SDA -> D2 (GPIO4)"));
    Serial.println(F("   - SCL -> D1 (GPIO5)"));
  }
}

void leerDatosBMP180(DatosSensores &datos) {
  if (!bmpConectado) {
    Serial.println(F("\n⚠️ BMP180 no disponible"));
    datos.temperatura = 0;  // null/0 para campos opcionales
    return;
  }
  
  Serial.println(F("\n🌡️ === SENSOR BMP180 ==="));
  
  // Leer temperatura (validación: -20 a 60°C según schema)
  float tempRaw = bmp.readTemperature();
  datos.temperatura = constrain(tempRaw, -20.0, 60.0);
  
  Serial.print(F("🌡️ Temperatura: "));
  Serial.print(datos.temperatura, 1);
  Serial.println(F("°C"));
  
  // Validación según schema
  if (datos.temperatura < -20 || datos.temperatura > 60) {
    Serial.println(F("⚠️ Temperatura fuera de rango permitido (-20 a 60°C)"));
    datos.temperatura = 0;
  }
  
  mostrarEstadoTemperatura(datos.temperatura);
}

ICACHE_FLASH_ATTR void mostrarEstadoTemperatura(float temperatura) {
  if (temperatura == 0) return;
  
  Serial.print(F("🎯 Estado térmico: "));
  if (temperatura < 10) {
    Serial.println(F("🟦 MUY FRÍO"));
  } else if (temperatura < 18) {
    Serial.println(F("🟨 FRESCO"));
  } else if (temperatura < 25) {
    Serial.println(F("🟩 AGRADABLE"));
  } else if (temperatura < 30) {
    Serial.println(F("🟨 CÁLIDO"));
  } else {
    Serial.println(F("🟥 MUY CALIENTE"));
  }
}

ICACHE_FLASH_ATTR void conectarWiFi() {
  Serial.println(F("\n🔗 Conectando a WiFi..."));
  Serial.print(F("📶 SSID: "));
  Serial.println(FPSTR(WIFI_SSID));
  
  WiFi.begin(FPSTR(WIFI_SSID), FPSTR(WIFI_PASSWORD));
  Serial.print(F("🔄 Conectando"));
  
  uint8_t intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500); 
    Serial.print(F("."));
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    intentos++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConectado = true;
    digitalWrite(LED_PIN, LOW);
    Serial.println(F(" ✅"));
    Serial.println(F("🌐 ¡CONECTADO AL WiFi!"));
    Serial.print(F("📍 IP asignada: "));
    Serial.println(WiFi.localIP());
    Serial.print(F("📶 Señal WiFi: "));
    Serial.print(WiFi.RSSI());
    Serial.println(F(" dBm"));
  } else {
    wifiConectado = false;
    digitalWrite(LED_PIN, HIGH);
    Serial.println(F(" ❌"));
    Serial.println(F("⚠️ SIN CONEXIÓN WiFi - Solo modo monitor"));
  }
}

float leerHumedadSuelo() {
  int humedadRaw = analogRead(SENSOR_HUMEDAD_PIN);
  float humedadPorcentaje = map(humedadRaw, 1024, 0, 0, 100);
  humedadPorcentaje = constrain(humedadPorcentaje, 0, 100);
  
  Serial.println(F("\n💧 === SENSOR DE HUMEDAD DEL SUELO ==="));
  Serial.print(F("📈 Valor RAW: "));
  Serial.print(humedadRaw);
  Serial.println(F(" (0-1024)"));
  Serial.print(F("💦 Humedad: "));
  Serial.print(humedadPorcentaje, 1);
  Serial.println(F("%"));
  
  mostrarEstadoHumedad(humedadPorcentaje);
  
  return humedadPorcentaje;
}

ICACHE_FLASH_ATTR void mostrarEstadoHumedad(float humedad) {
  Serial.print(F("🎯 Estado: "));
  if (humedad < 30) {
    Serial.println(F("🟥 MUY SECO - ¡NECESITA RIEGO!"));
  } else if (humedad < 50) {
    Serial.println(F("🟨 SECO - Considera regar pronto"));
  } else if (humedad < 70) {
    Serial.println(F("🟩 ÓPTIMO - Nivel perfecto"));
  } else {
    Serial.println(F("🟦 HÚMEDO - No necesita riego"));
  }
}

bool verificarWiFi() {
  if (wifiConectado && WiFi.status() == WL_CONNECTED) {
    return true;
  } else if (!wifiConectado) {
    Serial.println(F("⚠️ WiFi no conectado inicialmente"));
    return false;
  } else {
    Serial.println(F("❌ WiFi desconectado, reconectando..."));
    WiFi.begin(FPSTR(WIFI_SSID), FPSTR(WIFI_PASSWORD));
    digitalWrite(LED_PIN, HIGH);
    
    delay(2000);
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println(F("✅ WiFi reconectado!"));
      wifiConectado = true;
      digitalWrite(LED_PIN, LOW);
      return true;
    }
    return false;
  }
}

// ⭐ FUNCIÓN PRINCIPAL - ENVIAR DATOS SEGÚN SCHEMA SensorReadingCreate
ICACHE_FLASH_ATTR void enviarDatosAPI(DatosSensores datos) {
  Serial.println(F("\n📡 === ENVIANDO DATOS A LA API ==="));
  
  WiFiClient client;
  HTTPClient http;
  
  http.begin(client, FPSTR(SERVER_URL));
  http.addHeader(F("Content-Type"), F("application/json"));
  http.setTimeout(5000);
  
  // Crear JSON según schema SensorReadingCreate de Pydantic
  // Campos obligatorios: device_id, valor
  // Campos opcionales: temperatura, luz, humedad_ambiente, battery_level, signal_strength
  
  if (bmpConectado && datos.temperatura > 0) {
    // Con temperatura del BMP180
    snprintf_P(jsonBuffer, sizeof(jsonBuffer), 
      PSTR("{"
        "\"device_id\":%d,"
        "\"valor\":%.2f,"
        "\"temperatura\":%.1f,"
        "\"signal_strength\":%d"
      "}"),
      datos.device_id,
      datos.valor,
      datos.temperatura,
      datos.signal_strength
    );
  } else {
    // Solo campos obligatorios + señal
    snprintf_P(jsonBuffer, sizeof(jsonBuffer), 
      PSTR("{"
        "\"device_id\":%d,"
        "\"valor\":%.2f,"
        "\"signal_strength\":%d"
      "}"),
      datos.device_id,
      datos.valor,
      datos.signal_strength
    );
  }
  
  Serial.println(F("📤 JSON a enviar (Schema: SensorReadingCreate):"));
  Serial.println(jsonBuffer);
  Serial.println(F("🔑 Validaciones aplicadas:"));
  Serial.println(F("   ✓ device_id: int"));
  Serial.println(F("   ✓ valor: 0-100% (ge=0, le=100)"));
  if (bmpConectado && datos.temperatura > 0) {
    Serial.println(F("   ✓ temperatura: -20 a 60°C (ge=-20, le=60)"));
  }
  Serial.println(F("   ✓ signal_strength: -100 a 0 dBm (ge=-100, le=0)"));
  
  Serial.print(F("🌐 Enviando a: "));
  Serial.println(FPSTR(SERVER_URL));

  int httpResponseCode = http.POST(jsonBuffer);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println(F("✅ ¡DATOS ENVIADOS EXITOSAMENTE!"));
    Serial.print(F("📊 HTTP Status Code: "));
    Serial.println(httpResponseCode);
    Serial.println(F("💬 Respuesta de la API:"));
    Serial.println(response);
    
    if (httpResponseCode == 200 || httpResponseCode == 201) {
      Serial.println(F("✨ Estado: Datos guardados en la base de datos"));
      Serial.println(F("📈 Schema SensorReadingResponse recibido"));
    }
    
    // Parpadear LED para confirmar envío exitoso
    for(uint8_t i = 0; i < 3; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      delay(100);
    }
    
  } else {
    Serial.println(F("❌ ERROR AL ENVIAR DATOS!"));
    Serial.print(F("🔴 HTTP Error Code: "));
    Serial.println(httpResponseCode);
    
    Serial.println(F("\n💡 Diagnóstico de errores:"));
    if (httpResponseCode == -1) {
      Serial.println(F("   ⚠️ Error de conexión - Verifica que la API esté corriendo"));
    } else if (httpResponseCode == 404) {
      Serial.println(F("   🔍 Error 404: Endpoint no encontrado"));
      Serial.println(F("   📝 Verifica que el endpoint sea /api/lecturas"));
    } else if (httpResponseCode == 422) {
      Serial.println(F("   📝 Error 422: Datos inválidos (ValidationError)"));
      Serial.println(F("   🔍 Pydantic rechazó el schema"));
      Serial.println(F("   - Verifica que device_id exista en la BD"));
      Serial.println(F("   - Verifica rangos: valor(0-100), temp(-20 a 60)"));
    } else if (httpResponseCode == 500) {
      Serial.println(F("   💥 Error 500: Error interno del servidor"));
      Serial.println(F("   🔍 Revisa los logs de FastAPI"));
    }
    
    Serial.println(F("\n🔧 Verifica:"));
    Serial.print(F("   1. API corriendo en: "));
    Serial.println(FPSTR(SERVER_URL));
    Serial.print(F("   2. Device ID existe en BD: "));
    Serial.println(DEVICE_ID);
    Serial.println(F("   3. Base de datos conectada"));
    Serial.println(F("   4. Schema de Pydantic compatible"));
    
    digitalWrite(LED_PIN, HIGH);
    delay(500);
    digitalWrite(LED_PIN, LOW);
  }
  
  http.end();
}

ICACHE_FLASH_ATTR void mostrarResumen(DatosSensores datos) {
  Serial.print(F("\n📋 === RESUMEN LECTURA #"));
  Serial.print(contadorLecturas);
  Serial.println(F(" ==="));
  Serial.println(F("📦 Datos según Schema SensorReadingCreate:"));
  
  // Campos obligatorios
  Serial.println(F("\n🔸 CAMPOS OBLIGATORIOS:"));
  Serial.print(F("   🆔 device_id: "));
  Serial.println(datos.device_id);
  
  Serial.print(F("   💧 valor (humedad suelo): "));
  Serial.print(datos.valor, 2);
  Serial.print(F("% "));
  if (datos.valor < 30) Serial.println(F("🟥"));
  else if (datos.valor < 50) Serial.println(F("🟨"));
  else if (datos.valor < 70) Serial.println(F("🟩"));
  else Serial.println(F("🟦"));
  
  // Campos opcionales
  Serial.println(F("\n🔹 CAMPOS OPCIONALES:"));
  
  if (bmpConectado && datos.temperatura > 0) {
    Serial.print(F("   🌡️ temperatura: "));
    Serial.print(datos.temperatura, 1);
    Serial.print(F("°C "));
    if (datos.temperatura < 18) Serial.println(F("🟦"));
    else if (datos.temperatura < 25) Serial.println(F("🟩"));
    else if (datos.temperatura < 30) Serial.println(F("🟨"));
    else Serial.println(F("🟥"));
  } else {
    Serial.println(F("   🌡️ temperatura: null (BMP180 no disponible)"));
  }
  
  Serial.print(F("   💡 luz: "));
  Serial.print(datos.luz, 0);
  Serial.println(F(" lux (no implementado)"));
  
  Serial.print(F("   💨 humedad_ambiente: "));
  Serial.print(datos.humedad_ambiente, 1);
  Serial.println(F("% (no implementado)"));
  
  Serial.print(F("   🔋 battery_level: "));
  Serial.print(datos.battery_level, 1);
  Serial.println(F("% (no implementado)"));
  
  Serial.print(F("   📶 signal_strength: "));
  Serial.print(datos.signal_strength);
  Serial.print(F(" dBm "));
  if (datos.signal_strength > -50) Serial.println(F("🟩"));
  else if (datos.signal_strength > -70) Serial.println(F("🟨"));
  else Serial.println(F("🟥"));
  
  // Estados de conexión
  Serial.println(F("\n🔌 Estado de conexiones:"));
  Serial.print(F("   📡 WiFi: "));
  Serial.println(WiFi.status() == WL_CONNECTED ? F("✅ Conectado") : F("❌ Desconectado"));
  Serial.print(F("   🌡️ BMP180: "));
  Serial.println(bmpConectado ? F("✅ Conectado") : F("❌ Desconectado"));
  
  Serial.println(F("============================================================"));
  Serial.print(F("⏳ Esperando "));
  Serial.print(INTERVALO_LECTURA/1000);
  Serial.println(F(" segundos para la próxima lectura..."));
  Serial.println(F("============================================================"));
}