#!/usr/bin/env python3
"""
Script para crear usuarios de prueba para load testing.

Crea 100 usuarios con email formato: testuser{N}@loadtest.com
Maneja respuestas "ya existe" de forma silenciosa.

Uso:
    python3 create_test_users.py [--count 100] [--base-url http://localhost:8000]
"""

import argparse
import requests
from tqdm import tqdm
from faker import Faker
import sys
import time

from config import (
    BASE_URL,
    TEST_USER_COUNT,
    TEST_USER_EMAIL_TEMPLATE,
    TEST_USER_PASSWORD,
    ENDPOINTS,
)

fake = Faker('es_ES')  # Nombres en español


def create_test_user(user_number: int, base_url: str, verbose: bool = False) -> dict:
    """
    Crea un usuario de prueba.
    
    Args:
        user_number: Número del usuario (1-100)
        base_url: URL base del backend
        verbose: Mostrar detalles de cada operación
    
    Returns:
        dict con status, detalles y tiempo de respuesta
    """
    email = TEST_USER_EMAIL_TEMPLATE.format(user_number)
    full_name = f"Test User {user_number}"
    
    payload = {
        "email": email,
        "full_name": full_name,
        "password": TEST_USER_PASSWORD,
        "confirm_password": TEST_USER_PASSWORD
    }
    
    url = f"{base_url}{ENDPOINTS['register']}"
    
    start_time = time.time()
    try:
        response = requests.post(url, json=payload, timeout=30)
        elapsed_ms = (time.time() - start_time) * 1000
        
        if response.status_code == 200 or response.status_code == 201:
            return {"status": "created", "email": email, "time_ms": elapsed_ms}
        elif response.status_code == 400:
            # Usuario ya existe - esto es OK
            response_data = response.json()
            if "already" in str(response_data).lower() or "existe" in str(response_data).lower() or "registered" in str(response_data).lower():
                return {"status": "exists", "email": email, "time_ms": elapsed_ms}
            return {"status": "error", "email": email, "detail": response_data, "time_ms": elapsed_ms}
        elif response.status_code == 422:
            # Error de validación
            return {"status": "validation_error", "email": email, "detail": response.json(), "time_ms": elapsed_ms}
        else:
            return {"status": "error", "email": email, "code": response.status_code, "detail": response.text[:200], "time_ms": elapsed_ms}
            
    except requests.exceptions.ConnectionError:
        elapsed_ms = (time.time() - start_time) * 1000
        return {"status": "connection_error", "email": email, "detail": "No se pudo conectar al servidor", "time_ms": elapsed_ms}
    except requests.exceptions.Timeout:
        elapsed_ms = (time.time() - start_time) * 1000
        return {"status": "timeout", "email": email, "time_ms": elapsed_ms}
    except Exception as e:
        elapsed_ms = (time.time() - start_time) * 1000
        return {"status": "exception", "email": email, "detail": str(e), "time_ms": elapsed_ms}


def verify_test_user_login(user_number: int, base_url: str) -> tuple:
    """
    Verifica que un usuario puede hacer login.
    
    Returns:
        tuple: (success: bool, time_ms: float)
    """
    email = TEST_USER_EMAIL_TEMPLATE.format(user_number)
    
    payload = {
        "email": email,
        "password": TEST_USER_PASSWORD
    }
    
    url = f"{base_url}{ENDPOINTS['login']}"
    
    try:
        start = time.time()
        response = requests.post(url, json=payload, timeout=10)
        elapsed = (time.time() - start) * 1000
        return response.status_code == 200, elapsed
    except:
        return False, 0


def main():
    parser = argparse.ArgumentParser(description='Crear usuarios de prueba para load testing')
    parser.add_argument('--count', type=int, default=TEST_USER_COUNT, 
                       help=f'Número de usuarios a crear (default: {TEST_USER_COUNT})')
    parser.add_argument('--base-url', type=str, default=BASE_URL,
                       help=f'URL base del backend (default: {BASE_URL})')
    parser.add_argument('--verify', action='store_true',
                       help='Verificar login de usuarios después de crearlos')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Mostrar detalles de cada operación')
    parser.add_argument('--delay', type=float, default=0.02,
                       help='Delay entre requests en segundos (default: 0.02)')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("🌱 PlantCare - Creación de Usuarios de Prueba")
    print("=" * 60)
    print(f"Backend URL: {args.base_url}")
    print(f"Usuarios a crear: {args.count}")
    print(f"Template email: {TEST_USER_EMAIL_TEMPLATE}")
    print(f"Contraseña: {TEST_USER_PASSWORD}")
    print("=" * 60)
    
    # Verificar conexión al backend
    print("\n📡 Verificando conexión al backend...")
    try:
        health_url = f"{args.base_url}/health"
        start = time.time()
        response = requests.get(health_url, timeout=5)
        latency = (time.time() - start) * 1000
        if response.status_code == 200:
            print(f"✅ Backend disponible (latencia: {latency:.0f}ms)")
        else:
            print(f"⚠️ Backend respondió con código {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: No se puede conectar al backend")
        print(f"   Verifica que el servidor esté corriendo en {args.base_url}")
        sys.exit(1)
    except Exception as e:
        print(f"⚠️ Advertencia: {str(e)}")
    
    # Crear usuarios
    print(f"\n👥 Creando {args.count} usuarios de prueba...")
    
    stats = {
        "created": 0,
        "exists": 0,
        "errors": 0,
        "connection_errors": 0,
        "times_ms": [],
        "error_details": []
    }
    
    start_total = time.time()
    
    with tqdm(total=args.count, desc="Creando usuarios", unit="user", 
              bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}, {rate_fmt}]') as pbar:
        for i in range(1, args.count + 1):
            result = create_test_user(i, args.base_url, args.verbose)
            
            # Guardar tiempo de respuesta
            if "time_ms" in result:
                stats["times_ms"].append(result["time_ms"])
            
            if result["status"] == "created":
                stats["created"] += 1
                if args.verbose:
                    tqdm.write(f"✅ #{i} Creado: {result['email']} ({result.get('time_ms', 0):.0f}ms)")
            elif result["status"] == "exists":
                stats["exists"] += 1
                if args.verbose:
                    tqdm.write(f"📋 #{i} Ya existe: {result['email']} ({result.get('time_ms', 0):.0f}ms)")
            elif result["status"] == "connection_error":
                stats["connection_errors"] += 1
                stats["error_details"].append(f"#{i} {result['email']}: Connection error")
                if stats["connection_errors"] >= 5:
                    print("\n❌ Demasiados errores de conexión. Abortando.")
                    sys.exit(1)
            else:
                stats["errors"] += 1
                error_detail = result.get('detail', 'Unknown error')
                stats["error_details"].append(f"#{i} {result['email']}: {error_detail}")
                if args.verbose:
                    tqdm.write(f"❌ #{i} Error: {result['email']} - {error_detail}")
            
            pbar.update(1)
            time.sleep(args.delay)
    
    total_time = time.time() - start_total
    
    # Calcular estadísticas de tiempo
    if stats["times_ms"]:
        avg_time = sum(stats["times_ms"]) / len(stats["times_ms"])
        min_time = min(stats["times_ms"])
        max_time = max(stats["times_ms"])
        sorted_times = sorted(stats["times_ms"])
        p50 = sorted_times[len(sorted_times) // 2]
        p95 = sorted_times[int(len(sorted_times) * 0.95)]
    else:
        avg_time = min_time = max_time = p50 = p95 = 0
    
    # Resumen
    print("\n" + "=" * 60)
    print("📊 RESUMEN")
    print("=" * 60)
    print(f"✅ Usuarios creados: {stats['created']}")
    print(f"📋 Usuarios existentes: {stats['exists']}")
    print(f"❌ Errores: {stats['errors']}")
    print(f"🔌 Errores de conexión: {stats['connection_errors']}")
    print(f"📈 Total disponibles: {stats['created'] + stats['exists']}")
    
    print("\n" + "-" * 60)
    print("⏱️  TIEMPOS DE RESPUESTA")
    print("-" * 60)
    print(f"Tiempo total: {total_time:.1f}s")
    print(f"Promedio por usuario: {avg_time:.0f}ms")
    print(f"Mínimo: {min_time:.0f}ms")
    print(f"Máximo: {max_time:.0f}ms")
    print(f"Mediana (P50): {p50:.0f}ms")
    print(f"Percentil 95 (P95): {p95:.0f}ms")
    print(f"Throughput: {args.count / total_time:.1f} usuarios/segundo")
    
    # Mostrar errores detallados
    if stats["error_details"]:
        print("\n" + "-" * 60)
        print("❌ ERRORES DETALLADOS")
        print("-" * 60)
        for error in stats["error_details"][:10]:  # Mostrar máximo 10
            print(f"  • {error}")
        if len(stats["error_details"]) > 10:
            print(f"  ... y {len(stats['error_details']) - 10} más")
    
    # Verificar login si se solicitó
    if args.verify:
        print("\n🔐 Verificando login de usuarios...")
        verified = 0
        sample_size = min(5, args.count)
        
        for i in range(1, sample_size + 1):
            success, elapsed = verify_test_user_login(i, args.base_url)
            if success:
                verified += 1
                print(f"  ✅ testuser{i}@loadtest.com - Login OK ({elapsed:.0f}ms)")
            else:
                print(f"  ❌ testuser{i}@loadtest.com - Login FAILED")
        
        print(f"\n✅ {verified}/{sample_size} usuarios verificados correctamente")
    
    print("\n" + "=" * 60)
    print("✅ Proceso completado")
    print("=" * 60)
    print("\nPróximos pasos:")
    print("  1. Asegúrate de que TESTING_MODE=true en .env")
    print("  2. Ejecuta Locust: python3 -m locust -f locustfile.py --host " + args.base_url)
    print("  3. Abre http://localhost:8089 para la interfaz de Locust")


if __name__ == "__main__":
    main()
