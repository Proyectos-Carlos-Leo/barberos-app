// ==================== BRAND ICONS — BarberOS by MBT ====================
// Librería de íconos SVG en línea, estilo neón, con acento de florecita
// (la firma visual de la marca). Reemplaza los emojis usados en la app.
//
// Uso:  import { IconCalendar, IconGanancias } from './icons/BrandIcons';
//       <IconCalendar size={20} />
//
// Cada ícono acepta:
//   size  — ancho/alto en px (default 24)
//   glow  — si aplica el resplandor neón (default true)
//   color — sobreescribe el color de marca del ícono (opcional)

import React from 'react';

// ---- Acento compartido: florecita de 5 pétalos ----
// Se coloca en la esquina inferior derecha de cada ícono, tal como en el set original.
function FlowerAccent({ color, cx = 18.5, cy = 18.5, r = 2.6 }) {
  const petals = [0, 72, 144, 216, 288];
  return (
    <g stroke={color} strokeWidth="1" fill="none" strokeLinecap="round">
      {petals.map((deg, i) => (
        <ellipse
          key={i}
          cx={cx}
          cy={cy - r}
          rx={r * 0.42}
          ry={r * 0.62}
          transform={`rotate(${deg} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.32} fill={color} stroke="none" />
    </g>
  );
}

// ---- Wrapper base: aplica glow, tamaño y viewBox consistente ----
function IconBase({ size, glow, color, children, viewBox = '0 0 24 24' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={glow ? { filter: `drop-shadow(0 0 3px ${color}aa) drop-shadow(0 0 7px ${color}55)` } : undefined}
    >
      {children}
    </svg>
  );
}

const strokeProps = (color) => ({
  stroke: color,
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'none',
});

// ==================== PALETA DE MARCA ====================
export const ICON_COLORS = {
  cyan: '#22d3ee',
  gold: '#fbbf24',
  lime: '#a3e635',
  blue: '#60a5fa',
  red: '#f87171',
  purple: '#a78bfa',
  green: '#4ade80',
  magenta: '#e879f9',
};

// ==================== SET 1 — DE LA IMAGEN VERTICAL ====================

// Navaja de barbero (cyan)
export function IconNavaja({ size = 24, glow = true, color = ICON_COLORS.cyan }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <path d="M5 19 L15 9 A2 2 0 0 0 15 6 L5 16" {...s} />
      <path d="M15 6 L19 2" {...s} />
      <path d="M5 16 L4 17 L5 19 L7 18 Z" {...s} />
      <FlowerAccent color={color} cx={17.5} cy={16.5} r={2.4} />
    </IconBase>
  );
}

// Premium — destellos (dorado)
export function IconPremium({ size = 24, glow = true, color = ICON_COLORS.gold }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <path d="M9 3 L10.4 7.6 L15 9 L10.4 10.4 L9 15 L7.6 10.4 L3 9 L7.6 7.6 Z" {...s} />
      <path d="M17.5 11 L18.2 13 L20 13.7 L18.2 14.4 L17.5 16.4 L16.8 14.4 L15 13.7 L16.8 13 Z" {...s} strokeWidth={1.3} />
    </IconBase>
  );
}

// Descanso — sombrilla de playa (cyan)
export function IconDescanso({ size = 24, glow = true, color = ICON_COLORS.cyan }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <path d="M4 9 A6 5 0 0 1 16 9 Z" {...s} />
      <path d="M10 9 L10 15" {...s} />
      <path d="M6 14 L14 14 L12.5 17 L4.5 17 Z" {...s} strokeWidth={1.4} />
      <path d="M4.5 17 L3 19" {...s} strokeWidth={1.4} />
      <FlowerAccent color={color} cx={17.5} cy={16.5} r={2.3} />
    </IconBase>
  );
}

// Lista — portapapeles (cyan)
export function IconLista({ size = 24, glow = true, color = ICON_COLORS.cyan }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <rect x="5" y="4" width="11" height="15" rx="1.5" {...s} />
      <path d="M8.5 3.3 A1.5 1.3 0 0 1 11.5 3.3 L11.5 5 L8.5 5 Z" {...s} />
      <circle cx="8" cy="9.5" r="0.6" fill={color} stroke="none" />
      <path d="M10.5 9.5 L14 9.5" {...s} strokeWidth={1.3} />
      <circle cx="8" cy="13" r="0.6" fill={color} stroke="none" />
      <path d="M10.5 13 L14 13" {...s} strokeWidth={1.3} />
      <FlowerAccent color={color} cx={16.3} cy={17} r={2.3} />
    </IconBase>
  );
}

// Crecimiento — brote con hojas (verde lima)
export function IconCrecimiento({ size = 24, glow = true, color = ICON_COLORS.lime }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <path d="M12 20 L12 12" {...s} />
      <path d="M12 13 C 8 13, 6 10, 6 6 C 10 6, 12 9, 12 13 Z" {...s} />
      <path d="M12 12 C 16 12, 18 9, 18 5 C 14 5, 12 8, 12 12 Z" {...s} />
      <path d="M3 20 L8.5 20" {...s} strokeDasharray="1.5 2" />
      <path d="M15.5 20 L21 20" {...s} strokeDasharray="1.5 2" />
      <FlowerAccent color={color} cx={12} cy={20.4} r={2.1} />
    </IconBase>
  );
}

// ==================== SET 2 — GRID DE 20 ====================

// Calendar (azul)
export function IconCalendar({ size = 24, glow = true, color = ICON_COLORS.blue }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <rect x="3.5" y="5" width="14" height="13" rx="1.5" {...s} />
      <path d="M7 3.3 L7 6.7 M14 3.3 L14 6.7 M3.5 9 L17.5 9" {...s} />
      <circle cx="6.7" cy="12" r="0.7" fill={color} stroke="none" />
      <circle cx="10" cy="12" r="0.7" fill={color} stroke="none" />
      <circle cx="13.3" cy="12" r="0.7" fill={color} stroke="none" />
      <circle cx="6.7" cy="15" r="0.7" fill={color} stroke="none" />
      <circle cx="10" cy="15" r="0.7" fill={color} stroke="none" />
      <FlowerAccent color={color} cx={18} cy={16.5} r={2.2} />
    </IconBase>
  );
}

// View reports — barras con flecha (azul)
export function IconReportes({ size = 24, glow = true, color = ICON_COLORS.blue }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <path d="M4 18 L4 13 M8 18 L8 10 M12 18 L12 14.5" {...s} />
      <path d="M4 9 L9 5.5 L12.5 8 L18 3" {...s} />
      <path d="M14.3 3 L18 3 L18 6.5" {...s} />
      <FlowerAccent color={color} cx={17.5} cy={17} r={2.3} />
    </IconBase>
  );
}

// Block time slot (rojo)
export function IconBloquear({ size = 24, glow = true, color = ICON_COLORS.red }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <circle cx="10" cy="11" r="7.2" {...s} />
      <path d="M5 6 L15 16" {...s} />
      <FlowerAccent color={color} cx={17.5} cy={5} r={2} />
    </IconBase>
  );
}

// Edit services — sliders (azul)
export function IconServicios({ size = 24, glow = true, color = ICON_COLORS.blue }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <path d="M3.5 6 L20.5 6" {...s} />
      <circle cx="9" cy="6" r="1.7" fill="#0a0a0a" {...s} />
      <path d="M3.5 12 L20.5 12" {...s} />
      <circle cx="15" cy="12" r="1.7" fill="#0a0a0a" {...s} />
      <path d="M3.5 18 L20.5 18" {...s} />
      <circle cx="11" cy="18" r="1.7" fill="#0a0a0a" {...s} />
    </IconBase>
  );
}

// Barbería — poste de barbero (cyan)
export function IconBarberia({ size = 24, glow = true, color = ICON_COLORS.cyan }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <rect x="8" y="3" width="8" height="18" rx="4" {...s} />
      <path d="M8.3 6 L15.7 10 M8.3 10 L15.7 14 M8.3 14 L15.7 18" {...s} strokeWidth={1.4} />
      <FlowerAccent color={color} cx={18.3} cy={18.5} r={2.2} />
    </IconBase>
  );
}

// Popular — flama (dorado)
export function IconPopular({ size = 24, glow = true, color = ICON_COLORS.gold }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <path d="M12 2.5 C 8 7, 6 10, 6 13.5 C 6 17.5, 8.7 20 12 20 C 15.3 20 18 17.5 18 13.5 C 18 11.5, 17 10, 16 9 C 16 11, 14.7 12, 13.5 12 C 14.5 8, 13 5, 12 2.5 Z" {...s} />
      <path d="M10.3 15 C 10.3 16.8, 11 17.8, 12 17.8 C 13 17.8, 13.7 16.8, 13.7 15 C 13.7 13.6, 12.8 12.7, 12 11.5 C 11.2 12.7, 10.3 13.6, 10.3 15 Z" {...s} strokeWidth={1.3} />
    </IconBase>
  );
}

// Barba — rostro con barba (cyan)
export function IconBarba({ size = 24, glow = true, color = ICON_COLORS.cyan }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <path d="M7 8 C 7 4.5, 9.2 2.5, 12 2.5 C 14.8 2.5, 17 4.5, 17 8 C 17 9.5, 16.7 10.7, 16.2 11.7" {...s} />
      <path d="M7 8 C 6 8, 5.3 9, 5.5 10.3 C 5.7 11.5, 6.6 12, 7.3 11.8" {...s} strokeWidth={1.3} />
      <path d="M16.2 11.7 C 16.9 12, 17.8 11.5, 18 10.3 C 18.2 9, 17.5 8, 16.5 8" {...s} strokeWidth={1.3} />
      <path d="M7.3 11 C 7.3 15.5, 9.3 19.5, 12 19.5 C 14.7 19.5, 16.7 15.5, 16.7 11" {...s} />
      <path d="M9.5 9.5 C 9.5 9.5, 10.5 10.3, 12 10.3 C 13.5 10.3, 14.5 9.5, 14.5 9.5" {...s} strokeWidth={1.3} />
      <circle cx="9.3" cy="7.5" r="0.5" fill={color} stroke="none" />
      <circle cx="14.7" cy="7.5" r="0.5" fill={color} stroke="none" />
      <FlowerAccent color={color} cx={18.3} cy={18} r={2} />
    </IconBase>
  );
}

// Cliente joven — rostro sin barba (cyan)
export function IconClienteJoven({ size = 24, glow = true, color = ICON_COLORS.cyan }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <path d="M7.3 10.5 C 7.3 6, 9.3 2.8, 12 2.8 C 14.7 2.8, 16.7 6, 16.7 10.5 C 16.7 15.3, 14.7 18.5, 12 18.5 C 9.3 18.5, 7.3 15.3, 7.3 10.5 Z" {...s} />
      <path d="M6.3 20.5 C 6.3 18, 8.5 16.3, 12 16.3 C 15.5 16.3, 17.7 18, 17.7 20.5" {...s} strokeWidth={1.4} />
      <circle cx="9.6" cy="10" r="0.5" fill={color} stroke="none" />
      <circle cx="14.4" cy="10" r="0.5" fill={color} stroke="none" />
      <path d="M10.3 13.3 C 10.3 13.3, 11 14, 12 14 C 13 14, 13.7 13.3, 13.7 13.3" {...s} strokeWidth={1.3} />
      <FlowerAccent color={color} cx={18.3} cy={19.5} r={2} />
    </IconBase>
  );
}

// Móvil (cyan)
export function IconMovil({ size = 24, glow = true, color = ICON_COLORS.cyan }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <rect x="7" y="2.5" width="9" height="16" rx="1.8" {...s} />
      <path d="M10.5 16 L12.5 16" {...s} strokeWidth={1.4} />
      <FlowerAccent color={color} cx={17.5} cy={17.5} r={2.2} />
    </IconBase>
  );
}

// Rápido — rayo (azul)
export function IconRapido({ size = 24, glow = true, color = ICON_COLORS.blue }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <path d="M13 2.5 L5.5 13 L11 13 L9.5 21.5 L18.5 10 L12.5 10 Z" {...s} />
      <FlowerAccent color={color} cx={19} cy={18.5} r={2} />
    </IconBase>
  );
}

// Tiempo — reloj (morado)
export function IconTiempo({ size = 24, glow = true, color = ICON_COLORS.purple }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <circle cx="10.5" cy="10.5" r="7.5" {...s} />
      <path d="M10.5 6.2 L10.5 10.5 L13.8 12.6" {...s} />
      <FlowerAccent color={color} cx={18} cy={17.5} r={2.2} />
    </IconBase>
  );
}

// Vista — ojo (azul)
export function IconVista({ size = 24, glow = true, color = ICON_COLORS.blue }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <path d="M2.5 11 C 5.5 6, 9 4, 12.5 6 C 16 8, 18.5 11, 18.5 11 C 18.5 11, 16 15, 12.5 16.5 C 9 18, 5.5 16, 2.5 11 Z" {...s} />
      <circle cx="10.5" cy="11" r="3" {...s} />
      <circle cx="10.5" cy="11" r="1" fill={color} stroke="none" />
    </IconBase>
  );
}

// Ganancias — signo de pesos en círculo (verde)
export function IconGanancias({ size = 24, glow = true, color = ICON_COLORS.green }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <circle cx="10.5" cy="10.5" r="7.5" {...s} />
      <path d="M12.7 7.3 C 12.2 6.9, 11.4 6.6, 10.5 6.6 C 9 6.6, 7.8 7.5, 7.8 8.6 C 7.8 9.7, 9 10.2, 10.5 10.6 C 12 11, 13.2 11.5, 13.2 12.6 C 13.2 13.7, 12 14.6, 10.5 14.6 C 9.4 14.6, 8.4 14.2, 7.9 13.6" {...s} strokeWidth={1.5} />
      <path d="M10.5 5 L10.5 16" {...s} strokeWidth={1.3} />
      <FlowerAccent color={color} cx={18} cy={17.5} r={2.2} />
    </IconBase>
  );
}

// Factura — recibo (cyan)
export function IconFactura({ size = 24, glow = true, color = ICON_COLORS.cyan }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <path d="M6 2.5 L15 2.5 L15 19.5 L13 18 L11.3 19.5 L9.6 18 L7.9 19.5 L6 18 Z" {...s} />
      <path d="M8.3 6.5 L12.7 6.5 M8.3 9.5 L12.7 9.5 M8.3 12.5 L11 12.5" {...s} strokeWidth={1.3} />
      <FlowerAccent color={color} cx={17.5} cy={16.5} r={2.2} />
    </IconBase>
  );
}

// Completado — check en círculo (verde)
export function IconCompletado({ size = 24, glow = true, color = ICON_COLORS.green }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <circle cx="10.5" cy="10.5" r="7.5" {...s} />
      <path d="M7.3 10.7 L9.5 13 L14 8" {...s} />
      <FlowerAccent color={color} cx={18} cy={17.5} r={2.2} />
    </IconBase>
  );
}

// Paquete — caja 3D (azul)
export function IconPaquete({ size = 24, glow = true, color = ICON_COLORS.blue }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <path d="M11 3 L18.5 7 L18.5 15 L11 19 L3.5 15 L3.5 7 Z" {...s} />
      <path d="M3.5 7 L11 11 L18.5 7 M11 11 L11 19" {...s} />
      <path d="M7 5 L14.5 9" {...s} strokeWidth={1.3} />
      <FlowerAccent color={color} cx={18} cy={17.5} r={2} />
    </IconBase>
  );
}

// Email — sobre (cyan)
export function IconEmail({ size = 24, glow = true, color = ICON_COLORS.cyan }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <rect x="2.5" y="5" width="15" height="11" rx="1.5" {...s} />
      <path d="M3 5.8 L10 11 L17 5.8" {...s} />
      <FlowerAccent color={color} cx={18.5} cy={17.5} r={2.2} />
    </IconBase>
  );
}

// Notificaciones — campana (dorado)
export function IconNotificaciones({ size = 24, glow = true, color = ICON_COLORS.gold }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <path d="M9 4.3 C 9 3, 10.1 2, 11.3 2 C 12.5 2, 13.5 3, 13.5 4.3 C 16 5.3, 17 8, 17 11 C 17 14.5, 18 15.5, 18 15.5 L 4.5 15.5 C 4.5 15.5, 5.5 14.5, 5.5 11 C 5.5 8, 6.5 5.3, 9 4.3 Z" {...s} />
      <path d="M9.3 16.3 C 9.3 17.5, 10.2 18.5, 11.3 18.5 C 12.4 18.5, 13.3 17.5, 13.3 16.3" {...s} strokeWidth={1.3} />
      <FlowerAccent color={color} cx={18.5} cy={5} r={2.2} />
    </IconBase>
  );
}

// Configuración — engrane con florecita al centro (azul)
export function IconConfiguracion({ size = 24, glow = true, color = ICON_COLORS.blue }) {
  const s = strokeProps(color);
  const teeth = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <circle cx="10.5" cy="10.5" r="5.5" {...s} />
      {teeth.map((deg) => (
        <path
          key={deg}
          d="M10.5 3.3 L10.5 5.3"
          {...s}
          strokeWidth={1.8}
          transform={`rotate(${deg} 10.5 10.5)`}
        />
      ))}
      <FlowerAccent color={color} cx={10.5} cy={10.5} r={2.2} />
    </IconBase>
  );
}

// Apariencia — paleta y pincel (magenta)
export function IconApariencia({ size = 24, glow = true, color = ICON_COLORS.magenta }) {
  const s = strokeProps(color);
  return (
    <IconBase size={size} glow={glow} color={color}>
      <path d="M10 3 C 5 3, 2 6.5, 2 10.5 C 2 13.5, 4 14.5, 5.5 14.5 C 6.5 14.5, 6.7 13.7, 6.2 13 C 5.7 12.3, 6.2 11.3, 7.2 11.3 L 13 11.3 C 16 11.3, 18 9, 18 6.3 C 18 4.3, 14.5 3, 10 3 Z" {...s} />
      <circle cx="6.3" cy="7.3" r="0.9" fill={color} stroke="none" />
      <circle cx="9.7" cy="5.7" r="0.9" fill={color} stroke="none" />
      <circle cx="13.5" cy="6.3" r="0.9" fill={color} stroke="none" />
      <path d="M15 13 L20.5 18.5 C 21 19, 21 19.8, 20.5 20.3 C 20 20.8, 19.2 20.8, 18.7 20.3 L 13.2 14.8" {...s} strokeWidth={1.5} />
    </IconBase>
  );
}

// ==================== MAPA NOMBRE → COMPONENTE ====================
// Útil para reemplazos programáticos y para el catálogo de vista previa.
export const BRAND_ICONS = {
  navaja: IconNavaja,
  premium: IconPremium,
  descanso: IconDescanso,
  lista: IconLista,
  crecimiento: IconCrecimiento,
  calendar: IconCalendar,
  reportes: IconReportes,
  bloquear: IconBloquear,
  servicios: IconServicios,
  barberia: IconBarberia,
  popular: IconPopular,
  barba: IconBarba,
  clienteJoven: IconClienteJoven,
  movil: IconMovil,
  rapido: IconRapido,
  tiempo: IconTiempo,
  vista: IconVista,
  ganancias: IconGanancias,
  factura: IconFactura,
  completado: IconCompletado,
  paquete: IconPaquete,
  email: IconEmail,
  notificaciones: IconNotificaciones,
  configuracion: IconConfiguracion,
  apariencia: IconApariencia,
};
