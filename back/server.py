from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import mysql.connector
import socket
import os
from datetime import datetime

# Configuración de la base de datos
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'admin123',  # Cambia por tu contraseña de MySQL
    'database': 'sensor_datos'  # Cambié el nombre para ser más general
}

def get_local_ip():
    """Obtener la IP local de la máquina"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def create_database_and_table():
    """Crear base de datos y tabla si no existen"""
    try:
        # Conectar sin especificar base de datos
        temp_config = DB_CONFIG.copy()
        temp_config.pop('database')
        
        conn = mysql.connector.connect(**temp_config)
        cursor = conn.cursor()
        
        # Crear base de datos si no existe
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']}")
        cursor.close()
        conn.close()
        
        # Conectar a la base de datos específica
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Crear tabla actualizada con todos los campos
        create_table_query = """
        CREATE TABLE IF NOT EXISTS sensor_datos_completos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            humedad DECIMAL(5,2) NOT NULL,
            temperatura DECIMAL(5,2) DEFAULT NULL,
            presion DECIMAL(7,2) DEFAULT NULL,
            altitud DECIMAL(7,2) DEFAULT NULL,
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_fecha (fecha)
        ) ENGINE=InnoDB
        """
        cursor.execute(create_table_query)
        
        cursor.close()
        conn.close()
        print("✅ Base de datos y tabla creadas/verificadas correctamente")
        return True
    except Exception as e:
        print(f"❌ Error creando base de datos: {e}")
        return False

def test_database_connection():
    """Probar la conexión a la base de datos"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM sensor_datos_completos")
        count = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        print(f"✅ Base de datos conectada correctamente ({count} registros)")
        return True
    except mysql.connector.Error as e:
        print(f"❌ Error de conexión a MySQL: {e}")
        print("💡 Intentando crear base de datos...")
        return create_database_and_table()
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False

class SensorHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        """Personalizar los logs del servidor"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {format % args}")

    def do_POST(self):
        if self.path != "/sensor-humedad-suelo":
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {'error': 'Ruta no encontrada'}
            self.wfile.write(json.dumps(response).encode('utf-8'))
            return

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            data = json.loads(post_data)
            
            # Validar y extraer humedad (obligatorio)
            humedad_raw = data.get('humedad')
            if humedad_raw is None:
                raise ValueError("Campo 'humedad' faltante")
            humedad = float(humedad_raw)
            
            if humedad < 0 or humedad > 100:
                raise ValueError(f"Valor de humedad fuera de rango: {humedad}%")

            # Extraer datos opcionales del BMP180
            temperatura = data.get('temperatura')
            presion = data.get('presion')
            altitud = data.get('altitud')
            
            # Convertir a float si existen, sino None
            temperatura = float(temperatura) if temperatura is not None else None
            presion = float(presion) if presion is not None else None
            altitud = float(altitud) if altitud is not None else None

            # Insertar en base de datos
            conn = mysql.connector.connect(**DB_CONFIG)
            cursor = conn.cursor()
            
            insert_query = """
                INSERT INTO sensor_datos_completos 
                (humedad, temperatura, presion, altitud) 
                VALUES (%s, %s, %s, %s)
            """
            cursor.execute(insert_query, (humedad, temperatura, presion, altitud))
            conn.commit()
            cursor.close()
            conn.close()

            # Respuesta exitosa
            self.send_response(201)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response_data = {
                'mensaje': 'Datos guardados correctamente',
                'humedad': humedad
            }
            
            # Agregar datos BMP180 a la respuesta si están disponibles
            if temperatura is not None:
                response_data['temperatura'] = temperatura
            if presion is not None:
                response_data['presion'] = presion
            if altitud is not None:
                response_data['altitud'] = altitud
                
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
            # Log detallado y colorido
            print("=" * 80)
            print("📊 NUEVOS DATOS RECIBIDOS")
            print("=" * 80)
            
            # Humedad del suelo
            nivel_humedad = ("🟥 MUY SECO" if humedad < 30 else 
                           "🟨 SECO" if humedad < 50 else 
                           "🟩 ÓPTIMO" if humedad < 70 else 
                           "🟦 HÚMEDO")
            print(f"💧 Humedad del suelo: {humedad}% | {nivel_humedad}")
            
            # Datos BMP180 si están disponibles
            if temperatura is not None:
                estado_temp = ("🟦 MUY FRÍO" if temperatura < 10 else
                             "🟨 FRESCO" if temperatura < 18 else
                             "🟩 AGRADABLE" if temperatura < 25 else
                             "🟨 CÁLIDO" if temperatura < 30 else
                             "🟥 MUY CALIENTE")
                print(f"🌡️ Temperatura: {temperatura}°C | {estado_temp}")
            
            if presion is not None:
                estado_presion = ("🔻 BAJA" if presion < 1000 else
                                "🟩 NORMAL" if presion < 1020 else
                                "🔺 ALTA")
                print(f"🔽 Presión atmosférica: {presion} hPa | {estado_presion}")
                
            if altitud is not None:
                print(f"🏔️ Altitud: {altitud} metros")
            
            # Resumen
            sensores_activos = 1  # Humedad siempre activa
            if temperatura is not None: sensores_activos += 1
            if presion is not None: sensores_activos += 1
            if altitud is not None: sensores_activos += 1
            
            print(f"🎯 Sensores activos: {sensores_activos}/4")
            print(f"⏰ Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print("=" * 80)

        except mysql.connector.Error as db_error:
            print(f"❌ Error de base de datos: {db_error}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {'error': f'Error de base de datos: {str(db_error)}'}
            self.wfile.write(json.dumps(response).encode('utf-8'))

        except Exception as e:
            print(f"❌ Error en POST: {e}")
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {'error': str(e)}
            self.wfile.write(json.dumps(response).encode('utf-8'))

    def do_GET(self):
        if self.path == "/api/datos-sensores":
            try:
                conn = mysql.connector.connect(**DB_CONFIG)
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, humedad, temperatura, presion, altitud, fecha 
                    FROM sensor_datos_completos 
                    ORDER BY fecha DESC 
                    LIMIT 100
                """)
                datos = cursor.fetchall()
                cursor.close()
                conn.close()

                resultados = []
                for r in datos:
                    registro = {
                        "id": r[0], 
                        "humedad": float(r[1]), 
                        "fecha": r[5].strftime("%Y-%m-%d %H:%M:%S")
                    }
                    
                    # Agregar datos BMP180 solo si no son None
                    if r[2] is not None:  # temperatura
                        registro["temperatura"] = float(r[2])
                    if r[3] is not None:  # presion
                        registro["presion"] = float(r[3])
                    if r[4] is not None:  # altitud
                        registro["altitud"] = float(r[4])
                    
                    resultados.append(registro)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(resultados).encode('utf-8'))
                print(f"📤 Enviados {len(resultados)} registros completos al dashboard")

            except mysql.connector.Error as db_error:
                print(f"❌ Error de base de datos en GET: {db_error}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                response = {'error': f'Error de base de datos: {str(db_error)}'}
                self.wfile.write(json.dumps(response).encode('utf-8'))

            except Exception as e:
                print(f"❌ Error en GET: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                response = {'error': str(e)}
                self.wfile.write(json.dumps(response).encode('utf-8'))

        elif self.path == "/api/estadisticas":
            # Nuevo endpoint para estadísticas
            try:
                conn = mysql.connector.connect(**DB_CONFIG)
                cursor = conn.cursor()
                
                # Estadísticas de las últimas 24 horas
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total_registros,
                        AVG(humedad) as humedad_promedio,
                        MIN(humedad) as humedad_minima,
                        MAX(humedad) as humedad_maxima,
                        AVG(temperatura) as temperatura_promedio,
                        MIN(temperatura) as temperatura_minima,
                        MAX(temperatura) as temperatura_maxima,
                        AVG(presion) as presion_promedio
                    FROM sensor_datos_completos 
                    WHERE fecha >= NOW() - INTERVAL 24 HOUR
                """)
                stats = cursor.fetchone()
                cursor.close()
                conn.close()

                estadisticas = {
                    "total_registros": stats[0],
                    "humedad": {
                        "promedio": round(float(stats[1]) if stats[1] else 0, 1),
                        "minima": round(float(stats[2]) if stats[2] else 0, 1),
                        "maxima": round(float(stats[3]) if stats[3] else 0, 1)
                    },
                    "temperatura": {
                        "promedio": round(float(stats[4]) if stats[4] else 0, 1),
                        "minima": round(float(stats[5]) if stats[5] else 0, 1),
                        "maxima": round(float(stats[6]) if stats[6] else 0, 1)
                    } if stats[4] is not None else None,
                    "presion": {
                        "promedio": round(float(stats[7]) if stats[7] else 0, 1)
                    } if stats[7] is not None else None,
                    "periodo": "últimas 24 horas"
                }

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(estadisticas).encode('utf-8'))

            except Exception as e:
                print(f"❌ Error en estadísticas: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                response = {'error': str(e)}
                self.wfile.write(json.dumps(response).encode('utf-8'))

        elif self.path == "/test":
            # Endpoint de prueba
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = {
                'mensaje': 'Servidor funcionando correctamente',
                'version': '2.0 - Multi-sensor',
                'sensores_soportados': ['humedad_suelo', 'temperatura_BMP180', 'presion_BMP180', 'altitud_BMP180'],
                'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                'ip': get_local_ip()
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))

        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = {'error': 'Ruta no encontrada'}
            self.wfile.write(json.dumps(response).encode('utf-8'))

    def do_OPTIONS(self):
        """Manejar solicitudes preflight de CORS"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def run(server_class=HTTPServer, handler_class=SensorHandler, port=5000):
    local_ip = get_local_ip()
    
    print("=" * 80)
    print("🌱 SERVIDOR MULTI-SENSOR v2.0")
    print("💧 Humedad del Suelo + 🌡️ BMP180 (Temperatura/Presión/Altitud)")
    print("=" * 80)
    
    # Probar conexión a base de datos antes de iniciar servidor
    if not test_database_connection():
        print("❌ No se puede iniciar el servidor sin conexión a la base de datos")
        return
    
    try:
        server_address = ('', port)
        httpd = server_class(server_address, handler_class)
        
        print(f"🌐 Servidor HTTP corriendo en: http://{local_ip}:{port}")
        print(f"📊 API datos completos (GET): http://{local_ip}:{port}/api/datos-sensores") 
        print(f"📈 API estadísticas (GET): http://{local_ip}:{port}/api/estadisticas") 
        print(f"📡 Endpoint Arduino (POST): http://{local_ip}:{port}/sensor-humedad-suelo")
        print(f"🧪 Endpoint de prueba: http://{local_ip}:{port}/test")
        print("=" * 80)
        print(f"⚙️  CONFIGURA TU ESP8266 CON LA IP: {local_ip}")
        print(f"🌐 Endpoints disponibles:")
        print(f"   - Datos en vivo: /api/datos-sensores")
        print(f"   - Estadísticas: /api/estadisticas")
        print(f"   - Test: /test")
        print("=" * 80)
        print("🔄 Servidor esperando conexiones... (Ctrl+C para detener)")
        print("🎯 Sensores soportados: Humedad, Temperatura, Presión, Altitud")
        print("=" * 80)
        
        httpd.serve_forever()
        
    except KeyboardInterrupt:
        print("\n🛑 Servidor detenido por el usuario")
    except Exception as e:
        print(f"❌ Error al iniciar servidor: {e}")
    finally:
        print("👋 Cerrando servidor...")

if __name__ == "__main__":
    # Verificar dependencias
    try:
        import mysql.connector
    except ImportError:
        print("❌ Error: mysql-connector-python no está instalado")
        print("💡 Instálalo con: pip install mysql-connector-python")
        exit(1)
    
    run()