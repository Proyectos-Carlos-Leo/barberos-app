// Script de referencia para crear una barbería en Firebase
// Ejecutar manualmente en la consola de Firebase o usar este como guía

export const BARBERIA_TEMPLATE = {
  config: {
    nombre: "Mi Barbería",
    eslogan: "Cortes con estilo",
    telefono: "81 1234 5678",
    direccion: "Calle Principal #123, Monterrey, NL",
    email_admin: "dueno@mibarberia.com",
    horario: "Lun-Sáb 9:00am - 8:00pm",
    plan: "basico",
    activa: true,
    createdAt: new Date().toISOString()
  },
  barberos: {
    // Firebase generará los IDs automáticamente al hacer push
  },
  citas: {},
  bloqueos: {}
};

// Estructura en Firebase Realtime Database:
// barberias/
//   {slug}/
//     config/
//       nombre: string
//       eslogan: string
//       telefono: string
//       direccion: string
//       email_admin: string  ← IMPORTANTE: debe coincidir con Firebase Auth
//       horario: string
//       activa: boolean
//     barberos/
//       {id}/
//         name: string
//         specialty: string
//         avatar: string
//         active: boolean
//     citas/
//       {id}/
//         client: string
//         phone: string
//         barberId: string
//         service: object
//         date: string
//         time: string
//         status: string
//     bloqueos/
//       {id}/
//         ...
