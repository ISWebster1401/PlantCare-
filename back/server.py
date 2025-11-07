from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import socket
from datetime import datetime
from collections import deque

# Almacenamiento en memoria (sin MySQL)
LECTURAS = deque(maxlen=200)  # guarda las últimas 200 lecturas

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

            # Guardar en memoria (sin base de datos)
            now = datetime.now()
            LECTURAS.append({
                "id": len(LECTURAS) + 1,
                "valor": humedad,
                "fecha": now.strftime("%Y-%m-%d %H:%M:%S")
            })

            self.send_response(201)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {'mensaje': 'Dato recibido', 'humedad': humedad}
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
            # Log colorido
            nivel = "🟥 MUY SECO" if humedad < 30 else "🟨 SECO" if humedad < 50 else "🟩 ÓPTIMO" if humedad < 70 else "🟦 HÚMEDO"
            print(f"📊 Humedad recibida: {humedad}% | {nivel}")

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
                # Devolver últimas lecturas en memoria
                resultados = list(LECTURAS)[-50:][::-1]

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(resultados).encode('utf-8'))
                print(f"📤 Enviados {len(resultados)} registros al dashboard")

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
    # Cambiar puerto a 5001 para no conflictar con FastAPI (puerto 5000)
    run(port=5001)