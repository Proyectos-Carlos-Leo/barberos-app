# 💈 BarberOS

> Sistema profesional de agendamiento de citas para barberías.

Una aplicación web moderna que permite a tus clientes agendar citas en línea y a ti gestionarlas desde un panel de administrador en tiempo real.

![BarberOS Banner](https://img.shields.io/badge/BarberOS-v1.0.0-c9a84c?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite)

---

## ✨ Características

### 👤 Vista Cliente
- ✅ Agendamiento en 4 pasos sencillos
- ✅ Selección de barbero, servicio, fecha y hora
- ✅ Horarios ocupados se ocultan automáticamente
- ✅ Confirmación con comprobante digital
- ✅ Validación en tiempo real

### ⚙️ Panel Administrador
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Gestión de citas (pendiente → confirmada → completada)
- ✅ Filtros por fecha, barbero y estado
- ✅ Gestión completa de equipo de barberos
- ✅ Historial de citas completadas
- ✅ Métricas e ingresos por barbero

### 🔄 Sincronización Automática
- ✅ Cambios reflejados al instante entre cliente y admin
- ✅ Sincronización entre pestañas del navegador (BroadcastChannel)
- ✅ Persistencia automática en localStorage
- ✅ Notificaciones en tiempo real

---

## 🚀 Instalación

### Requisitos
- Node.js 18+ ([Descargar](https://nodejs.org))
- npm o yarn

### Pasos

```bash
# 1. Instala las dependencias
npm install

# 2. Inicia la aplicación
npm run dev

# 3. Abre el navegador
# http://localhost:3000
```

### Build para Producción

```bash
# Genera los archivos optimizados
npm run build

# Vista previa del build
npm run preview
```

Los archivos optimizados se generan en la carpeta `dist/` lista para subir a cualquier hosting.

---

## 📁 Estructura del Proyecto

```
barberos-app/
│
├── public/                      # Archivos estáticos
│   └── barber-icon.svg          # Favicon
│
├── src/
│   ├── components/              # Componentes React
│   │   ├── LoginScreen.jsx      # Pantalla de selección de rol
│   │   ├── ClientView.jsx       # Vista del cliente (agendar)
│   │   ├── AdminView.jsx        # Vista del administrador
│   │   ├── Header.jsx           # Barra superior
│   │   └── Notifications.jsx    # Sistema de notificaciones
│   │
│   ├── context/
│   │   └── AppContext.jsx       # Estado global y sincronización
│   │
│   ├── utils/
│   │   ├── data.js              # Datos iniciales y constantes
│   │   └── helpers.js           # Funciones auxiliares
│   │
│   ├── styles/
│   │   └── global.css           # Estilos globales
│   │
│   ├── App.jsx                  # Componente raíz con rutas
│   └── main.jsx                 # Punto de entrada
│
├── index.html                   # HTML principal
├── package.json                 # Dependencias y scripts
├── vite.config.js               # Configuración de Vite
└── README.md                    # Esta documentación
```

---

## 🎨 Personalización

### Cambiar la información de la barbería

Edita `src/utils/data.js`:

```javascript
export const BARBERSHOP_INFO = {
  name: "Tu Barbería",
  tagline: "Tu eslogan",
  address: "Tu dirección",
  phone: "Tu teléfono",
  email: "tu@email.com",
  // ...
};
```

### Modificar servicios y precios

```javascript
export const SERVICES = [
  { 
    id: 1, 
    name: "Corte clásico", 
    duration: 30,           // minutos
    price: 150,             // pesos
    description: "..."
  },
  // Agrega más servicios
];
```

### Configurar horarios disponibles

```javascript
export const HOURS = [
  "09:00", "09:30", "10:00",
  // ... agrega los horarios que quieras
];
```

### Cambiar colores del tema

Edita `src/styles/global.css` y reemplaza `#c9a84c` (dorado) por tu color preferido.

---

## 🔧 Tecnologías Utilizadas

- **React 18** - Biblioteca de UI
- **React Router 6** - Enrutamiento
- **Vite** - Build tool ultra rápido
- **CSS-in-JS + CSS Modules** - Estilos
- **Context API** - Manejo de estado global
- **BroadcastChannel API** - Sincronización entre pestañas
- **localStorage** - Persistencia de datos

---

## 📊 Cómo Funciona la Sincronización

### Entre Vistas (misma pestaña)
Las vistas comparten estado a través de **Context API** de React. Cuando el cliente agenda una cita, automáticamente aparece en el panel del admin.

### Entre Pestañas (navegador)
Usamos **BroadcastChannel API** para sincronización en tiempo real:

```
Cliente (Pestaña 1) → BroadcastChannel → Admin (Pestaña 2)
```

Los cambios se propagan instantáneamente entre todas las pestañas abiertas.

### Persistencia
Los datos se guardan automáticamente en `localStorage`, así que no se pierden al cerrar el navegador.

---

## 🌐 URLs de la Aplicación

Una vez corriendo:

- **Pantalla principal**: `http://localhost:3000/`
- **Vista del cliente**: `http://localhost:3000/cliente`
- **Panel del admin**: `http://localhost:3000/admin`

---

## 🚢 Despliegue

### Opción 1: Vercel (Más fácil)

```bash
npm install -g vercel
vercel
```

### Opción 2: Netlify

1. Conecta tu repositorio en netlify.com
2. Build command: `npm run build`
3. Publish directory: `dist`

### Opción 3: Hosting tradicional

```bash
npm run build
# Sube el contenido de dist/ a tu hosting
```

---

## 🎯 Próximos Pasos Recomendados

Para llevar la aplicación a producción real, considera:

1. **🔐 Autenticación**: Agregar login para el admin
2. **🗄️ Base de datos**: Migrar a Firebase o Supabase
3. **📧 Notificaciones**: Email/SMS de confirmación
4. **💳 Pagos**: Integrar Mercado Pago o Stripe
5. **📱 PWA**: Convertir en app instalable
6. **📅 Google Calendar**: Sincronizar con calendarios
7. **📊 Reportes**: Exportar a Excel/PDF
8. **🌍 Multi-sucursal**: Soporte para varias ubicaciones

---

## 🐛 Solución de Problemas

### El servidor no inicia
```bash
# Limpia node_modules y reinstala
rm -rf node_modules package-lock.json
npm install
```

### Las citas no se sincronizan
- Verifica que ambas vistas estén abiertas en el mismo navegador
- BroadcastChannel funciona en Chrome, Firefox, Edge (no Safari iOS antiguo)

### Los datos se pierden
- Los datos se guardan en localStorage
- Verifica que tu navegador no esté en modo privado
- En modo privado, los datos solo persisten durante la sesión

---

## 📜 Licencia

Este proyecto fue creado como sistema demo para barberías.

---

## 👨‍💼 Soporte

Para dudas o personalizaciones, contacta al desarrollador.

---

**Hecho con 💈 para barberos profesionales**
