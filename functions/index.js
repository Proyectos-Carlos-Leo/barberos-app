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

      const idioma = config.idioma === "en" ? "en" : "es";
      const dateFormatter = new Intl.DateTimeFormat(idioma === "en" ? "en-US" : "es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const formattedDate = dateFormatter.format(new Date(appointment.date + "T12:00:00"));

      const T = idioma === "en" ? {
        lang: "en",
        headerTitle: "Appointment Confirmed",
        refLabel: "Reference number",
        refHelp: "Save this code to look up or modify your appointment",
        sectionDetails: "Your appointment details",
        date: "Date:",
        time: "Time:",
        service: "Service:",
        barber: "Barber:",
        duration: "Duration:",
        durationUnit: "minutes",
        price: "Price:",
        sectionLocation: "Location & info",
        address: "Address:",
        phone: "Phone:",
        infoBox: "You can look up or change your appointment details using the reference number above. If you have any questions, feel free to contact us directly.",
        footerNote: "This is an automated email. Please do not reply to this message.",
        timeNotSpecified: "Not specified",
        serviceNotSpecified: "Not specified",
        barberNotAssigned: "To be assigned",
        addressNotSpecified: "Not specified",
        phoneNotSpecified: "Not specified",
        defaultName: "Your Barbershop",
        subject: `Appointment Confirmed - Reference: ${appointment.folio}`,
        textBody: `Appointment Confirmed\n\nReference: ${appointment.folio}\n\nDetails:`,
      } : {
        lang: "es",
        headerTitle: "Cita Confirmada",
        refLabel: "Número de referencia",
        refHelp: "Guarda este código para consultar o modificar tu cita",
        sectionDetails: "Detalles de tu cita",
        date: "Fecha:",
        time: "Hora:",
        service: "Servicio:",
        barber: "Barbero:",
        duration: "Duración:",
        durationUnit: "minutos",
        price: "Precio:",
        sectionLocation: "Ubicación e información",
        address: "Dirección:",
        phone: "Teléfono:",
        infoBox: "Puedes consultar o cambiar los detalles de tu cita usando el número de referencia proporcionado. Si tienes preguntas, no dudes en comunicarte directamente con nosotros.",
        footerNote: "Este es un correo automático. Por favor, no respondas a este mensaje.",
        timeNotSpecified: "No especificada",
        serviceNotSpecified: "No especificado",
        barberNotAssigned: "Por asignar",
        addressNotSpecified: "No especificada",
        phoneNotSpecified: "No especificado",
        defaultName: "Tu Barbería",
        subject: `Cita confirmada - Folio: ${appointment.folio}`,
        textBody: `Cita confirmada\n\nFolio: ${appointment.folio}\n\nDetalles:`,
      };

      const emailHTML = `
        <!DOCTYPE html>
        <html lang="${T.lang}">
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
              <h1>${T.headerTitle}</h1>
              <p>${config.nombre || T.defaultName}</p>
            </div>

            <div class="folio-section">
              <div class="folio-label">${T.refLabel}</div>
              <div class="folio-value">${appointment.folio || "------"}</div>
              <div class="folio-help">${T.refHelp}</div>
            </div>

            <div class="content">
              <div class="section">
                <div class="section-title">${T.sectionDetails}</div>
                <div class="detail">
                  <span class="detail-label">${T.date}</span>
                  <span class="detail-value">${formattedDate}</span>
                </div>
                <div class="detail">
                  <span class="detail-label">${T.time}</span>
                  <span class="detail-value">${appointment.time || T.timeNotSpecified}</span>
                </div>
                <div class="detail">
                  <span class="detail-label">${T.service}</span>
                  <span class="detail-value">${service.name || T.serviceNotSpecified}</span>
                </div>
                <div class="detail">
                  <span class="detail-label">${T.barber}</span>
                  <span class="detail-value">${barber.name || T.barberNotAssigned}</span>
                </div>
                ${service.duration ? `
                <div class="detail">
                  <span class="detail-label">${T.duration}</span>
                  <span class="detail-value">${service.duration} ${T.durationUnit}</span>
                </div>
                ` : ""}
                ${service.price ? `
                <div class="detail">
                  <span class="detail-label">${T.price}</span>
                  <span class="detail-value">$${service.price}</span>
                </div>
                ` : ""}
              </div>

              ${config.direccion || config.telefono ? `
              <div class="section">
                <div class="section-title">${T.sectionLocation}</div>
                ${config.direccion ? `
                <div class="detail">
                  <span class="detail-label">${T.address}</span>
                  <span class="detail-value">${config.direccion}</span>
                </div>
                ` : ""}
                ${config.telefono ? `
                <div class="detail">
                  <span class="detail-label">${T.phone}</span>
                  <span class="detail-value"><a href="tel:${config.telefono}" style="color: #36B1DF; text-decoration: none;">${config.telefono}</a></span>
                </div>
                ` : ""}
              </div>
              ` : ""}

              <div class="info-box">
                ${T.infoBox}
              </div>
            </div>

            <div class="footer">
              <div class="footer-brand">${config.nombre || "BarberOS"}</div>
              <p>${T.footerNote}</p>
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
        subject: T.subject,
        html: emailHTML,
        text: `${T.textBody}\n${T.date} ${formattedDate}\n${T.time} ${appointment.time}\n${T.service} ${service.name || T.serviceNotSpecified}\n${T.barber} ${barber.name || T.barberNotAssigned}\n\n${T.address} ${config.direccion || T.addressNotSpecified}\n${T.phone} ${config.telefono || T.phoneNotSpecified}`
      });

      console.log(`[${slug}] Email enviado desde ${barbershopEmail} a ${appointment.client_email}`);
      return null;
    } catch (error) {
      console.error(`[${slug}] Error:`, error);
      return null;
    }
  }
);

// ================================================================
// GOOGLE CALENDAR — OAuth 2.0 por barbería
// ================================================================
// Setup (una sola vez):
//   1. Google Cloud Console → habilitar "Google Calendar API"
//   2. Credenciales → ID de cliente OAuth 2.0 (tipo "Aplicación web")
//      Redireccionamiento: https://barberos-app-mu.vercel.app/oauth/callback
//   3. Guardar el Client Secret:
//      firebase functions:secrets:set GOOGLE_OAUTH_CLIENT_SECRET
//   4. firebase deploy --only functions
//   5. En el panel admin → ⚙️ → "Conectar con Google Calendar" → autorizar
// ================================================================

const { google }  = require("googleapis");
const { onRequest } = require("firebase-functions/v2/https");
const GOOGLE_CLIENT_SECRET = defineSecret("GOOGLE_OAUTH_CLIENT_SECRET");
const GOOGLE_CLIENT_ID     = "258434171702-mi7qcvggike2c9bqi7mj4bev19m209f5.apps.googleusercontent.com";

// ── Helper: obtener cliente OAuth con tokens del dueño ──────────
async function getOAuthClientForSlug(slug) {
  const snap = await admin.database().ref(`barberias/${slug}/private/google_oauth`).once("value");
  const tokens = snap.val();
  if (!tokens?.access_token) return null;

  const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET.value(),
    "https://barberos-app-mu.vercel.app/oauth/callback"
  );
  oAuth2Client.setCredentials(tokens);

  // Auto-refresh si el token está próximo a expirar
  oAuth2Client.on("tokens", async (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    await admin.database().ref(`barberias/${slug}/private/google_oauth`).set(merged);
    console.log(`[${slug}] Token de Google Calendar renovado.`);
  });

  return oAuth2Client;
}

// ── 1. Intercambio del código de autorización por tokens ─────────
exports.exchangeGoogleOAuthCode = onRequest(
  { secrets: [GOOGLE_CLIENT_SECRET], cors: true },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { code, slug, redirect_uri, id_token } = req.body || {};
    if (!code || !slug || !redirect_uri || !id_token) {
      return res.status(400).json({ error: "Faltan parámetros: code, slug, redirect_uri, id_token" });
    }

    // Validar formato de slug (solo minúsculas, números y guiones)
    if (!/^[a-z0-9-]{1,50}$/.test(slug)) {
      return res.status(400).json({ error: "Slug inválido" });
    }

    // Validar que la barbería exista
    const slugSnap = await admin.database().ref(`barberias/${slug}/config`).once("value");
    if (!slugSnap.exists()) {
      return res.status(404).json({ error: "Barbería no encontrada" });
    }

    // SEGURIDAD: verificar que quien conecta sea el admin de ESTA barbería
    // (o un fundador). Sin esto, cualquiera podría secuestrar el calendario.
    const FOUNDER_UIDS = ["p8knfgFj1OXQkS6xKHSjtkPXEG43", "DFOJycimNmTyxBWVoMgESgXkP5p1"];
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(id_token);
    } catch (e) {
      return res.status(401).json({ error: "Sesión inválida. Inicia sesión de nuevo en el panel." });
    }
    const emailAdmin = slugSnap.val()?.email_admin || "";
    const isFounder  = FOUNDER_UIDS.includes(decoded.uid);
    const isAdmin    = decoded.email && emailAdmin &&
      decoded.email.toLowerCase() === String(emailAdmin).toLowerCase();
    if (!isFounder && !isAdmin) {
      console.warn(`[${slug}] Intento de conexión OAuth rechazado: ${decoded.email || decoded.uid}`);
      return res.status(403).json({ error: "No tienes permiso para conectar el calendario de esta barbería." });
    }

    try {
      const oAuth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET.value(),
        redirect_uri
      );

      const { tokens } = await oAuth2Client.getToken(code);

      // Guardar tokens en Firebase bajo la barbería
      await admin.database().ref(`barberias/${slug}/private/google_oauth`).set({
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expiry_date:   tokens.expiry_date   || null,
        token_type:    tokens.token_type    || "Bearer",
        scope:         tokens.scope         || "",
        connected_at:  new Date().toISOString(),
      });
      // Bandera pública (sin tokens) para que el panel sepa que está conectado
      await admin.database().ref(`barberias/${slug}/config/google_calendar_connected`).set(true);

      console.log(`[${slug}] Google Calendar conectado correctamente.`);
      return res.json({ success: true });

    } catch (err) {
      console.error(`[${slug}] Error al intercambiar código OAuth:`, err.message);
      return res.status(500).json({ error: err.message });
    }
  }
);

// ── 2. Crear evento en Google Calendar al crear una cita ─────────
exports.syncAppointmentToGoogleCalendar = onValueCreated(
  {
    ref: "/barberias/{slug}/citas/{citaId}",
    secrets: [GOOGLE_CLIENT_SECRET],
  },
  async (event) => {
    const slug        = event.params.slug;
    const citaId      = event.params.citaId;
    const appointment = event.data.val();

    if (!appointment.client || !appointment.date || !appointment.time) return null;

    try {
      const configSnap = await admin.database().ref(`barberias/${slug}/config`).once("value");
      const config     = configSnap.val() || {};

      // Si el dueño desconectó Google Calendar, no sincronizar
      if (config.google_calendar_connected === false) {
        console.log(`[${slug}] Google Calendar desconectado, omitiendo sync.`);
        return null;
      }

      // Obtener cliente OAuth con los tokens del dueño
      const auth = await getOAuthClientForSlug(slug);
      if (!auth) {
        console.log(`[${slug}] Sin tokens de Google Calendar, omitiendo sync.`);
        return null;
      }

      const calendar = google.calendar({ version: "v3", auth });

      // Datos de barbero y servicio
      const [barberSnap] = await Promise.all([
        appointment.barberId
          ? admin.database().ref(`barberias/${slug}/barberos/${appointment.barberId}`).once("value")
          : Promise.resolve({ val: () => ({}) }),
      ]);
      const barber  = barberSnap.val()  || {};
      const service = appointment.service || {};
      const duration = service.duration || 30;

      // Fechas
      const timeZone      = config.timezone || "America/Monterrey";
      const pad           = n => String(n).padStart(2, "0");
      const [h, m]        = appointment.time.split(":").map(Number);
      // Calculamos el end con aritmética de minutos para evitar problemas de zona horaria
      const startMins     = h * 60 + m;
      const endMins       = startMins + duration;
      const endH          = Math.floor(endMins / 60) % 24;
      const endM          = endMins % 60;
      // Si la cita cruza medianoche, sumamos un día a la fecha de fin
      const dayOverflow   = Math.floor(endMins / (24 * 60));
      let endDateStr      = appointment.date;
      if (dayOverflow > 0) {
        const d = new Date(appointment.date + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + dayOverflow);
        endDateStr = d.toISOString().split("T")[0];
      }
      const startDateTime = `${appointment.date}T${pad(h)}:${pad(m)}:00`;
      const endDateTime   = `${endDateStr}T${pad(endH)}:${pad(endM)}:00`;

      const statusIcon = { pendiente: "⏳", confirmada: "✅", completada: "✂️" }[appointment.status] || "📅";

      const gcalEvent = {
        summary: `${statusIcon} ${appointment.client} — ${service.name || "Cita"}`,
        description: [
          `📋 Folio: ${appointment.folio || citaId}`,
          `💈 Barbero: ${barber.name || "Por asignar"}`,
          `✂️ Servicio: ${service.name || "—"}`,
          `⏱ Duración: ${duration} min`,
          service.price ? `💰 Precio: $${service.price}` : "",
          `📞 Teléfono: ${appointment.phone || "—"}`,
          appointment.notes ? `📝 Notas: ${appointment.notes}` : "",
          `\n🏪 ${config.nombre || "Barbería"} · BarberOS by MBT`,
        ].filter(Boolean).join("\n"),
        location: config.direccion || config.nombre || "",
        start: { dateTime: startDateTime, timeZone },
        end:   { dateTime: endDateTime,   timeZone },
        colorId: appointment.status === "confirmada" ? "2" : "5",
        extendedProperties: {
          private: {
            barberos_slug:   slug,
            barberos_cita_id: citaId,
            barberos_folio:   appointment.folio || "",
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 30 },
            { method: "popup", minutes: 5  },
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: "primary",
        resource: gcalEvent,
      });

      // Guardar el event ID para futuras actualizaciones
      await admin.database()
        .ref(`barberias/${slug}/citas/${citaId}/google_event_id`)
        .set(response.data.id);

      console.log(`[${slug}] Evento creado: ${response.data.id}`);
      return null;

    } catch (err) {
      console.error(`[${slug}] Error Google Calendar:`, err.message, err.response?.data ? JSON.stringify(err.response.data) : '');
      return null;
    }
  }
);
