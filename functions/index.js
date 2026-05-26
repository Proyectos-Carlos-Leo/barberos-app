const { onValueCreated } = require("firebase-functions/v2/database");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

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
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: #f5f5f5;
              color: #333;
              line-height: 1.6;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #36B1DF 0%, #5FC8EC 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 8px;
              letter-spacing: -0.5px;
            }
            .header p {
              font-size: 16px;
              opacity: 0.95;
              font-weight: 300;
            }
            .folio-section {
              background: #f0f8ff;
              padding: 30px;
              text-align: center;
              border-bottom: 2px solid #36B1DF;
            }
            .folio-label {
              font-size: 12px;
              color: #36B1DF;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              font-weight: 700;
              margin-bottom: 12px;
            }
            .folio-value {
              font-size: 36px;
              font-weight: 800;
              color: #36B1DF;
              font-family: 'Courier New', monospace;
              letter-spacing: 4px;
              margin-bottom: 12px;
            }
            .folio-help {
              font-size: 13px;
              color: #666;
              font-weight: 500;
            }
            .content {
              padding: 30px;
            }
            .section {
              margin-bottom: 28px;
            }
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #36B1DF;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 16px;
              padding-bottom: 10px;
              border-bottom: 2px solid #e5e5e5;
            }
            .detail {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              font-size: 14px;
              border-bottom: 1px solid #f0f0f0;
            }
            .detail-label {
              color: #666;
              font-weight: 600;
            }
            .detail-value {
              color: #333;
              font-weight: 500;
              text-align: right;
            }
            .detail:last-child {
              border-bottom: none;
            }
            .info-box {
              background: #f9f9f9;
              border-left: 4px solid #36B1DF;
              padding: 16px;
              margin-top: 20px;
              border-radius: 4px;
              font-size: 13px;
              color: #555;
              line-height: 1.5;
            }
            .footer {
              background: #f5f5f5;
              padding: 20px 30px;
              text-align: center;
              border-top: 1px solid #e5e5e5;
              font-size: 12px;
              color: #888;
            }
            .footer-brand {
              font-weight: 700;
              color: #36B1DF;
              margin-bottom: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Cita Confirmada</h1>
              <p>${config.nombre || "Tu Barbería"}</p>
            </div>

            <div class="folio-section">
              <div class="folio-label">Número de referencia</div>
              <div class="folio-value">${appointment.folio || "------"}</div>
              <div class="folio-help">Guarda este código para consultar o modificar tu cita</div>
            </div>

            <div class="content">
              <div class="section">
                <div class="section-title">Detalles de tu cita</div>
                <div class="detail">
                  <span class="detail-label">Fecha:</span>
                  <span class="detail-value">${formattedDate}</span>
                </div>
                <div class="detail">
                  <span class="detail-label">Hora:</span>
                  <span class="detail-value">${appointment.time || "No especificada"}</span>
                </div>
                <div class="detail">
                  <span class="detail-label">Servicio:</span>
                  <span class="detail-value">${service.name || "No especificado"}</span>
                </div>
                <div class="detail">
                  <span class="detail-label">Barbero:</span>
                  <span class="detail-value">${barber.name || "Por asignar"}</span>
                </div>
                ${service.duration ? `
                <div class="detail">
                  <span class="detail-label">Duración:</span>
                  <span class="detail-value">${service.duration} minutos</span>
                </div>
                ` : ""}
                ${service.price ? `
                <div class="detail">
                  <span class="detail-label">Precio:</span>
                  <span class="detail-value">$${service.price}</span>
                </div>
                ` : ""}
              </div>

              ${config.direccion || config.telefono ? `
              <div class="section">
                <div class="section-title">Ubicación e información</div>
                ${config.direccion ? `
                <div class="detail">
                  <span class="detail-label">Dirección:</span>
                  <span class="detail-value">${config.direccion}</span>
                </div>
                ` : ""}
                ${config.telefono ? `
                <div class="detail">
                  <span class="detail-label">Teléfono:</span>
                  <span class="detail-value"><a href="tel:${config.telefono}" style="color: #36B1DF; text-decoration: none;">${config.telefono}</a></span>
                </div>
                ` : ""}
              </div>
              ` : ""}

              <div class="info-box">
                Puedes consultar o cambiar los detalles de tu cita usando el número de referencia proporcionado. Si tienes preguntas, no dudes en comunicarte directamente con nosotros.
              </div>
            </div>

            <div class="footer">
              <div class="footer-brand">${config.nombre || "BarberOS"}</div>
              <p>Este es un correo automático. Por favor, no respondas a este mensaje.</p>
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
        subject: `Cita confirmada - Folio: ${appointment.folio}`,
        html: emailHTML,
        text: `Cita confirmada\n\nFolio: ${appointment.folio}\n\nDetalles:\nFecha: ${formattedDate}\nHora: ${appointment.time}\nServicio: ${service.name || "No especificado"}\nBarbero: ${barber.name || "Por asignar"}\n\nDirección: ${config.direccion || "No especificada"}\nTeléfono: ${config.telefono || "No especificado"}`
      });

      console.log(`[${slug}] Email enviado desde ${barbershopEmail} a ${appointment.client_email}`);
      return null;
    } catch (error) {
      console.error(`[${slug}] Error:`, error);
      return null;
    }
  }
);
