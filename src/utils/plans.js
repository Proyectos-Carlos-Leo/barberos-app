// ==================== PLANES DE SUSCRIPCIÓN ====================
// Fuente única de verdad para los límites y features de cada plan.
// El plan de cada barbería vive en Firebase: barberias/{slug}/config/plan
// Si una barbería no tiene plan asignado, se asume 'premium' para no
// romper las barberías existentes (el fundador puede bajarla después).

export const PLANS = {
  basico: {
    id: 'basico',
    nombre: 'Básico',
    color: '#60a5fa',
    icon: '🌱',
    maxBarberos: 1,
    maxCitasMes: 150,
    reportes: false,
    inventario: false,   // tab Productos en admin
    lealtad: false,      // programa de sellos
    catalogo: false,     // catálogo de productos visible al cliente
    crm: false,          // tab Clientes (mini-CRM)
  },
  profesional: {
    id: 'profesional',
    nombre: 'Profesional',
    color: '#36B1DF',
    icon: '💈',
    maxBarberos: 3,
    maxCitasMes: 400,
    reportes: true,
    inventario: true,
    lealtad: false,
    catalogo: false,
    crm: true,
  },
  premium: {
    id: 'premium',
    nombre: 'Premium',
    color: '#f59e0b',
    icon: '⭐',
    maxBarberos: null,   // null = ilimitado
    maxCitasMes: null,
    reportes: true,
    inventario: true,
    lealtad: true,
    catalogo: true,
    crm: true,
  },
  multisucursal: {
    id: 'multisucursal',
    nombre: 'Multi-sucursal',
    color: '#a78bfa',
    icon: '🏢',
    maxBarberos: null,
    maxCitasMes: null,
    reportes: true,
    inventario: true,
    lealtad: true,
    catalogo: true,
    crm: true,
  },
};

// Obtiene el plan efectivo de una barbería desde su config
export const getPlan = (config) => PLANS[config?.plan] || PLANS.premium;

// Link de WhatsApp para mejorar plan (incluye el slug para saber quién escribe)
export const upgradeWhatsAppUrl = (slug) =>
  'https://wa.me/528126947207?text=' +
  encodeURIComponent(`Hola, quiero mejorar mi plan de BarberOS${slug ? ` (barbería: ${slug})` : ''}`);

// Cuenta las citas del mes actual (excluye canceladas) — para el límite mensual
export const citasDelMes = (appointments) => {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return appointments.filter(a => a.date?.startsWith(prefix) && a.status !== 'cancelada').length;
};
