import os
import logging
from typing import Optional, Dict, Any
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from datetime import datetime

logger = logging.getLogger(__name__)

class EmailService:
    """Servicio para envío de emails usando SendGrid"""
    
    def __init__(self):
        self.api_key = os.getenv("SENDGRID_API_KEY")
        self.from_email = os.getenv("SENDGRID_FROM_EMAIL", "noreply@plantcare.com")
        self.from_name = os.getenv("SENDGRID_FROM_NAME", "PlantCare Support")
        self.contact_email = os.getenv("CONTACT_EMAIL", "contacto@plantcare.com")
        
        if not self.api_key:
            # Mostrar warning en pantalla para debugging
            print("⚠️  SendGrid API key no configurada. Los emails no se enviarán.")
            logger.warning("SendGrid API key no configurada. Los emails no se enviarán.")
            self.client = None
        else:
            print(f"✅ SendGrid configurado. From: {self.from_email}")
            self.client = SendGridAPIClient(api_key=self.api_key)
    
    async def send_email(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str, 
        plain_text_content: Optional[str] = None
    ) -> bool:
        if not self.client:
            logger.warning(f"No se puede enviar email a {to_email}: SendGrid no configurado")
            return False
        
        try:
            logger.info(f"Intentando enviar email a: {to_email}")
            logger.info(f"Desde: {self.from_email} ({self.from_name})")
            logger.info(f"Asunto: {subject}")
            
            from_email = Email(self.from_email, self.from_name)
            to_email_obj = To(to_email)
            
            # Crear el email
            if plain_text_content:
                # Si hay texto plano, crear el Mail sin html_content y agregarlo manualmente
                mail = Mail(
                    from_email=from_email,
                    to_emails=to_email_obj,
                    subject=subject
                )
                # Agregar ambos contenidos en el orden correcto
                mail.content = [
                    Content("text/plain", plain_text_content),
                    Content("text/html", html_content)
                ]
            else:
                # Si no hay texto plano, solo HTML
                mail = Mail(
                    from_email=from_email,
                    to_emails=to_email_obj,
                    subject=subject,
                    html_content=html_content
                )
            
            logger.info("Enviando petición a SendGrid...")
            
            # Enviar el email
            response = self.client.send(mail)
            
            if response.status_code in [200, 202]:
                logger.info(f"Email enviado exitosamente a {to_email}")
                return True
            else:
                logger.error(f"Error enviando email: Status {response.status_code}")
                logger.error(f"Response body: {response.body}")
                logger.error(f"Response headers: {response.headers}")
                return False
                
        except Exception as e:
            logger.error(f"Error enviando email a {to_email}: {str(e)}")
            
            # Capturar el body del error de SendGrid
            try:
                if hasattr(e, 'body'):
                    import json
                    error_body = json.loads(e.body) if isinstance(e.body, (str, bytes)) else e.body
                    logger.error(f"SendGrid error details: {json.dumps(error_body, indent=2)}")
            except Exception as parse_error:
                logger.error(f"No se pudo parsear el error de SendGrid: {parse_error}")
            
            import traceback
            logger.error(f"Traceback completo: {traceback.format_exc()}")
            return False

    async def send_contact_form_notification(self, form_data: Dict[str, Any]) -> bool:
        """
        Envía notificación de formulario de contacto al equipo
        
        Args:
            form_data: Datos del formulario de contacto
            
        Returns:
            bool: True si se envió correctamente
        """
        # Convertir inquiry_type si es necesario
        inquiry_type = form_data.get('inquiry_type', 'General')
        if not isinstance(inquiry_type, str):
            inquiry_type = str(inquiry_type)
        
        subject = f"Nuevo mensaje de contacto - {form_data.get('subject', 'Sin asunto')}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c5530; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
                    Nuevo Mensaje de Contacto - PlantCare
                </h2>
                
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c5530; margin-top: 0;">Informacion del Contacto</h3>
                    <p><strong>Nombre:</strong> {form_data.get('name', 'No proporcionado')}</p>
                    <p><strong>Email:</strong> {form_data.get('email', 'No proporcionado')}</p>
                    <p><strong>Telefono:</strong> {form_data.get('phone', 'No proporcionado')}</p>
                    <p><strong>Empresa:</strong> {form_data.get('company', 'No proporcionado')}</p>
                    <p><strong>Tipo de consulta:</strong> {inquiry_type}</p>
                </div>
                
                <div style="background-color: #fff; padding: 20px; border-left: 4px solid #4CAF50; margin: 20px 0;">
                    <h3 style="color: #2c5530; margin-top: 0;">Mensaje</h3>
                    <p style="white-space: pre-wrap;">{form_data.get('message', 'Sin mensaje')}</p>
                </div>
                
                <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #666;">
                        <strong>Fecha:</strong> {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}<br>
                        <strong>IP:</strong> {form_data.get('ip_address', 'No disponible')}<br>
                        <strong>Referencia:</strong> {form_data.get('reference_id', 'N/A')}
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <p style="color: #666; font-size: 12px;">
                        Este mensaje fue enviado desde el formulario de contacto de PlantCare
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_text = f"""
        Nuevo Mensaje de Contacto - PlantCare
        
        Informacion del Contacto:
        - Nombre: {form_data.get('name', 'No proporcionado')}
        - Email: {form_data.get('email', 'No proporcionado')}
        - Telefono: {form_data.get('phone', 'No proporcionado')}
        - Empresa: {form_data.get('company', 'No proporcionado')}
        - Tipo de consulta: {inquiry_type}
        
        Mensaje:
        {form_data.get('message', 'Sin mensaje')}
        
        Fecha: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
        IP: {form_data.get('ip_address', 'No disponible')}
        Referencia: {form_data.get('reference_id', 'N/A')}
        """
        
        return await self.send_email(
            to_email=self.contact_email,
            subject=subject,
            html_content=html_content,
            plain_text_content=plain_text
        )
    
    async def send_contact_confirmation(self, user_email: str, user_name: str) -> bool:
        """
        Envía confirmación al usuario que envió el formulario de contacto
        
        Args:
            user_email: Email del usuario
            user_name: Nombre del usuario
            
        Returns:
            bool: True si se envió correctamente
        """
        subject = "Hemos recibido tu mensaje - PlantCare"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2c5530; margin-bottom: 10px;">PlantCare</h1>
                    <p style="color: #666; font-size: 18px;">Gracias por contactarnos</p>
                </div>
                
                <div style="background-color: #f9f9f9; padding: 25px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="color: #2c5530; margin-top: 0;">Hola {user_name},</h2>
                    <p>Hemos recibido tu mensaje y nos pondremos en contacto contigo lo antes posible.</p>
                    <p>Nuestro equipo de soporte revisara tu consulta y te respondera en un plazo maximo de <strong>24 horas</strong>.</p>
                </div>
                
                <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c5530; margin-top: 0;">Necesitas ayuda inmediata?</h3>
                    <p>Si tu consulta es urgente, puedes:</p>
                    <ul>
                        <li>Responder directamente a este email</li>
                        <li>Llamarnos al: +56 9 1234 5678</li>
                        <li>Usar nuestro chat en vivo en la plataforma</li>
                    </ul>
                </div>
                
                <div style="background-color: #fff; padding: 20px; border-left: 4px solid #4CAF50; margin: 20px 0;">
                    <h3 style="color: #2c5530; margin-top: 0;">Mientras tanto...</h3>
                    <p>Te invitamos a explorar nuestros recursos:</p>
                    <ul>
                        <li><a href="#" style="color: #4CAF50;">Centro de Ayuda</a></li>
                        <li><a href="#" style="color: #4CAF50;">Tutoriales en Video</a></li>
                        <li><a href="#" style="color: #4CAF50;">Guia de Inicio Rapido</a></li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <p style="color: #666; font-size: 14px;">
                        Gracias por confiar en PlantCare para el cuidado de tus plantas<br>
                        <strong>Equipo PlantCare</strong>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_text = f"""
        Hola {user_name},
        
        Hemos recibido tu mensaje y nos pondremos en contacto contigo lo antes posible.
        
        Nuestro equipo de soporte revisara tu consulta y te respondera en un plazo maximo de 24 horas.
        
        Necesitas ayuda inmediata?
        - Responder directamente a este email
        - Llamarnos al: +56 9 1234 5678
        - Usar nuestro chat en vivo en la plataforma
        
        Gracias por confiar en PlantCare para el cuidado de tus plantas.
        
        Equipo PlantCare
        """
        
        return await self.send_email(
            to_email=user_email,
            subject=subject,
            html_content=html_content,
            plain_text_content=plain_text
        )
    
    async def send_quote_request_notification(self, quote_data: Dict[str, Any]) -> bool:
        """
        Envía notificación de solicitud de cotización al equipo de ventas
        
        Args:
            quote_data: Datos de la solicitud de cotización
            
        Returns:
            bool: True si se envió correctamente
        """
        subject = f"Nueva Solicitud de Cotizacion - {quote_data.get('company', 'Cliente Potencial')}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c5530; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
                    Nueva Solicitud de Cotizacion - PlantCare
                </h2>
                
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2c5530; margin-top: 0;">Informacion del Cliente</h3>
                    <p><strong>Nombre:</strong> {quote_data.get('name', 'No proporcionado')}</p>
                    <p><strong>Email:</strong> {quote_data.get('email', 'No proporcionado')}</p>
                    <p><strong>Telefono:</strong> {quote_data.get('phone', 'No proporcionado')}</p>
                    <p><strong>Empresa:</strong> {quote_data.get('company', 'No proporcionado')}</p>
                    <p><strong>Cargo:</strong> {quote_data.get('position', 'No proporcionado')}</p>
                </div>
                
                <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #856404; margin-top: 0;">Detalles del Proyecto</h3>
                    <p><strong>Tipo de proyecto:</strong> {quote_data.get('project_type', 'No especificado')}</p>
                    <p><strong>Cantidad de sensores:</strong> {quote_data.get('sensor_quantity', 'No especificado')}</p>
                    <p><strong>Area a cubrir:</strong> {quote_data.get('coverage_area', 'No especificado')}</p>
                    <p><strong>Presupuesto estimado:</strong> {quote_data.get('budget_range', 'No especificado')}</p>
                    <p><strong>Fecha deseada:</strong> {quote_data.get('desired_date', 'No especificado')}</p>
                </div>
                
                <div style="background-color: #fff; padding: 20px; border-left: 4px solid #4CAF50; margin: 20px 0;">
                    <h3 style="color: #2c5530; margin-top: 0;">Descripcion del Proyecto</h3>
                    <p style="white-space: pre-wrap;">{quote_data.get('description', 'Sin descripcion')}</p>
                </div>
                
                <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #666;">
                        <strong>Fecha:</strong> {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}<br>
                        <strong>IP:</strong> {quote_data.get('ip_address', 'No disponible')}<br>
                        <strong>Prioridad:</strong> Alta (Solicitud de Cotizacion)
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <p style="color: #666; font-size: 12px;">
                        Esta solicitud fue enviada desde el formulario de cotizacion de PlantCare
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(
            to_email=self.contact_email,
            subject=subject,
            html_content=html_content
        )

    async def send_verification_email(self, to_email: str, user_name: str, verify_url: str) -> bool:
        """Envía email de verificación de cuenta."""
        subject = "Verifica tu correo - PlantCare"
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c5530;">Bienvenido a PlantCare</h2>
                <p>Hola {user_name},</p>
                <p>Gracias por registrarte. Por favor verifica tu correo para activar tu cuenta:</p>
                <p style="text-align:center; margin: 30px 0;">
                    <a href="{verify_url}" style="background:#2c5530; color:#fff; padding:12px 22px; border-radius:8px; text-decoration:none;">Verificar mi correo</a>
                </p>
                <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                <p style="word-break:break-all;">
                    <a href="{verify_url}">{verify_url}</a>
                </p>
                <p style="color:#666; font-size:12px;">Este enlace expira en 24 horas.</p>
            </div>
        </body>
        </html>
        """
        plain_text = f"Hola {user_name},\n\nVerifica tu correo visitando: {verify_url}\n\nEl enlace expira en 24 horas."
        return await self.send_email(to_email=to_email, subject=subject, html_content=html_content, plain_text_content=plain_text)

# Instancia global del servicio de email
email_service = EmailService()