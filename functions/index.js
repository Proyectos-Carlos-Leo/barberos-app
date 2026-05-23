// functions/index.js
// Deploy con: firebase deploy --only functions

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// 🔑 Credenciales GLOBALES (para autenticarse con Gmail)
// Estas van en Firebase Console → Funciones → Variables de entorno
const GLOBAL_GMAIL_USER = process.env.GMAIL_USER || "tu-email@gmail.com";
const GLOBAL_GMAIL_PASSWORD = process.env.GMAIL_PASSWORD || "tu-app-password";

// Función que se dispara cuando se crea una cita
exports.sendAppointmentConfirmation = functions.database
  .ref("/barberias/{slug}/citas/{citaId}")
  .onCreate(async (snapshot, context) => {
    const { slug, citaId } = context.params;
    const appointment = snapshot.val();

    // No enviar si es borrador o sin email
    if (!appointment.client || appointment.status !== "pendiente") {
      return null;
    }

    try {
      // Obtener detalles de la barbería
      const configSnap = await admin
        .database()
        .ref(`barberias/${slug}/config`)
        .once("value");
      const config = configSnap.val() || {};

      // ✅ IMPORTANTE: Leer el email de ESTA barbería
      const barbershopEmail = config.email_confirmacion || GLOBAL_GMAIL_USER;
      
      // Obtener datos del barbero
      const barberSnap = await admin
        .database()
        .ref(`barberias/${slug}/barberos/${appointment.barberId}`)
        .once("value");
      const barber = barberSnap.val() || {};

      // Obtener datos del servicio
      const serviceSnap = await admin
        .database()
        .ref(`barberias/${slug}/servicios/${appointment.service?.id || appointment.service}`)
        .once("value");
      const service = serviceSnap.val() || appointment.service || {};

      // Formatear fecha y hora
      const date = new Date(appointment.date);
      const dateFormatter = new Intl.DateTimeFormat("es-MX", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      const timeFormatter = new Intl.DateTimeFormat("es-MX", {
        hour: "2-digit",
        minute: "2-digit"
      });

      const formattedDate = dateFormatter.format(date);
      const formattedTime = timeFormatter.format(new Date(`2024-01-01T${appointment.time}`));

      // HTML del email
      const emailHTML = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
            .header { text-align: center; border-bottom: 2px solid var(--accent, #36B1DF); padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: var(--accent, #36B1DF); margin: 0; }
            .header p { color: #666; font-size: 14px; margin: 5px 0 0 0; }
            .section { margin-bottom: 25px; }
            .section-title { font-weight: bold; color: var(--accent, #36B1DF); font-size: 16px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .detail-label { color: #666; font-weight: 600; }
            .detail-value { color: #333; font-weight: 500; }
            .folio { background: #f0f8ff; border-left: 4px solid var(--accent, #36B1DF); padding: 15px; margin: 20px 0; border-radius: 5px; }
            .folio-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
            .folio-value { font-size: 28px; font-weight: 800; color: var(--accent, #36B1DF); font-family: 'Courier New', monospace; letter-spacing: 2px; }
            .button { background: linear-gradient(135deg, var(--accent, #36B1DF), var(--accent-light, #5FC8EC)); color: white; padding: 12px 24px; text-align: center; border-radius: 6px; text-decoration: none; font-weight: 700; display: inline-block; margin-top: 15px; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
            .barbershop-name { color: var(--accent, #36B1DF); font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✂️ Tu cita está confirmada</h1>
              <p>En <span class="barbershop-name">${config.nombre || "Tu Barbería"}</span></p>
            </div>

            <div class="section">
              <div class="section-title">📋 Tu número de cita</div>
              <div class="folio">
                <div class="folio-label">Folio de referencia</div>
                <div class="folio-value">${appointment.folio}</div>
              </div>
              <p style="color: #666; font-size: 13px; margin: 10px 0 0 0;">
                Guarda este número. Lo necesitarás para confirmar o modificar tu cita.
              </p>
            </div>

            <div class="section">
              <div class="section-title">📅 Detalles de tu cita</div>
              <div class="detail-row">
                <span class="detail-label">Fecha</span>
                <span class="detail-value">${formattedDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Hora</span>
                <span class="detail-value">${formattedTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Servicio</span>
                <span class="detail-value">${service.name || service || 'Sin especificar'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Barbero</span>
                <span class="detail-value">${barber.name || 'A elegir'}</span>
              </div>
              ${service.duration ? `
              <div class="detail-row">
                <span class="detail-label">Duración</span>
                <span class="detail-value">${service.duration} minutos</span>
              </div>
              ` : ''}
              ${service.price ? `
              <div class="detail-row">
                <span class="detail-label">Precio</span>
                <span class="detail-value">$${service.price}</span>
              </div>
              ` : ''}
            </div>

            <div class="section">
              <div class="section-title">📍 Ubicación</div>
              <div class="detail-row">
                <span class="detail-value">${config.direccion || 'Contacta para detalles'}</span>
              </div>
              ${config.telefono ? `
              <div class="detail-row" style="border-bottom: none;">
                <span class="detail-label">Teléfono</span>
                <span class="detail-value"><a href="tel:${config.telefono}" style="color: var(--accent, #36B1DF); text-decoration: none;">${config.telefono}</a></span>
              </div>
              ` : ''}
            </div>

            <div class="section">
              <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #fbbf24;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  <strong>💡 Tip:</strong> Puedes ver o cambiar tu cita desde tu teléfono sin necesidad de aplicación. Solo guarda el folio.
                </p>
              </div>
            </div>

            <div class="footer">
              <p>
                Este es un correo automático de ${config.nombre || "BarberOS"}. 
                <br>Si tienes dudas, contáctanos al ${config.telefono || 'teléfono de la barbería'}.
              </p>
              <p style="margin-top: 15px; color: #ccc;">
                Powered by BarberOS
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Texto plano como fallback
      const emailText = `
¡Tu cita está confirmada!

FOLIO: ${appointment.folio}

DETALLES DE TU CITA:
Fecha: ${formattedDate}
Hora: ${formattedTime}
Servicio: ${service.name || 'Sin especificar'}
Barbero: ${barber.name || 'A elegir'}
${service.duration ? `Duración: ${service.duration} minutos` : ''}
${service.price ? `Precio: $${service.price}` : ''}

UBICACIÓN:
${config.direccion || 'Contacta para detalles'}
${config.telefono ? `Teléfono: ${config.telefono}` : ''}

Guarda tu folio. Lo necesitarás para confirmar o cambiar tu cita.
      `;

      // ✅ Crear transporter DINÁMICO con el email de ESTA barbería
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: barbershopEmail,
          pass: GLOBAL_GMAIL_PASSWORD
        }
      });

      // Enviar email
      await transporter.sendMail({
        from: barbershopEmail,
        to: appointment.client_email || appointment.client,
        subject: `✂️ Cita confirmada - Folio: ${appointment.folio}`,
        text: emailText,
        html: emailHTML
      });

      console.log(`[${slug}] Email enviado desde ${barbershopEmail} a ${appointment.client_email || appointment.client}`);
      return null;
    } catch (error) {
      console.error(`[${slug}] Error enviando email:`, error);
      return null;
    }
  });

      // Obtener datos del barbero
      const barberSnap = await admin
        .database()
        .ref(`barberias/${slug}/barberos/${appointment.barberId}`)
        .once("value");
      const barber = barberSnap.val() || {};

      // Obtener datos del servicio
      const serviceSnap = await admin
        .database()
        .ref(`barberias/${slug}/servicios/${appointment.service?.id || appointment.service}`)
        .once("value");
      const service = serviceSnap.val() || appointment.service || {};

      // Formatear fecha y hora
      const date = new Date(appointment.date);
      const dateFormatter = new Intl.DateTimeFormat("es-MX", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      const timeFormatter = new Intl.DateTimeFormat("es-MX", {
        hour: "2-digit",
        minute: "2-digit"
      });

      const formattedDate = dateFormatter.format(date);
      const formattedTime = timeFormatter.format(new Date(`2024-01-01T${appointment.time}`));

      // HTML del email
      const emailHTML = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
            .header { text-align: center; border-bottom: 2px solid var(--accent, #36B1DF); padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: var(--accent, #36B1DF); margin: 0; }
            .header p { color: #666; font-size: 14px; margin: 5px 0 0 0; }
            .section { margin-bottom: 25px; }
            .section-title { font-weight: bold; color: var(--accent, #36B1DF); font-size: 16px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .detail-label { color: #666; font-weight: 600; }
            .detail-value { color: #333; font-weight: 500; }
            .folio { background: #f0f8ff; border-left: 4px solid var(--accent, #36B1DF); padding: 15px; margin: 20px 0; border-radius: 5px; }
            .folio-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
            .folio-value { font-size: 28px; font-weight: 800; color: var(--accent, #36B1DF); font-family: 'Courier New', monospace; letter-spacing: 2px; }
            .button { background: linear-gradient(135deg, var(--accent, #36B1DF), var(--accent-light, #5FC8EC)); color: white; padding: 12px 24px; text-align: center; border-radius: 6px; text-decoration: none; font-weight: 700; display: inline-block; margin-top: 15px; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
            .barbershop-name { color: var(--accent, #36B1DF); font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✂️ Tu cita está confirmada</h1>
              <p>En <span class="barbershop-name">${config.nombre || "Tu Barbería"}</span></p>
            </div>

            <div class="section">
              <div class="section-title">📋 Tu número de cita</div>
              <div class="folio">
                <div class="folio-label">Folio de referencia</div>
                <div class="folio-value">${appointment.folio}</div>
              </div>
              <p style="color: #666; font-size: 13px; margin: 10px 0 0 0;">
                Guarda este número. Lo necesitarás para confirmar o modificar tu cita.
              </p>
            </div>

            <div class="section">
              <div class="section-title">📅 Detalles de tu cita</div>
              <div class="detail-row">
                <span class="detail-label">Fecha</span>
                <span class="detail-value">${formattedDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Hora</span>
                <span class="detail-value">${formattedTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Servicio</span>
                <span class="detail-value">${service.name || service || 'Sin especificar'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Barbero</span>
                <span class="detail-value">${barber.name || 'A elegir'}</span>
              </div>
              ${service.duration ? `
              <div class="detail-row">
                <span class="detail-label">Duración</span>
                <span class="detail-value">${service.duration} minutos</span>
              </div>
              ` : ''}
              ${service.price ? `
              <div class="detail-row">
                <span class="detail-label">Precio</span>
                <span class="detail-value">$${service.price}</span>
              </div>
              ` : ''}
            </div>

            <div class="section">
              <div class="section-title">📍 Ubicación</div>
              <div class="detail-row">
                <span class="detail-value">${config.direccion || 'Contacta para detalles'}</span>
              </div>
              ${config.telefono ? `
              <div class="detail-row" style="border-bottom: none;">
                <span class="detail-label">Teléfono</span>
                <span class="detail-value"><a href="tel:${config.telefono}" style="color: var(--accent, #36B1DF); text-decoration: none;">${config.telefono}</a></span>
              </div>
              ` : ''}
            </div>

            <div class="section">
              <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #fbbf24;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  <strong>💡 Tip:</strong> Puedes ver o cambiar tu cita desde tu teléfono sin necesidad de aplicación. Solo guarda el folio.
                </p>
              </div>
            </div>

            <div class="footer">
              <p>
                Este es un correo automático de ${config.nombre || "BarberOS"}. 
                <br>Si tienes dudas, contáctanos al ${config.telefono || 'teléfono de la barbería'}.
              </p>
              <p style="margin-top: 15px; color: #ccc;">
                Powered by BarberOS
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Texto plano como fallback
      const emailText = `
¡Tu cita está confirmada!

FOLIO: ${appointment.folio}

DETALLES DE TU CITA:
Fecha: ${formattedDate}
Hora: ${formattedTime}
Servicio: ${service.name || 'Sin especificar'}
Barbero: ${barber.name || 'A elegir'}
${service.duration ? `Duración: ${service.duration} minutos` : ''}
${service.price ? `Precio: $${service.price}` : ''}

UBICACIÓN:
${config.direccion || 'Contacta para detalles'}
${config.telefono ? `Teléfono: ${config.telefono}` : ''}

Guarda tu folio. Lo necesitarás para confirmar o cambiar tu cita.
      `;

      // Enviar email
      await transporter.sendMail({
        from: process.env.GMAIL_USER || "tu-email@gmail.com",
        to: appointment.client_email || appointment.client, // Necesita email del cliente
        subject: `✂️ Cita confirmada - Folio: ${appointment.folio}`,
        text: emailText,
        html: emailHTML
      });

      console.log(`Email enviado a ${appointment.client_email || appointment.client}`);
      return null;
    } catch (error) {
      console.error("Error enviando email:", error);
      return null;
    }
  });
