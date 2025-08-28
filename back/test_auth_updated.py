"""
Script de prueba para el sistema de autenticación actualizado
"""
import asyncio
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health Check: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_register():
    """Test user registration"""
    user_data = {
        "first_name": "Juan",
        "last_name": "Pérez",
        "email": "juan.perez@plantcare.com",
        "phone": "+56987654321",
        "region": "Valparaíso",
        "vineyard_name": "Viña San Juan",
        "hectares": 15,
        "grape_type": "Cabernet Sauvignon",
        "password": "password123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=user_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"\\nRegister Test: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 201
    except Exception as e:
        print(f"Register test failed: {e}")
        return False

def test_login():
    """Test user login"""
    login_data = {
        "email": "juan.perez@plantcare.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login-json",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"\\nLogin Test: {response.status_code}")
        result = response.json()
        print(f"Response: {result}")
        
        if response.status_code == 200:
            return result.get("access_token")
        return None
    except Exception as e:
        print(f"Login test failed: {e}")
        return None

def test_protected_route(token):
    """Test protected route with token"""
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        print(f"\\nProtected Route Test: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Protected route test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=== PlantCare Authentication System Tests ===")
    print(f"Testing at: {BASE_URL}")
    print(f"Time: {datetime.now()}")
    
    # Test 1: Health check
    print("\\n1. Testing Health Check...")
    health_ok = test_health()
    
    # Test 2: Registration
    print("\\n2. Testing User Registration...")
    register_ok = test_register()
    
    # Test 3: Login
    print("\\n3. Testing User Login...")
    token = test_login()
    login_ok = token is not None
    
    # Test 4: Protected route
    print("\\n4. Testing Protected Route...")
    if token:
        protected_ok = test_protected_route(token)
    else:
        protected_ok = False
        print("Skipped - no token available")
    
    # Summary
    print("\\n=== Test Summary ===")
    print(f"Health Check: {'✓' if health_ok else '✗'}")
    print(f"Registration: {'✓' if register_ok else '✗'}")
    print(f"Login: {'✓' if login_ok else '✗'}")
    print(f"Protected Route: {'✓' if protected_ok else '✗'}")
    
    total_tests = 4
    passed_tests = sum([health_ok, register_ok, login_ok, protected_ok])
    print(f"\\nTotal: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed! Authentication system is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the logs for details.")

if __name__ == "__main__":
    main()