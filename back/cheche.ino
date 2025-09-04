#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <Adafruit_BMP085.h>
#include <Wire.h>

// Configuración WiFi - PROGMEM para ahorrar IRAM
const char WIFI_SSID[] PROGMEM = "CPM";
const char WIFI_PASSWORD[] PROGMEM = "EPDPM2025";
const char SERVER_URL[] PROGMEM = "http://192.168.101.208:5000/sensor-humedad-suelo";

// Pines
const int SENSOR_HUMEDAD_PIN = A0;
const int LED_PIN = 2;
// BMP180 usa pines I2C: SDA=D2(GPIO4), SCL=D1(GPIO5) por defecto en ESP8266

// Objeto BMP180
Adafruit_BMP085 bmp;

// Variables optimizadas
bool wifiConectado = false;
bool bmpConectado = false;
unsigned long ultimaLectura = 0;
const unsigned long INTERVALO_LECTURA = 10000; // 10 segundos
uint16_t contadorLecturas = 0;

// Buffer ampliado para JSON con datos adicionales del BMP180
char jsonBuffer[300];

// Estructura para almacenar datos de sensores
struct DatosSensores {
  float humedad;
  float temperatura;
  float presion;
  float altitud;
};

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);
  
  delay(2000);
  
  Serial.println(F("\n============================================================"));
  Serial.println(F("🌱 MONITOR AMBIENTAL - ESP8266"));
  Serial.println(F("💧 Sensores: Humedad del Suelo + BMP180 (Temp/Presión)"));
  Serial.print(F("📡 Servidor: "));
  Serial.println(FPSTR(SERVER_URL));
  Serial.println(F("============================================================"));
  
  // Inicializar I2C para BMP180
  Wire.begin();
  
  // Inicializar BMP180
  inicializarBMP180();
  
  // Conectar WiFi
  conectarWiFi();
  
  Serial.println(F("============================================================"));
  Serial.println(F("🚀 SISTEMA INICIADO - Leyendo cada 10 segundos"));
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
    
    // Enviar datos
    if (verificarWiFi()) {
      enviarDatosServidor(datos);
    }
    
    ultimaLectura = millis();
  }
  
  delay(100); // Pequeña pausa para no saturar el CPU
}

// Nueva función para inicializar BMP180
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

// Nueva función para leer datos del BMP180
void leerDatosBMP180(DatosSensores &datos) {
  if (!bmpConectado) {
    Serial.println(F("\n⚠️ BMP180 no disponible - Saltando lectura"));
    datos.temperatura = -999;
    datos.presion = -999;
    datos.altitud = -999;
    return;
  }
  
  Serial.println(F("\n🌡️ === SENSOR BMP180 ==="));
  
  // Leer temperatura
  datos.temperatura = bmp.readTemperature();
  Serial.print(F("🌡️ Temperatura: "));
  Serial.print(datos.temperatura, 1);
  Serial.println(F("°C"));
  
  // Leer presión
  datos.presion = bmp.readPressure() / 100.0F; // Convertir a hPa
  Serial.print(F("🔽 Presión: "));
  Serial.print(datos.presion, 1);
  Serial.println(F(" hPa"));
  
  // Calcular altitud (asumiendo presión al nivel del mar de 1013.25 hPa)
  datos.altitud = bmp.readAltitude(101325); // Presión estándar en Pa
  Serial.print(F("🏔️ Altitud: "));
  Serial.print(datos.altitud, 1);
  Serial.println(F(" metros"));
  
  // Estado de temperatura
  mostrarEstadoTemperatura(datos.temperatura);
}

// Nueva función para mostrar estado de temperatura
ICACHE_FLASH_ATTR void mostrarEstadoTemperatura(float temperatura) {
  if (temperatura == -999) return; // BMP180 no disponible
  
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

// Función para conectar WiFi - movida a Flash
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
    Serial.println(F("🎯 Datos se enviarán al servidor automáticamente"));
  } else {
    wifiConectado = false;
    digitalWrite(LED_PIN, HIGH);
    Serial.println(F(" ❌"));
    Serial.println(F("⚠️  SIN CONEXIÓN WiFi - Solo modo monitor"));
    Serial.println(F("💡 Los datos se mostrarán solo en el Monitor Serial"));
  }
}

// Función optimizada para leer humedad
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
  
  // Estado visual
  mostrarEstadoHumedad(humedadPorcentaje);
  
  return humedadPorcentaje;
}

// Función optimizada para mostrar estado de humedad - en Flash
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

// Función para verificar WiFi
bool verificarWiFi() {
  if (wifiConectado && WiFi.status() == WL_CONNECTED) {
    return true;
  } else if (!wifiConectado) {
    Serial.println(F("⚠️  WiFi no conectado inicialmente"));
    return false;
  } else {
    Serial.println(F("❌ WiFi desconectado, intentando reconectar..."));
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

// Función optimizada para enviar datos completos - en Flash
ICACHE_FLASH_ATTR void enviarDatosServidor(DatosSensores datos) {
  Serial.println(F("\n📡 === COMUNICACIÓN CON SERVIDOR ==="));
  
  WiFiClient client;
  HTTPClient http;
  
  http.begin(client, FPSTR(SERVER_URL));
  http.addHeader(F("Content-Type"), F("application/json"));
  http.setTimeout(5000);
  
  // Crear JSON completo con todos los sensores
  if (bmpConectado && datos.temperatura != -999) {
    snprintf_P(jsonBuffer, sizeof(jsonBuffer), 
      PSTR("{\"humedad\":%.1f,\"temperatura\":%.1f,\"presion\":%.1f,\"altitud\":%.1f}"),
      datos.humedad, datos.temperatura, datos.presion, datos.altitud);
  } else {
    // Solo humedad si BMP180 no está disponible
    snprintf_P(jsonBuffer, sizeof(jsonBuffer), 
      PSTR("{\"humedad\":%.1f}"),
      datos.humedad);
  }
  
  Serial.println(F("📤 Enviando JSON:"));
  Serial.println(jsonBuffer);
  Serial.print(F("🌐 Conectando al servidor... "));

  int httpResponseCode = http.POST(jsonBuffer);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println(F("✅ ÉXITO!"));
    Serial.print(F("📊 Código de respuesta: "));
    Serial.println(httpResponseCode);
    Serial.println(F("💬 Respuesta del servidor:"));
    Serial.println(response);
    
    // Parpadear LED para confirmar envío exitoso
    for(uint8_t i = 0; i < 3; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      delay(100);
    }
    
  } else {
    Serial.println(F("❌ ERROR!"));
    Serial.print(F("🔴 Código de error: "));
    Serial.println(httpResponseCode);
    Serial.println(F("💡 Posibles causas:"));
    Serial.println(F("   - Servidor no está corriendo"));
    Serial.print(F("   - IP incorrecta ("));
    Serial.print(FPSTR(SERVER_URL));
    Serial.println(F(")"));
    Serial.println(F("   - Problema de red"));
    
    digitalWrite(LED_PIN, HIGH);
    delay(500);
    digitalWrite(LED_PIN, LOW);
  }
  
  http.end();
}

// Función actualizada para mostrar resumen completo - en Flash
ICACHE_FLASH_ATTR void mostrarResumen(DatosSensores datos) {
  Serial.print(F("\n📋 === RESUMEN LECTURA #"));
  Serial.print(contadorLecturas);
  Serial.println(F(" ==="));
  
  // Humedad del suelo
  Serial.print(F("💧 Humedad del suelo: "));
  Serial.print(datos.humedad, 1);
  Serial.print(F("% "));
  if (datos.humedad < 30) Serial.println(F("🟥"));
  else if (datos.humedad < 50) Serial.println(F("🟨"));
  else if (datos.humedad < 70) Serial.println(F("🟩"));
  else Serial.println(F("🟦"));
  
  // Datos BMP180 si están disponibles
  if (bmpConectado && datos.temperatura != -999) {
    Serial.print(F("🌡️ Temperatura: "));
    Serial.print(datos.temperatura, 1);
    Serial.print(F("°C "));
    if (datos.temperatura < 18) Serial.println(F("🟦"));
    else if (datos.temperatura < 25) Serial.println(F("🟩"));
    else if (datos.temperatura < 30) Serial.println(F("🟨"));
    else Serial.println(F("🟥"));
    
    Serial.print(F("🔽 Presión: "));
    Serial.print(datos.presion, 1);
    Serial.println(F(" hPa"));
    
    Serial.print(F("🏔️ Altitud: "));
    Serial.print(datos.altitud, 0);
    Serial.println(F(" m"));
  } else {
    Serial.println(F("🌡️ BMP180: ❌ No disponible"));
  }
  
  // Estados de conexión
  Serial.print(F("📡 Estado servidor: "));
  Serial.println(wifiConectado ? F("✅ Conectado") : F("❌ Desconectado"));
  Serial.print(F("🔗 Estado WiFi: "));
  Serial.println(WiFi.status() == WL_CONNECTED ? F("✅ Conectado") : F("❌ Desconectado"));
  Serial.print(F("🌡️ Estado BMP180: "));
  Serial.println(bmpConectado ? F("✅ Conectado") : F("❌ Desconectado"));
  
  Serial.println(F("============================================================"));
  Serial.print(F("⏳ Esperando "));
  Serial.print(INTERVALO_LECTURA/1000);
  Serial.println(F(" segundos para la próxima lectura..."));
  Serial.println(F("============================================================"));
}