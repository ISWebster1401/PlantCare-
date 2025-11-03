import asyncio
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Importar tu servicio
from app.api.core.email_service import email_service

async def test_email():
    print("🔍 Verificando configuración...")
    print(f"API Key configurada: {'✅ Sí' if email_service.api_key else '❌ No'}")
    print(f"From Email: {email_service.from_email}")
    print(f"Contact Email: {email_service.contact_email}")
    
    print("\n📧 Enviando email de prueba...")
    
    result = await email_service.send_email(
        to_email="plantcaare@gmail.com",  # Envíate a ti mismo
        subject="🎉 Test desde PlantCare",
        html_content="<h1>¡Funciona!</h1><p>SendGrid está configurado correctamente 🚀</p>"
    )
    
    if result:
        print("✅ Email enviado exitosamente! Revisa tu bandeja de entrada.")
    else:
        print("❌ Error enviando email. Revisa los logs.")

if __name__ == "__main__":
    asyncio.run(test_email())