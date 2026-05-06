// ==================== BARBEROS ====================
export const INITIAL_BARBERS = [
  { 
    id: 1, 
    name: "Carlos Mendoza", 
    specialty: "Degradados & Navaja", 
    avatar: "CM", 
    color: "#b45309", 
    bg: "#fef3c7", 
    active: true 
  },
  { 
    id: 2, 
    name: "Luis Reyes", 
    specialty: "Clásicos & Peinados", 
    avatar: "LR", 
    color: "#1d4ed8", 
    bg: "#dbeafe", 
    active: true 
  },
  { 
    id: 3, 
    name: "Miguel Torres", 
    specialty: "Barbas & Diseños", 
    avatar: "MT", 
    color: "#065f46", 
    bg: "#d1fae5", 
    active: true 
  },
];

// ==================== SERVICIOS ====================
export const SERVICES = [
  { id: 1, name: "Corte clásico", duration: 30, price: 150, description: "Corte tradicional con tijera y máquina" },
  { id: 2, name: "Corte + barba", duration: 50, price: 220, description: "Corte completo con arreglo de barba" },
  { id: 3, name: "Degradado", duration: 40, price: 180, description: "Degradado profesional con técnica avanzada" },
  { id: 4, name: "Barba completa", duration: 30, price: 120, description: "Diseño y arreglo completo de barba" },
  { id: 5, name: "Corte infantil", duration: 25, price: 100, description: "Corte para niños menores de 12 años" },
  { id: 6, name: "Diseño + líneas", duration: 45, price: 200, description: "Diseños personalizados con líneas" },
];

// ==================== HORARIOS ====================
export const HOURS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30"
];

// ==================== ESTADOS DE CITA ====================
export const STATUS_COLORS = {
  pendiente: { bg: "#fef9c3", text: "#854d0e", dot: "#ca8a04", label: "Pendiente" },
  confirmada: { bg: "#dcfce7", text: "#14532d", dot: "#16a34a", label: "Confirmada" },
  completada: { bg: "#f0f9ff", text: "#0c4a6e", dot: "#0284c7", label: "Completada" },
  cancelada: { bg: "#fee2e2", text: "#7f1d1d", dot: "#dc2626", label: "Cancelada" },
};

// ==================== INFORMACIÓN DE LA BARBERÍA ====================
export const BARBERSHOP_INFO = {
  name: "BarberOS",
  tagline: "Tu Barbería Digital",
  address: "Av. Constitución #123, Monterrey, NL",
  phone: "81 1234 5678",
  email: "contacto@barberos.com",
  schedule: {
    weekdays: "09:00 - 20:00",
    saturday: "09:00 - 18:00",
    sunday: "Cerrado"
  },
  social: {
    instagram: "@barberos",
    facebook: "BarberOS"
  }
};

// ==================== CITAS DE EJEMPLO ====================
export const getInitialAppointments = () => {
  const today = new Date().toISOString().split("T")[0];
  
  return [
    { 
      id: 1, 
      client: "Roberto Sánchez", 
      phone: "81 1234 5678", 
      barberId: 1, 
      service: SERVICES[0], 
      date: today, 
      time: "09:00", 
      status: "confirmada", 
      notes: "",
      createdAt: new Date().toISOString()
    },
    { 
      id: 2, 
      client: "Andrés López", 
      phone: "81 9876 5432", 
      barberId: 2, 
      service: SERVICES[1], 
      date: today, 
      time: "10:00", 
      status: "pendiente", 
      notes: "Le gusta el degradado alto",
      createdAt: new Date().toISOString()
    },
    { 
      id: 3, 
      client: "José Martínez", 
      phone: "81 5555 1234", 
      barberId: 3, 
      service: SERVICES[3], 
      date: today, 
      time: "11:00", 
      status: "completada", 
      notes: "",
      createdAt: new Date().toISOString()
    },
    { 
      id: 4, 
      client: "Diego Flores", 
      phone: "81 4444 5678", 
      barberId: 1, 
      service: SERVICES[2], 
      date: today, 
      time: "12:00", 
      status: "pendiente", 
      notes: "",
      createdAt: new Date().toISOString()
    },
  ];
};
