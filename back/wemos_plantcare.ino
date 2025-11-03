#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <Adafruit_BMP085.h>
#include <Wire.h>

// ==================== CONFIGURACIÓN USUARIO ====================
// WiFi
const char WIFI_SSID[] PROGMEM = "CPM";
const char WIFI_PASSWORD[] PROGMEM = "EPDPM2025";

// API - ACTUALIZA CON LA IP DE TU SERVIDOR PYTHON
const char SERVER_URL[] PROGMEM = "http://192.168.103.209:5000/sensor-humedad-suelo";  // ⚠️ ENDPOINT CORRECTO

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

// Buffer para JSON
char jsonBuffer[256];

// Estructura para almacenar datos
struct DatosSensores {
  float humedad;           // Humedad del suelo (obligatorio)
  float temperatura;       // Temperatura BMP180 (opcional)
  float presion;           // Presión atmosférica BMP180 (opcional)
  float altitud;           // Altitud BMP180 (opcional)
};

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);
  
  delay(2000);
  
  Serial.println(F("\n============================================================"));
  Serial.println(F("🌱 MONITOR AMBIENTAL - ESP8266 + SERVIDOR PYTHON"));
  Serial.println(F("💧 Sensores: Humedad del Suelo + BMP180"));
  Serial.print(F("📡 Servidor Python: "));
  Serial.println(FPSTR(SERVER_URL));
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
    
    // Leer todos los sensores
    datos.humedad = leerHumedadSuelo();
    leerDatosBMP180(datos);
    
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
    Serial.println(F("📊 Sensores disponibles: Temperatura, Presión, Altitud"));
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
    datos.temperatura = 0;
    datos.presion = 0;
    datos.altitud = 0;
    return;
  }
  
  Serial.println(F("\n🌡️ === SENSOR BMP180 ==="));
  
  // Leer temperatura
  datos.temperatura = bmp.readTemperature();
  Serial.print(F("🌡️ Temperatura: "));
  Serial.print(datos.temperatura, 1);
  Serial.println(F("°C"));
  mostrarEstadoTemperatura(datos.temperatura);
  
  // Leer presión
  datos.presion = bmp.readPressure() / 100.0F;  // Convertir a hPa
  Serial.print(F("🔽 Presión: "));
  Serial.print(datos.presion, 2);
  Serial.println(F(" hPa"));
  mostrarEstadoPresion(datos.presion);
  
  // Calcular altitud
  datos.altitud = bmp.readAltitude();
  Serial.print(F("🏔️ Altitud: "));
  Serial.print(datos.altitud, 1);
  Serial.println(F(" metros"));
}

ICACHE_FLASH_ATTR void mostrarEstadoTemperatura(float temperatura) {
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

ICACHE_FLASH_ATTR void mostrarEstadoPresion(float presion) {
  Serial.print(F("🎯 Estado presión: "));
  if (presion < 1000) {
    Serial.println(F("🔻 BAJA"));
  } else if (presion < 1020) {
    Serial.println(F("🟩 NORMAL"));
  } else {
    Serial.println(F("🔺 ALTA"));
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

// ⭐ FUNCIÓN PRINCIPAL - ENVIAR DATOS AL SERVIDOR PYTHON
ICACHE_FLASH_ATTR void enviarDatosAPI(DatosSensores datos) {
  Serial.println(F("\n📡 === ENVIANDO DATOS AL SERVIDOR PYTHON ==="));
  
  WiFiClient client;
  HTTPClient http;
  
  http.begin(client, FPSTR(SERVER_URL));
  http.addHeader(F("Content-Type"), F("application/json"));
  http.setTimeout(5000);
  
  // Crear JSON según el formato esperado por el servidor Python
  // El servidor espera: humedad (obligatorio), temperatura, presion, altitud (opcionales)
  
  if (bmpConectado && datos.temperatura > 0) {
    // Con todos los datos del BMP180
    snprintf_P(jsonBuffer, sizeof(jsonBuffer), 
      PSTR("{"
        "\"humedad\":%.2f,"
        "\"temperatura\":%.1f,"
        "\"presion\":%.2f,"
        "\"altitud\":%.1f"
      "}"),
      datos.humedad,
      datos.temperatura,
      datos.presion,
      datos.altitud
    );
  } else {
    // Solo humedad del suelo
    snprintf_P(jsonBuffer, sizeof(jsonBuffer), 
      PSTR("{"
        "\"humedad\":%.2f"
      "}"),
      datos.humedad
    );
  }
  
  Serial.println(F("📤 JSON a enviar:"));
  Serial.println(jsonBuffer);
  Serial.print(F("🌐 Enviando a: "));
  Serial.println(FPSTR(SERVER_URL));

  int httpResponseCode = http.POST(jsonBuffer);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println(F("✅ ¡DATOS ENVIADOS EXITOSAMENTE!"));
    Serial.print(F("📊 HTTP Status Code: "));
    Serial.println(httpResponseCode);
    Serial.println(F("💬 Respuesta del servidor:"));
    Serial.println(response);
    
    if (httpResponseCode == 201) {
      Serial.println(F("✨ Estado: Datos guardados en MySQL correctamente"));
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
      Serial.println(F("   ⚠️ Error de conexión - Verifica que el servidor Python esté corriendo"));
    } else if (httpResponseCode == 404) {
      Serial.println(F("   🔍 Error 404: Endpoint no encontrado"));
      Serial.println(F("   📝 Verifica que el endpoint sea /sensor-humedad-suelo"));
    } else if (httpResponseCode == 400) {
      Serial.println(F("   📝 Error 400: Datos inválidos"));
      Serial.println(F("   🔍 Verifica el formato JSON"));
    } else if (httpResponseCode == 500) {
      Serial.println(F("   💥 Error 500: Error en el servidor"));
      Serial.println(F("   🔍 Revisa que MySQL esté conectado"));
    }
    
    Serial.println(F("\n🔧 Verifica:"));
    Serial.print(F("   1. Servidor Python corriendo en: "));
    Serial.println(FPSTR(SERVER_URL));
    Serial.println(F("   2. MySQL conectado y base de datos creada"));
    Serial.println(F("   3. Firewall permite puerto 5000"));
    
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
  
  Serial.println(F("\n🔸 DATOS A ENVIAR:"));
  Serial.print(F("   💧 Humedad suelo: "));
  Serial.print(datos.humedad, 2);
  Serial.print(F("% "));
  if (datos.humedad < 30) Serial.println(F("🟥"));
  else if (datos.humedad < 50) Serial.println(F("🟨"));
  else if (datos.humedad < 70) Serial.println(F("🟩"));
  else Serial.println(F("🟦"));
  
  if (bmpConectado && datos.temperatura > 0) {
    Serial.print(F("   🌡️ Temperatura: "));
    Serial.print(datos.temperatura, 1);
    Serial.println(F("°C"));
    
    Serial.print(F("   🔽 Presión: "));
    Serial.print(datos.presion, 2);
    Serial.println(F(" hPa"));
    
    Serial.print(F("   🏔️ Altitud: "));
    Serial.print(datos.altitud, 1);
    Serial.println(F(" m"));
  } else {
    Serial.println(F("   🌡️ BMP180: No disponible"));
  }
  
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