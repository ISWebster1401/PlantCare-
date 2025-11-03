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
    'database': 'sensor_humedad'
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

def test_database_connection():
    """Probar la conexión a la base de datos"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM sensor_humedad_suelo")
        count = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        print(f"✅ Base de datos conectada correctamente ({count} registros)")
        return True
    except mysql.connector.Error as e:
        print(f"❌ Error de conexión a MySQL: {e}")
        print("💡 Soluciones:")
        print("   - Verifica que MySQL esté corriendo")
        print("   - Revisa usuario y contraseña en DB_CONFIG")
        print("   - Asegúrate que la base de datos 'sensor_humedad' exista")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False

class HumedadHandler(BaseHTTPRequestHandler):
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
            humedad_raw = data.get('humedad')
            if humedad_raw is None:
                raise ValueError("Campo 'humedad' faltante")
            humedad = float(humedad_raw)

            # Validar rango de humedad
            if humedad < 0 or humedad > 100:
                raise ValueError(f"Valor de humedad fuera de rango: {humedad}%")

            conn = mysql.connector.connect(**DB_CONFIG)
            cursor = conn.cursor()
            cursor.execute("INSERT INTO sensor_humedad_suelo (valor) VALUES (%s)", (humedad,))
            conn.commit()
            cursor.close()
            conn.close()

            self.send_response(201)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {'mensaje': 'Dato guardado correctamente', 'humedad': humedad}
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
            # Log colorido
            nivel = "🟥 MUY SECO" if humedad < 30 else "🟨 SECO" if humedad < 50 else "🟩 ÓPTIMO" if humedad < 70 else "🟦 HÚMEDO"
            print(f"📊 Humedad recibida: {humedad}% | {nivel}")

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
        if self.path == "/api/lector-humedad":
            try:
                conn = mysql.connector.connect(**DB_CONFIG)
                cursor = conn.cursor()
                cursor.execute("SELECT id, valor, fecha FROM sensor_humedad_suelo ORDER BY fecha DESC LIMIT 50")
                datos = cursor.fetchall()
                cursor.close()
                conn.close()

                resultados = []
                for r in datos:
                    resultados.append({
                        "id": r[0], 
                        "valor": float(r[1]), 
                        "fecha": r[2].strftime("%Y-%m-%d %H:%M:%S")
                    })

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(resultados).encode('utf-8'))
                print(f"📤 Enviados {len(resultados)} registros al dashboard")

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

        elif self.path == "/test":
            # Endpoint de prueba
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = {
                'mensaje': 'Servidor funcionando correctamente',
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

def run(server_class=HTTPServer, handler_class=HumedadHandler, port=5000):
    local_ip = get_local_ip()
    
    print("=" * 70)
    print("🌱 INICIANDO SERVIDOR DE HUMEDAD DEL SUELO")
    print("=" * 70)
    
    # Probar conexión a base de datos antes de iniciar servidor
    if not test_database_connection():
        print("❌ No se puede iniciar el servidor sin conexión a la base de datos")
        return
    
    try:
        server_address = ('', port)
        httpd = server_class(server_address, handler_class)
        
        print(f"🌐 Servidor HTTP corriendo en: http://{local_ip}:{port}")
        print(f"📊 API datos (GET): http://{local_ip}:{port}/api/lector-humedad") 
        print(f"📡 Endpoint Arduino (POST): http://{local_ip}:{port}/sensor-humedad-suelo")
        print(f"🧪 Endpoint de prueba: http://{local_ip}:{port}/test")
        print("=" * 70)
        print(f"⚙️  CONFIGURA TU ESP8266 CON LA IP: {local_ip}")
        print(f"🌐 Abre tu dashboard en: http://localhost:{port} o http://{local_ip}:{port}")
        print("=" * 70)
        print("🔄 Servidor esperando conexiones... (Ctrl+C para detener)")
        print("=" * 70)
        
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