// Sistema simple de traducciones ES/EN
// Las claves son el texto en español (texto por defecto).
// Si el idioma es 'en', se busca la traducción; si no existe, se usa el español.

const en = {
  // ===== Pasos / Steps =====
  "Tus datos": "Your info",
  "Servicio": "Service",
  "Fecha y hora": "Date & time",
  "Confirmar": "Confirm",

  // ===== Validaciones =====
  "Ingresa tu nombre completo (mínimo 3 caracteres)": "Enter your full name (minimum 3 characters)",
  "Teléfono obligatorio (mínimo 10 dígitos)": "Phone number required (minimum 10 digits)",
  "Email válido obligatorio": "Valid email required",
  "Selecciona un barbero": "Select a barber",

  // ===== Alertas =====
  "⚠ Número de teléfono inválido": "⚠ Invalid phone number",
  "⚠ Nombre inválido": "⚠ Invalid name",
  "⚠ El nombre solo puede contener letras": "⚠ Name can only contain letters",
  "⚠ No puedes agendar citas en fechas pasadas": "⚠ You can't book appointments for past dates",
  "⚠ Ya tienes 2 citas para esta fecha con este número. Si necesitas más, contacta directamente a la barbería.": "⚠ You already have 2 appointments for this date with this number. If you need more, please contact the barbershop directly.",
  "⚠ Demasiadas citas en poco tiempo. Espera unos minutos.": "⚠ Too many bookings in a short time. Please wait a few minutes.",
  "⚠ Debes aceptar el aviso de privacidad para continuar": "⚠ You must accept the privacy notice to continue",

  // ===== Booking flow header =====
  "Agenda tu": "Book your",
  "cita": "appointment",
  "Reserva en línea de forma rápida y sencilla": "Book online, quick and easy",

  // ===== Step 1 =====
  "Paso 1: Tus datos": "Step 1: Your info",
  "Datos": "Personal",
  "personales": "info",
  "Y elige a tu barbero preferido": "And choose your preferred barber",
  "Nombre completo *": "Full name *",
  "Ej. Juan García": "E.g. John Smith",
  "Teléfono *": "Phone *",
  "Para confirmar tu cita por WhatsApp": "To confirm your appointment via text",
  "Email *": "Email *",
  "Te enviaremos la confirmación de tu cita": "We'll email you your appointment confirmation",
  "tu@email.com": "you@email.com",
  "Elige a tu barbero *": "Choose your barber *",
  "Siguiente →": "Next →",

  // ===== Step 2 =====
  "Paso 2: Servicio": "Step 2: Service",
  "¿Qué te": "What are you",
  "haces": "getting",
  "hoy?": "today?",
  "Selecciona el servicio que necesitas": "Select the service you need",
  "También disponible": "Also available",
  "Productos de la barbería": "Barbershop products",
  "AGOTADO": "SOLD OUT",
  "Últimas": "Only",
  "+ Agregar": "+ Add",
  "← Atrás": "← Back",
  "min": "min",

  // ===== Step 3 =====
  "Paso 3: Fecha y hora": "Step 3: Date & time",
  "¿Cuándo": "When",
  "puedes": "works",
  "Elige fecha y hora disponibles": "Choose an available date and time",
  "📅 Fecha": "📅 Date",
  "Este día no está disponible": "This day is not available",
  "Por favor elige otra fecha": "Please choose another date",
  "⏰ Hora disponible": "⏰ Available time",
  "Los horarios tachados no están disponibles": "Crossed-out times are not available",
  "Notas adicionales (opcional)": "Additional notes (optional)",
  "Ej. Degradado bajo, barba recortada...": "E.g. Low fade, trimmed beard...",

  // ===== Step 4 =====
  "Confirma tu cita": "Confirm your appointment",
  "Cliente": "Client",
  "Teléfono": "Phone",
  "Barbero": "Barber",
  "Duración": "Duration",
  "Fecha": "Date",
  "Hora": "Time",
  "Notas": "Notes",
  "Productos seleccionados": "Selected products",
  "Corte / servicio": "Haircut / service",
  "Productos": "Products",
  "Total a pagar": "Total to pay",
  "Pago en sucursal": "Payment at the shop",
  "Acepto el": "I accept the",
  "aviso de privacidad": "privacy notice",
  "y autorizo el uso de mis datos para gestionar mi cita.": "and authorize the use of my data to manage my appointment.",
  "← Editar": "← Edit",
  "Guardando...": "Saving...",
  "Confirmar cita ✓": "Confirm appointment ✓",

  // ===== Modal de privacidad =====
  "🔒 Aviso de Privacidad": "🔒 Privacy Notice",
  "Responsable del tratamiento de datos:": "Data controller:",
  "La barbería con la que estás agendando tu cita.": "The barbershop you're booking your appointment with.",
  "Datos que recabamos:": "Data we collect:",
  "Nombre completo": "Full name",
  "Número de teléfono": "Phone number",
  "Fecha y hora de cita": "Appointment date and time",
  "Servicio solicitado": "Requested service",
  "Finalidad:": "Purpose:",
  "Tus datos son usados ÚNICAMENTE para:": "Your data is used ONLY to:",
  "Confirmar y gestionar tu cita": "Confirm and manage your appointment",
  "Contactarte si hay cambios o cancelaciones": "Contact you if there are changes or cancellations",
  "Llevar un historial de servicios prestados": "Keep a record of services provided",
  "No compartimos:": "We don't share:",
  "Tus datos NO se venden, NO se comparten con terceros ni se usan para fines publicitarios o de marketing sin tu consentimiento expreso.": "Your data is NOT sold, NOT shared with third parties, and is never used for advertising or marketing without your express consent.",
  "Tus derechos (ARCO):": "Your rights:",
  "Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos en cualquier momento. Solo contacta directamente a la barbería.": "You have the right to access, correct, delete, or object to the processing of your data at any time. Simply contact the barbershop directly.",
  "Almacenamiento:": "Storage:",
  "Los datos se almacenan de forma segura en servidores con cifrado. Solo el administrador autorizado de la barbería puede acceder a la información completa.": "Data is stored securely on encrypted servers. Only the barbershop's authorized administrator can access the complete information.",
  "Este aviso cumple con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) de México.": "This notice complies with Mexico's Federal Law on the Protection of Personal Data Held by Private Parties (LFPDPPP).",
  "Aceptar y cerrar": "Accept and close",

  // ===== Success view =====
  "Cita": "Appointment",
  "agendada!": "booked!",
  "Te esperamos,": "We'll see you soon,",
  "Te atenderá": "You'll be served by",
  "Comprobante": "Receipt",
  "Total": "Total",
  "📍 Ubicación": "📍 Location",
  "Menciona tu folio al llegar para reclamarlos": "Mention your reference code when you arrive to claim them",
  "Total a pagar en tienda": "Total to pay in store",
  "Mientras esperas tu cita": "While you wait for your appointment",
  "Productos disponibles en nuestra barbería": "Products available at our barbershop",
  "Volver al inicio": "Back to home",
  "Agendar otra cita": "Book another appointment",
  "Conectando con Firebase...": "Connecting...",

  // ===== Landing (LoginScreen) =====
  "✂️ Agendar mi cita": "✂️ Book my appointment",
  "🎫 Ya tengo cita": "🎫 I already have an appointment",
  "⭐ Ver mis sellos": "⭐ View my stamps",
  "Productos disponibles": "Available products",
  "en tienda": "in store",
  "producto": "product",
  "productos": "products",

  // ===== CheckAppointment =====
  "⚠ El folio debe tener 6 caracteres": "⚠ The reference code must be 6 characters",
  "Para reagendar te llevamos a crear una nueva cita. ¿Deseas también cancelar la cita actual?": "To reschedule, we'll take you to create a new appointment. Do you also want to cancel the current one?",
  "Error al cancelar la cita. Intenta de nuevo.": "Error cancelling the appointment. Please try again.",
  "Pendiente de confirmación": "Pending confirmation",
  "Confirmada ✓": "Confirmed ✓",
  "Completada": "Completed",
  "Cancelada": "Cancelled",
  "← Volver": "← Back",
  "encontrada!": "found!",
  "Folio": "Reference",
  "Sin asignar": "Unassigned",
  "¿Necesitas cambios?": "Need to make changes?",
  "🔄 Reagendar mi cita": "🔄 Reschedule my appointment",
  "❌ Cancelar mi cita": "❌ Cancel my appointment",
  "Esta cita ya pasó. Para cambios contacta a la barbería.": "This appointment has already passed. For changes, contact the barbershop.",
  "Buscar otra": "Search again",
  "No encontramos tu cita": "We couldn't find your appointment",
  "El folio y/o teléfono no coinciden con ninguna cita registrada. Verifica los datos e intenta de nuevo.": "The reference code and/or phone number don't match any registered appointment. Check your details and try again.",
  "Intentar de nuevo": "Try again",
  "Buscar mi": "Find my",
  "Ingresa tu folio y teléfono para ver tu cita": "Enter your reference code and phone number to view your appointment",
  "Folio de tu cita *": "Your appointment reference *",
  "Ej. ABC123": "E.g. ABC123",
  "6 caracteres que recibiste al agendar": "The 6 characters you received when booking",
  "Tu teléfono *": "Your phone *",
  "🔍 Buscar mi cita": "🔍 Find my appointment",
  "¿Cancelar cita?": "Cancel appointment?",
  "será cancelada. Esta acción no se puede deshacer.": "will be cancelled. This action cannot be undone.",
  "Tu cita del": "Your appointment on",
  "a las": "at",
  "No, regresar": "No, go back",
  "Cancelando...": "Cancelling...",
  "Sí, cancelar": "Yes, cancel",

  // ===== MyStamps =====
  "⚠ Ingresa un teléfono válido": "⚠ Enter a valid phone number",
  "⚠ Ya tienes un canje pendiente. Espera a que el administrador lo revise.": "⚠ You already have a pending redemption. Please wait for the admin to review it.",
  "⚠ Demasiadas solicitudes. Intenta de nuevo mañana.": "⚠ Too many requests. Please try again tomorrow.",
  "El administrador deberá aprobarlo antes de aplicarse.": "The admin must approve it before it's applied.",
  "Error al solicitar el canje. Verifica que tengas conexión.": "Error requesting the redemption. Check your connection.",
  "Programa no disponible": "Program not available",
  "Esta barbería no tiene activo el programa de lealtad.": "This barbershop doesn't have the loyalty program active.",
  "Tienes": "You have",
  "sello": "stamp",
  "sellos": "stamps",
  "Sin": "No",
  "todavía": "yet",
  "Hola,": "Hi,",
  "⏳ Tienes un canje PENDIENTE de aprobación": "⏳ You have a redemption PENDING approval",
  "El administrador lo revisará pronto": "The admin will review it soon",
  "Tarjeta de lealtad": "Loyalty card",
  "🎁 ¡Puedes canjear tu": "🎁 You can redeem your",
  "Solo": "Only",
  "más para obtener:": "more to get:",
  "🏆 Has canjeado": "🏆 You've redeemed",
  "premio": "reward",
  "premios": "rewards",
  "antes": "before",
  "Enviando...": "Sending...",
  "🎁 Canjear mi": "🎁 Redeem my",
  "✓ Solicitud enviada": "✓ Request sent",
  "El administrador revisará tu canje pronto. Muestra esta pantalla al pasar.": "The admin will review your redemption soon. Show this screen when you visit.",
  "Total gastado": "Total spent",
  "Visitas totales": "Total visits",
  "Cada vez que vengas a cortarte y completes tu cita, ganarás": "Every time you come in and complete your appointment, you'll earn",
  "1 sello": "1 stamp",
  "Junta": "Collect",
  "y obtén": "and get",
  "Buscar otro": "Search again",
  "Agendar mi 1ra cita": "Book my 1st appointment",
  "Mis": "My",
  "El mismo que usaste al agendar tus citas": "The same one you used when booking your appointments",
  "🔍 Ver mis sellos": "🔍 View my stamps",
};

/**
 * Devuelve una función t(texto, vars?) que traduce según el idioma de la barbería.
 * - idioma: 'es' (default) o 'en'
 * - Si no hay traducción, devuelve el texto original en español.
 * - vars: objeto para interpolar {clave} dentro del texto traducido.
 */
export function useT(idioma) {
  const isEN = idioma === 'en';
  return (text, vars) => {
    let str = isEN ? (en[text] ?? text) : text;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.split(`{${k}}`).join(v);
      });
    }
    return str;
  };
}
