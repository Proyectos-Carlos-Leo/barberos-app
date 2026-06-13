// ==================== FECHAS ====================
export const getTodayStr = () => {
  return new Date().toISOString().split("T")[0];
};

export const getNext7Days = (n = 7, idioma = 'es') => {
  const days = idioma === 'en'
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    : ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().split("T")[0],
      label: i === 0 ? (idioma === 'en' ? "Today" : "Hoy") : days[d.getDay()],
      num: d.getDate(),
      fullDate: d
    };
  });
};

export const formatDate = (dateStr, idioma = 'es') => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (idioma === 'en') {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
};

export const formatDateShort = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

// ==================== VALIDACIONES ====================
export const validatePhone = (phone) => {
  const cleaned = phone.replace(/\s/g, "");
  return cleaned.length >= 10;
};

export const validateName = (name) => {
  return name.trim().length >= 3;
};

// ==================== ALMACENAMIENTO LOCAL ====================
const STORAGE_KEY = "barberos_data";

export const saveToStorage = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Error guardando datos:", error);
    return false;
  }
};

export const loadFromStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error cargando datos:", error);
    return null;
  }
};

export const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    return false;
  }
};

// ==================== ESTADÍSTICAS ====================
export const calculateStats = (appointments) => {
  const today = getTodayStr();
  const todayAppts = appointments.filter(a => a.date === today);
  const todayCompleted = todayAppts.filter(a => a.status === "completada");
  
  return {
    todayTotal: todayAppts.length,
    pending: appointments.filter(a => a.status === "pendiente").length,
    confirmed: appointments.filter(a => a.status === "confirmada").length,
    completedToday: todayCompleted.length,
    cancelledToday: todayAppts.filter(a => a.status === "cancelada").length,
    revenueToday: todayCompleted.reduce((sum, a) => sum + (a.service?.price || 0) + (a.totalProductos || 0), 0),
    revenueCortesToday: todayCompleted.reduce((sum, a) => sum + (a.service?.price || 0), 0),
    revenueProductosToday: todayCompleted.reduce((sum, a) => sum + (a.totalProductos || 0), 0),
    totalRevenue: appointments
      .filter(a => a.status === "completada")
      .reduce((sum, a) => sum + (a.service?.price || 0) + (a.totalProductos || 0), 0)
  };
};

export const getBarberStats = (appointments, barberId) => {
  const today = getTodayStr();
  const barberAppts = appointments.filter(a => a.barberId === barberId);
  
  return {
    today: barberAppts.filter(a => a.date === today).length,
    completed: barberAppts.filter(a => a.status === "completada").length,
    revenue: barberAppts
      .filter(a => a.status === "completada")
      .reduce((sum, a) => sum + a.service.price, 0),
    pending: barberAppts.filter(a => a.status === "pendiente").length
  };
};

// ==================== FORMATEO ====================
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0
  }).format(amount);
};

export const generateId = () => {
  return Date.now() + Math.floor(Math.random() * 1000);
};

// ==================== FILTROS ====================
export const filterAppointments = (appointments, filters) => {
  return appointments.filter(a => {
    if (filters.date && filters.date !== "all" && a.date !== filters.date) return false;
    if (filters.barberId && filters.barberId !== "all" && String(a.barberId) !== String(filters.barberId)) return false;
    if (filters.status && filters.status !== "all" && a.status !== filters.status) return false;
    return true;
  });
};

export const getTakenTimes = (appointments, barberId, date) => {
  return appointments
    .filter(a => 
      String(a.barberId) === String(barberId) && 
      a.date === date && 
      a.status !== "cancelada"
    )
    .map(a => a.time);
};

// ==================== BLOQUEOS ====================
export const isTimeBlocked = (blocks, barberId, date, time) => {
  if (!blocks || blocks.length === 0) return false;

  return blocks.some(block => {
    // Verificar si aplica al barbero
    if (block.barberId !== 'all' && String(block.barberId) !== String(barberId)) return false;

    // Verificar fecha según tipo
    if (block.type === 'fullDay') {
      return block.date === date;
    }
    if (block.type === 'range') {
      return date >= block.date && date <= block.endDate;
    }
    if (block.type === 'hours') {
      return block.date === date && block.hours && block.hours.includes(time);
    }
    return false;
  });
};

export const getBlockedTimes = (blocks, barberId, date) => {
  if (!blocks || blocks.length === 0 || !barberId || !date) return [];

  const blocked = new Set();
  blocks.forEach(block => {
    if (block.barberId !== 'all' && String(block.barberId) !== String(barberId)) return;

    if (block.type === 'fullDay' && block.date === date) {
      // Bloquea todo el día — no devolvemos horas, devolvemos un flag
      blocked.add('FULL_DAY');
    }
    if (block.type === 'range' && date >= block.date && date <= block.endDate) {
      blocked.add('FULL_DAY');
    }
    if (block.type === 'hours' && block.date === date && block.hours) {
      block.hours.forEach(h => blocked.add(h));
    }
  });

  return Array.from(blocked);
};
