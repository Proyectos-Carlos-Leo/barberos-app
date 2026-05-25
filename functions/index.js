const { onValueCreated } = require("firebase-functions/v2/database");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Secretos (se configuran con: firebase functions:secrets:set NOMBRE)
const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_PASSWORD = defineSecret("GMAIL_PASSWORD");

exports.sendAppointmentConfirmation = onValueCreated(
  {
    ref: "/barberias/{slug}/citas/{citaId}",
    secrets: [GMAIL_USER, GMAIL_PASSWORD],
  },
  async (event) => {
    const slug = event.params.slug;
    const appointment = event.data.val();

    if (!appointment.client || appointment.status !== "pendiente" || !appointment.client_email) {
      return null;
    }

    try {
      const configSnap = await admin.database().ref(`barberias/${slug}/config`).once("value");
      const config = configSnap.val() || {};

      const barbershopEmail = config.email_confirmacion || GMAIL_USER.value();
      const password = GMAIL_PASSWORD.value();
      
      if (!barbershopEmail || !password) {
        console.log(`[${slug}] No hay email/password configurado`);
        return null;
      }

      const barberSnap = await admin.database().ref(`barberias/${slug}/barberos/${appointment.barberId}`).once("value");
      const barber = barberSnap.val() || {};

      const serviceId = appointment.service?.id || appointment.service;
      const serviceSnap = await admin.database().ref(`barberias/${slug}/servicios/${serviceId}`).once("value");
      const service = serviceSnap.val() || {};

      const dateFormatter = new Intl.DateTimeFormat("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const formattedDate = dateFormatter.format(new Date(appointment.date + "T12:00:00"));

      const emailHTML = `
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
          .header { text-align: center; border-bottom: 2px solid #36B1DF; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #36B1DF; margin: 0; font-size: 24px; }
          .folio-box { background: #f0f8ff; border-left: 4px solid #36B1DF; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .folio-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
          .folio-value { font-size: 32px; font-weight: 800; color: #36B1DF; font-family: monospace; letter-spacing: 4px; }
          .section-title { font-weight: bold; color: #36B1DF; font-size: 14px; margin: 20px 0 10px 0; text-transform: uppercase; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✂️ Cita Confirmada</h1>
              <p style="color:#666; margin:5px 0 0 0;">${config.nombre || "Tu Barbería"}</p>
            </div>
            <div class="folio-box">
              <div class="folio-label">Tu folio de referencia</div>
              <div class="folio-value">${appointment.folio || "------"}</div>
              <p style="margin:8px 0 0 0; color:#666; font-size:12px;">Guarda este número para consultar o modificar tu cita.</p>
            </div>
            <div class="section-title">📅 Detalles de tu cita</div>
            <div class="detail-row"><span style="color:#666;font-weight:600;">Fecha</span><span>${formattedDate}</span></div>
            <div class="detail-row"><span style="color:#666;font-weight:600;">Hora</span><span>${appointment.time || "Sin hora"}</span></div>
            <div class="detail-row"><span style="color:#666;font-weight:600;">Servicio</span><span>${service.name || "Sin especificar"}</span></div>
            <div class="detail-row"><span style="color:#666;font-weight:600;">Barbero</span><span>${barber.name || "A elegir"}</span></div>
            ${service.price ? `<div class="detail-row"><span style="color:#666;font-weight:600;">Precio</span><span>$${service.price}</span></div>` : ""}
            ${config.direccion ? `
            <div class="section-title">📍 Ubicación</div>
            <div class="detail-row"><span>${config.direccion}</span></div>` : ""}
            ${config.telefono ? `<div class="detail-row"><span style="color:#666;font-weight:600;">Teléfono</span><span>${config.telefono}</span></div>` : ""}
            <div class="footer">
              <p>Correo automático de ${config.nombre || "BarberOS"}</p>
              <p style="color:#ccc;">Powered by BarberOS</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: barbershopEmail, pass: password }
      });

      await transporter.sendMail({
        from: barbershopEmail,
        to: appointment.client_email,
        subject: `✂️ Cita confirmada - Folio: ${appointment.folio}`,
        html: emailHTML,
        text: `Cita confirmada!\nFolio: ${appointment.folio}\nFecha: ${formattedDate}\nHora: ${appointment.time}\nBarbero: ${barber.name || "A elegir"}`
      });

      console.log(`[${slug}] Email enviado desde ${barbershopEmail} a ${appointment.client_email}`);
      return null;
    } catch (error) {
      console.error(`[${slug}] Error:`, error);
      return null;
    }
  }
);
