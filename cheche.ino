/* Busquen estas bibliotecas en el library manager del IDE de arduino, la base de
   la placa Wemos es el microcontrolador ESP8266 */
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

// Configuración de WiFi y dispositivo - Actualizar con tus valores
const char* ssidWifi = "NOMBRE_RED_WIFI";
const char* passwordWifi = "CONTRASEÑA_RED_WIFI";
const char* deviceKey = "TU_CLAVE_DE_DISPOSITIVO";

// Reemplaza con la IP de tu computadora en la red local
const char* serverUrl = "http://192.168.1.X:5000/api/sensor-humedad-suelo";

const int sensorPin = A0;

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssidWifi, passwordWifi);

  Serial.print("Conectando a WiFi...");
  /* Conecta al WIFI de la casa. */
  while (WiFi.status() != WL_CONNECTED) {
    /* intenta cada medio segundo */
    delay(500); 
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("Conectado al WiFi");
}

void loop() {
  int humedad = analogRead(sensorPin);
  /* Dibuja los datos en el Serial */
  Serial.print("Humedad: ");
  Serial.println(humedad);

  /* Si ya se realizo la conexión al wifi */
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    /* Conecta a la API */
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Key", deviceKey);

    // Crear el JSON con los datos
    StaticJsonDocument<200> doc;
    doc["humedad"] = humedad;
    
    String postData;
    serializeJson(doc, postData);

    /* Adjunto los datos via POST */
    int httpResponseCode = http.POST(postData);

    if (httpResponseCode > 0) {
      /* Si la información se guarda bien en la DB entonces lee el json o x-www de respuesta de éxito en el serial de arduino.*/
      String response = http.getString();
      Serial.print("Respuesta del servidor: ");
      Serial.println(response);
    } else {
      /* Si no pudo guardar los dato en la DB entonces responde la API con error que se interpreta en el serial de arduino */
      Serial.print("Error en POST, código: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("WiFi no conectado");
  }

  /* Espera 10 segundos antes de enviar la información al servidor nuevamente.
     Cambien este valor si quieren que la información se envie en menos tiempo.
  */ 
  delay(10000); 
}