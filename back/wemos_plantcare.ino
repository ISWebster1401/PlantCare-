#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// Configuración WiFi
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";

// Configuración del servidor
const char* serverURL = "http://192.168.1.100:5000/api"; // Cambia por tu IP del backend
const char* deviceKey = "ABC-1234"; // Código de tu dispositivo registrado en la DB

// Configuración de sensores
#define DHT_PIN D4
#define DHT_TYPE DHT22
#define SOIL_MOISTURE_PIN A0
#define LIGHT_SENSOR_PIN D6
#define TEMP_SENSOR_PIN D5

DHT dht(DHT_PIN, DHT_TYPE);

// Variables globales
WiFiClient wifiClient;
HTTPClient http;
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_INTERVAL = 30000; // 30 segundos entre lecturas

// Estructura para datos de sensores
struct SensorData {
  float humidity;           // Humedad del aire (DHT22)
  float temperature;        // Temperatura (DHT22)
  float soilMoisture;       // Humedad del suelo (0-100%)
  float lightLevel;         // Nivel de luz (0-100%)
  float batteryLevel;       // Nivel de batería (opcional)
  int signalStrength;       // Fuerza de señal WiFi
};

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n🌱 PlantCare - Wemos D1 Mini Sensor Node");
  Serial.println("==========================================");
  
  // Inicializar sensores
  dht.begin();
  pinMode(LIGHT_SENSOR_PIN, INPUT);
  
  // Conectar a WiFi
  connectToWiFi();
  
  Serial.println("✅ Sistema inicializado correctamente");
  Serial.println("📡 Enviando datos cada 30 segundos...\n");
}

void loop() {
  // Verificar conexión WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi desconectado. Reconectando...");
    connectToWiFi();
  }
  
  // Leer sensores cada 30 segundos
  if (millis() - lastSensorRead >= SENSOR_INTERVAL) {
    SensorData data = readSensors();
    sendDataToBackend(data);
    lastSensorRead = millis();
  }
  
  delay(1000); // Pequeña pausa para no saturar el loop
}

void connectToWiFi() {
  Serial.print("🔌 Conectando a WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi conectado!");
    Serial.print("📍 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("📶 Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n❌ Error: No se pudo conectar a WiFi");
    Serial.println("🔄 Reiniciando en 10 segundos...");
    delay(10000);
    ESP.restart();
  }
}

SensorData readSensors() {
  SensorData data;
  
  // Leer DHT22 (humedad y temperatura del aire)
  data.humidity = dht.readHumidity();
  data.temperature = dht.readTemperature();
  
  // Leer humedad del suelo (sensor analógico)
  int soilRaw = analogRead(SOIL_MOISTURE_PIN);
  data.soilMoisture = map(soilRaw, 1024, 0, 0, 100); // Invertir y mapear a 0-100%
  data.soilMoisture = constrain(data.soilMoisture, 0, 100);
  
  // Leer sensor de luz (LDR o similar)
  int lightRaw = digitalRead(LIGHT_SENSOR_PIN);
  data.lightLevel = lightRaw * 100; // Simplificado, ajusta según tu sensor
  
  // Obtener fuerza de señal WiFi
  data.signalStrength = WiFi.RSSI();
  
  // Nivel de batería (opcional, si usas batería)
  data.batteryLevel = 100.0; // Placeholder
  
  // Validar lecturas del DHT22
  if (isnan(data.humidity) || isnan(data.temperature)) {
    Serial.println("⚠️  Error leyendo DHT22, usando valores por defecto");
    data.humidity = 50.0;
    data.temperature = 25.0;
  }
  
  // Debug: Mostrar lecturas
  Serial.println("📊 Lecturas de sensores:");
  Serial.printf("   🌡️  Temperatura: %.1f°C\n", data.temperature);
  Serial.printf("   💨 Humedad aire: %.1f%%\n", data.humidity);
  Serial.printf("   💧 Humedad suelo: %.1f%%\n", data.soilMoisture);
  Serial.printf("   ☀️  Luz: %.1f%%\n", data.lightLevel);
  Serial.printf("   📶 Señal: %d dBm\n", data.signalStrength);
  
  return data;
}

void sendDataToBackend(SensorData data) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi no conectado, no se puede enviar datos");
    return;
  }
  
  http.begin(wifiClient, String(serverURL) + "/humedad");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", deviceKey);
  
  // Crear JSON con los datos
  DynamicJsonDocument doc(512);
  doc["humedad"] = data.soilMoisture;
  doc["temperatura"] = data.temperature;
  doc["humedad_aire"] = data.humidity;
  doc["luz"] = data.lightLevel;
  doc["bateria"] = data.batteryLevel;
  doc["senal"] = data.signalStrength;
  doc["timestamp"] = WiFi.getTime();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("📤 Enviando datos al backend...");
  Serial.println("JSON: " + jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("✅ Respuesta del servidor (%d): %s\n", httpResponseCode, response.c_str());
    
    if (httpResponseCode == 200 || httpResponseCode == 201) {
      Serial.println("✅ Datos enviados correctamente");
    } else {
      Serial.printf("⚠️  Respuesta inesperada del servidor: %d\n", httpResponseCode);
    }
  } else {
    Serial.printf("❌ Error enviando datos: %d\n", httpResponseCode);
    Serial.println("🔍 Verificar:");
    Serial.println("   - Conexión WiFi");
    Serial.println("   - URL del servidor");
    Serial.println("   - Código de dispositivo registrado");
  }
  
  http.end();
  Serial.println("---");
}

// Función para obtener información del sistema
void printSystemInfo() {
  Serial.println("\n🔧 Información del sistema:");
  Serial.printf("   Chip ID: %08X\n", ESP.getChipId());
  Serial.printf("   Flash Size: %d bytes\n", ESP.getFlashChipSize());
  Serial.printf("   Free Heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("   Uptime: %lu ms\n", millis());
  Serial.println();
}
