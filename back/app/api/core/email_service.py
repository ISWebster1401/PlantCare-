import asyncio
import os
import logging
from typing import Optional, Dict, Any
from functools import partial
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
        self.timeout_seconds = float(os.getenv("SENDGRID_TIMEOUT", "15"))
        
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
            # ✅ CORREGIDO: Comillas simples dentro del string
            logger.info(
                "[email] send START to=%s subject='%s' timeout=%ss",
                to_email,
                subject,
                self.timeout_seconds,
            )

            from_email = Email(self.from_email, self.from_name)
            to_email_obj = To(to_email)

            if plain_text_content:
                mail = Mail(
                    from_email=from_email,
                    to_emails=to_email_obj,
                    subject=subject
                )
                mail.content = [
                    Content("text/plain", plain_text_content),
                    Content("text/html", html_content)
                ]
            else:
                mail = Mail(
                    from_email=from_email,
                    to_emails=to_email_obj,
                    subject=subject,
                    html_content=html_content
                )

            loop = asyncio.get_running_loop()
            send_callable = partial(self.client.send, mail)
            response = await asyncio.wait_for(
                loop.run_in_executor(None, send_callable),
                timeout=self.timeout_seconds,
            )

            if response.status_code in [200, 202]:
                logger.info("[email] send SUCCESS to=%s status=%s", to_email, response.status_code)
                return True

            logger.error(
                "[email] send FAILED to=%s status=%s body=%s headers=%s",
                to_email,
                response.status_code,
                getattr(response, 'body', 'no-body'),
                getattr(response, 'headers', {}),
            )
            return False

        except asyncio.TimeoutError:
            # ✅ CORREGIDO: Comillas simples dentro del string
            logger.error(
                "[email] send TIMEOUT to=%s subject='%s' timeout=%ss",
                to_email,
                subject,
                self.timeout_seconds,
            )
            return False
        except Exception as e:
            logger.error(f"[email] send ERROR to={to_email}: {str(e)}")
            try:
                if hasattr(e, 'body'):
                    import json
                    error_body = json.loads(e.body) if isinstance(e.body, (str, bytes)) else e.body
                    logger.error(f"[email] send error body: {json.dumps(error_body, indent=2)}")
            except Exception as parse_error:
                logger.error(f"[email] error body parse failed: {parse_error}")

            import traceback
            logger.error(f"[email] traceback: {traceback.format_exc()}")
            return False

    async def send_verification_code(self, to_email: str, user_name: str, code: str, minutes_valid: int = 15) -> bool:
        """
        Envía un código de verificación de 4 dígitos por correo.
        """
        try:
            if not self.api_key:
                logger.error("[EmailService] SENDGRID_API_KEY no configurada. No se puede enviar email.")
                print("⚠️ [EmailService] SENDGRID_API_KEY no configurada. Verifica tu archivo .env")
                return False

            subject = "🌱 Tu código de verificación - PlantCare"
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 20px; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #16a34a; margin: 0; font-size: 2rem;">🌱 PlantCare</h1>
                    </div>
                    
                    <h2 style="color: #0f172a; margin-bottom: 20px;">Hola {user_name.split()[0] if user_name else 'Usuario'},</h2>
                    
                    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                        Usa este código para verificar tu correo en PlantCare:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 20px 30px; display: inline-block; background: linear-gradient(135deg, #16a34a, #22c55e); color: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(22, 163, 74, 0.3);">
                            {code}
                        </div>
                    </div>
                    
                    <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 20px;">
                        ⏰ Este código vence en <strong>{minutes_valid} minutos</strong>.
                    </p>
                    
                    <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                            Si no solicitaste este código, puedes ignorar este mensaje de forma segura.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            plain_text = f"""
🌱 PlantCare - Código de Verificación

Hola {user_name.split()[0] if user_name else 'Usuario'},

Usa este código para verificar tu correo:

{code}

Este código vence en {minutes_valid} minutos.

Si no solicitaste este código, ignora este mensaje.

---
Equipo PlantCare
            """.strip()

            result = await self.send_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                plain_text_content=plain_text
            )
            
            if result:
                logger.info(f"✅ Email de verificación enviado exitosamente a {to_email}")
            else:
                logger.error(f"❌ Error enviando email de verificación a {to_email}")
            
            return result
            
        except Exception as e:
            logger.error(f"[EmailService] Error enviando código a {to_email}: {e}")
            import traceback
            logger.error(f"[EmailService] Traceback: {traceback.format_exc()}")
            print(f"❌ [EmailService] Error enviando código: {e}")
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
    
    async def send_quote_confirmation(self, user_email: str, user_name: str, reference_id: str) -> bool:
        """
        Envía confirmación al usuario cuando se registra su cotización
        
        Args:
            user_email: Email del usuario
            user_name: Nombre del usuario
            reference_id: ID de referencia de la cotización
            
        Returns:
            bool: True si se envió correctamente
        """
        subject = "Cotización Registrada - PlantCare"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2c5530; margin-bottom: 10px;">PlantCare</h1>
                    <p style="color: #666; font-size: 18px;">Cotización Registrada</p>
                </div>
                
                <div style="background-color: #f9f9f9; padding: 25px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="color: #2c5530; margin-top: 0;">Hola {user_name},</h2>
                    <p>Se ha registrado tu cotización exitosamente. Nuestro equipo de ventas la revisará y te contactará lo antes posible.</p>
                    <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center;">
                        <p style="margin: 0; font-size: 14px; color: #666;">
                            <strong>Número de Referencia:</strong><br>
                            <span style="font-size: 24px; color: #2c5530; font-weight: bold;">{reference_id}</span>
                        </p>
                    </div>
                </div>
                
                <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #856404; margin-top: 0;">¿Qué sigue?</h3>
                    <p>Se le indicará el estado de tu cotización en tu perfil. Puedes acceder a tu perfil en cualquier momento para:</p>
                    <ul>
                        <li>Ver el estado de tu cotización</li>
                        <li>Revisar los detalles de tu solicitud</li>
                        <li>Recibir actualizaciones sobre el proceso</li>
                    </ul>
                </div>
                
                <div style="background-color: #fff; padding: 20px; border-left: 4px solid #4CAF50; margin: 20px 0;">
                    <h3 style="color: #2c5530; margin-top: 0;">Próximos pasos</h3>
                    <p>Nuestro equipo de ventas:</p>
                    <ul>
                        <li>Revisará tu solicitud en un plazo máximo de <strong>12 horas</strong></li>
                        <li>Te contactará para discutir los detalles de tu proyecto</li>
                        <li>Te enviará una cotización personalizada</li>
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
        
        Se ha registrado tu cotización exitosamente. Nuestro equipo de ventas la revisará y te contactará lo antes posible.
        
        Número de Referencia: {reference_id}
        
        ¿Qué sigue?
        Se le indicará el estado de tu cotización en tu perfil. Puedes acceder a tu perfil en cualquier momento para ver el estado de tu cotización, revisar los detalles de tu solicitud y recibir actualizaciones sobre el proceso.
        
        Próximos pasos:
        Nuestro equipo de ventas revisará tu solicitud en un plazo máximo de 12 horas, te contactará para discutir los detalles de tu proyecto y te enviará una cotización personalizada.
        
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
        
        # ✅ AGREGADO: plain_text_content que faltaba
        plain_text = f"""
        Nueva Solicitud de Cotizacion - PlantCare
        
        Informacion del Cliente:
        - Nombre: {quote_data.get('name', 'No proporcionado')}
        - Email: {quote_data.get('email', 'No proporcionado')}
        - Telefono: {quote_data.get('phone', 'No proporcionado')}
        - Empresa: {quote_data.get('company', 'No proporcionado')}
        - Cargo: {quote_data.get('position', 'No proporcionado')}
        
        Detalles del Proyecto:
        - Tipo de proyecto: {quote_data.get('project_type', 'No especificado')}
        - Cantidad de sensores: {quote_data.get('sensor_quantity', 'No especificado')}
        - Area a cubrir: {quote_data.get('coverage_area', 'No especificado')}
        - Presupuesto estimado: {quote_data.get('budget_range', 'No especificado')}
        - Fecha deseada: {quote_data.get('desired_date', 'No especificado')}
        
        Descripcion del Proyecto:
        {quote_data.get('description', 'Sin descripcion')}
        
        Fecha: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
        IP: {quote_data.get('ip_address', 'No disponible')}
        Prioridad: Alta (Solicitud de Cotizacion)
        """
        
        return await self.send_email(
            to_email=self.contact_email,
            subject=subject,
            html_content=html_content,
            plain_text_content=plain_text  # ✅ Ahora sí lo incluimos
        )

    async def send_quote_status_update(
        self,
        to_email: str,
        user_name: str,
        reference_id: str,
        status: str,
        admin_message: str,
        admin_name: Optional[str] = None
    ) -> bool:
        """
        Envía una actualización de estado personalizada al cliente.
        """
        if not self.api_key:
            logger.error("[email] SENDGRID_API_KEY no configurada. No se envió estado de cotización.")
            return False

        status_titles = {
            "pending": "Estado: En revisión",
            "contacted": "Estado: Contactado",
            "quoted": "Estado: Cotización disponible",
            "accepted": "Estado: Aceptada",
            "rejected": "Estado: Rechazada",
            "cancelled": "Estado: Cancelada",
        }

        default_messages = {
            "pending": "Tu solicitud está en revisión. Nuestro equipo te confirmará los próximos pasos muy pronto.",
            "contacted": "Ya tomamos contacto contigo para avanzar con tu solicitud. Revisa tu correo o teléfono para más detalles.",
            "quoted": "Tu cotización personalizada ya está disponible. Revisa la propuesta adjunta y cuéntanos tus comentarios.",
            "accepted": "¡Excelente noticia! Aceptamos avanzar con tu proyecto. Coordinaremos contigo los próximos pasos.",
            "rejected": "Hemos revisado tu solicitud y, por ahora, no podremos avanzar. Si deseas, conversemos alternativas.",
            "cancelled": "La cotización fue cancelada según lo solicitado. Estamos disponibles si quieres retomarla en el futuro.",
        }

        normalized_status = status.lower().strip()
        status_title = status_titles.get(normalized_status, "Actualización de tu cotización")
        contact_name = admin_name or "Equipo PlantCare"
        message_body = admin_message.strip() if admin_message else default_messages.get(
            normalized_status,
            "Seguimos trabajando en tu solicitud. Pronto recibirás más novedades."
        )

        subject = f"{status_title} - Cotización {reference_id}"

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
            <div style="max-width: 640px; margin: 0 auto; padding: 32px 24px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #16a34a; margin: 0;">PlantCare</h1>
                    <p style="color: #64748b; margin: 8px 0 0 0;">Actualización de tu solicitud</p>
                </div>

                <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 20px 24px; border-radius: 14px;">
                    <h2 style="margin: 0 0 8px 0;">Hola {user_name},</h2>
                    <p style="margin: 0; font-size: 15px;">Tenemos novedades sobre tu cotización <strong>{reference_id}</strong>.</p>
                </div>

                <div style="background: #f8fafc; border: 1px solid #d1fae5; border-radius: 12px; padding: 24px; margin: 24px 0;">
                    <h3 style="color: #15803d; margin-top: 0;">{status_title}</h3>
                    <p style="color: #0f172a; margin: 0; white-space: pre-line;">{message_body}</p>
                </div>

                <div style="background: #fff; border-left: 4px solid #22c55e; padding: 18px 22px; border-radius: 10px;">
                    <p style="margin: 0; color: #0f172a;">
                        Si tienes dudas o necesitas hacer algún cambio, puedes responder directamente a este correo o escribirnos a
                        <a href="mailto:contacto@plantcare.cl" style="color: #16a34a; font-weight: 600;">contacto@plantcare.cl</a>.
                    </p>
                </div>

                <div style="margin-top: 32px; text-align: center; color: #64748b; font-size: 14px;">
                    <p style="margin-bottom: 8px;">Un saludo,<br><strong>{contact_name}</strong></p>
                    <p style="margin: 0;">Equipo PlantCare</p>
                </div>
            </div>
        </body>
        </html>
        """

        plain_text = f"""
Hola {user_name},

Tenemos novedades sobre tu cotización {reference_id}.

{status_title}

{message_body}

Si tienes dudas o necesitas hacer algún cambio, responde a este correo o escríbenos a contacto@plantcare.cl.

Un saludo,
{contact_name}
Equipo PlantCare
        """.strip()

        return await self.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            plain_text_content=plain_text
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

    async def send_verification_code_email(self, to_email: str, user_name: str, code: str) -> bool:
        """Envía un email con un código de verificación de 4 dígitos."""
        subject = "Verifica tu correo - Código PlantCare"
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c5530;">Verificación de Cuenta</h2>
                <p>Hola {user_name},</p>
                <p>Usa este código para verificar tu cuenta:</p>
                <div style="text-align:center; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #16a34a; margin: 20px 0;">{code}</div>
                <p style="color:#666;">Este código expira en 24 horas.</p>
            </div>
        </body>
        </html>
        """
        plain_text = f"Hola {user_name}, tu código de verificación es: {code}. Expira en 24 horas."
        return await self.send_email(to_email=to_email, subject=subject, html_content=html_content, plain_text_content=plain_text)

# Instancia global del servicio de email
email_service = EmailService()