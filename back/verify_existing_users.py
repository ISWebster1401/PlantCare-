#!/usr/bin/env python3
"""
Script para verificar usuarios existentes que no tienen tokens
"""

import asyncio
import sys
import os

# Agregar el directorio de la app al path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.api.core.database import init_db
from app.db.queries import get_user_by_email, create_email_verification_token
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def verify_existing_users():
    """Verifica usuarios existentes que necesitan tokens"""
    print("🔍 Verificando usuarios sin tokens...")
    
    db = await init_db()
    
    try:
        # Obtener todos los usuarios y ver cuáles no tienen tokens
        result = await db.execute_query("""
            SELECT u.id, u.email, u.first_name, u.last_name, u.is_verified, u.active
            FROM users u
            LEFT JOIN email_verification_tokens evt ON u.id = evt.user_id AND evt.used_at IS NULL
            WHERE evt.id IS NULL
            ORDER BY u.id
        """)
        
        if result is not None and not result.empty:
            print(f"\n📊 Encontrados {len(result)} usuarios sin tokens de verificación\n")
            
            for _, row in result.iterrows():
                user_id = row['id']
                email = row['email']
                is_verified = row['is_verified']
                active = row['active']
                
                print(f"👤 Usuario ID {user_id}: {email}")
                print(f"   Verificado: {is_verified} | Activo: {active}")
                
                # Crear token de verificación
                try:
                    token_data = await create_email_verification_token(db, user_id)
                    print(f"   ✅ Token creado: {token_data['token'][:20]}...")
                    print(f"   Expira: {token_data['expires_at']}")
                except Exception as e:
                    print(f"   ❌ Error creando token: {str(e)}")
                print()
        else:
            print("✅ Todos los usuarios tienen tokens de verificación")
            
        # Mostrar resumen
        stats = await db.execute_query("""
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_users,
                COUNT(CASE WHEN is_verified = false THEN 1 END) as unverified_users
            FROM users
        """)
        
        if stats is not None and not stats.empty:
            row = stats.iloc[0]
            print("\n📊 RESUMEN:")
            print(f"   Total usuarios: {row['total_users']}")
            print(f"   Verificados: {row['verified_users']}")
            print(f"   Sin verificar: {row['unverified_users']}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(verify_existing_users())

