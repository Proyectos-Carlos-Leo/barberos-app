import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, push, update, remove, set } from 'firebase/database';
import { db } from '../firebase';
import { useT } from '../utils/i18n';

const AppContext = createContext(null);

const BARBER_COLORS = [
  { color: '#1A7FAB', bg: '#e0f4fc' },
  { color: '#1d4ed8', bg: '#dbeafe' },
  { color: '#065f46', bg: '#d1fae5' },
  { color: '#7e22ce', bg: '#ede9fe' },
  { color: '#be123c', bg: '#fce7f3' },
];

export function AppProvider({ children, slug }) {
  const [appointments, setAppointments] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [services, setServices] = useState([]);
  const [productos, setProductos] = useState([]);
  const [barbershopConfig, setBarbershopConfig] = useState(null);
  const t = useT(barbershopConfig?.idioma);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [citasReady, setCitasReady] = useState(false); // true solo tras la 1a carga real de /citas
  const [notFound, setNotFound] = useState(false);
  const [suspended, setSuspended] = useState(false);

  const basePath = slug ? `barberias/${slug}` : null;

  // ========== CONFIG ==========
  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    const configRef = ref(db, `${basePath}/config`);
    const unsub = onValue(configRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setBarbershopConfig({ ...data, slug });
        setNotFound(false);
        setSuspended(data.activa === false);
      } else {
        setNotFound(true);
        setBarbershopConfig(null);
        setSuspended(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [slug, basePath]);

  // Aplicar color custom desde la config
  useEffect(() => {
    const root = document.documentElement;
    const theme = barbershopConfig?.theme_color;

    // Helper: convertir hex a "R, G, B"
    const hexToRgb = (hex) => {
      const h = hex.replace('#', '');
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      return `${r}, ${g}, ${b}`;
    };

    // Helper: detectar si estamos en modo claro
    const isLightMode = () => document.documentElement.getAttribute('data-theme') === 'light';

    const applyTheme = () => {
      if (theme && theme.primary) {
        const rgbStr = hexToRgb(theme.primary);
        root.style.setProperty('--accent', theme.primary);
        root.style.setProperty('--accent-rgb', rgbStr);
        root.style.setProperty('--accent-light', theme.light || theme.primary);
        root.style.setProperty('--accent-dark', theme.dark || theme.primary);
        
        // En modo claro: usar color del tema con opacidad baja (no el bg oscuro)
        if (isLightMode()) {
          root.style.setProperty('--accent-bg', `rgba(${rgbStr}, 0.1)`);
          root.style.setProperty('--accent-border', `rgba(${rgbStr}, 0.4)`);
        } else {
          root.style.setProperty('--accent-bg', theme.bg || '#051520');
          root.style.setProperty('--accent-border', theme.border || theme.primary + '44');
        }
      } else {
        root.style.removeProperty('--accent');
        root.style.removeProperty('--accent-rgb');
        root.style.removeProperty('--accent-light');
        root.style.removeProperty('--accent-dark');
        root.style.removeProperty('--accent-bg');
        root.style.removeProperty('--accent-border');
      }
    };

    applyTheme();

    // Observar cambios en data-theme (light/dark) para reaplicar
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [barbershopConfig?.theme_color]);

  // ========== CITAS ==========
  useEffect(() => {
    if (!basePath || notFound) return;
    setCitasReady(false); // nueva barbería/slug: esperar de nuevo la 1a carga real
    const unsub = onValue(ref(db, `${basePath}/citas`), (snapshot) => {
      const data = snapshot.val();
      setAppointments(data ? Object.entries(data).map(([id, val]) => ({ ...val, id })) : []);
      setCitasReady(true); // ya llegó el snapshot real (aunque esté vacío)
    });
    return () => unsub();
  }, [basePath, notFound]);

  // ========== BLOQUEOS ==========
  useEffect(() => {
    if (!basePath || notFound) return;
    const unsub = onValue(ref(db, `${basePath}/bloqueos`), (snapshot) => {
      const data = snapshot.val();
      setBlocks(data ? Object.entries(data).map(([id, val]) => ({ ...val, id })) : []);
    });
    return () => unsub();
  }, [basePath, notFound]);

  // ========== BARBEROS ==========
  useEffect(() => {
    if (!basePath || notFound) return;
    const unsub = onValue(ref(db, `${basePath}/barberos`), (snapshot) => {
      const data = snapshot.val();
      setBarbers(data ? Object.entries(data).map(([id, val]) => ({ ...val, id })) : []);
    });
    return () => unsub();
  }, [basePath, notFound]);

  // ========== SERVICIOS ==========
  useEffect(() => {
    if (!basePath || notFound) return;
    const unsub = onValue(ref(db, `${basePath}/servicios`), (snapshot) => {
      const data = snapshot.val();
      setServices(data ? Object.entries(data).map(([id, val]) => ({ ...val, id })) : []);
    });
    return () => unsub();
  }, [basePath, notFound]);

  useEffect(() => {
    if (!basePath || notFound) return;
    const unsub = onValue(ref(db, `${basePath}/productos`), (snapshot) => {
      const data = snapshot.val();
      setProductos(data ? Object.entries(data).map(([id, val]) => ({ ...val, id })).sort((a,b) => (a.name||'').localeCompare(b.name||'')) : []);
    });
    return () => unsub();
  }, [basePath, notFound]);

  // ========== NOTIFICACIONES ==========
  const notifIdRef = useRef(0);
  const addNotification = useCallback((notification) => {
    const id = `notif_${++notifIdRef.current}`;
    setNotifications(prev => [...prev, { ...notification, id }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // ========== CITAS CRUD ==========
  const addAppointment = useCallback(async (appointment) => {
    if (!basePath) return;
    try {
      const nuevaRef = push(ref(db, `${basePath}/citas`));
      // Generar folio único de 6 caracteres alfanuméricos (sin caracteres confusos)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let folio = '';
      for (let i = 0; i < 6; i++) {
        folio += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      await set(nuevaRef, { ...appointment, folio, status: 'pendiente', createdAt: new Date().toISOString() });
      addNotification({ type: 'success', message: t('Cita agendada para {client}', { client: appointment.client }) });
      return { ...appointment, id: nuevaRef.key, folio, status: 'pendiente' };
    } catch (error) {
      console.error('Error al agendar:', error);
      addNotification({ type: 'error', message: t('Error al agendar la cita') });
    }
  }, [basePath, addNotification, t]);

  const updateAppointmentStatus = useCallback(async (id, status) => {
    if (!basePath) return;
    try {
      await update(ref(db, `${basePath}/citas/${id}`), { status, updatedAt: new Date().toISOString() });
      const statusLabels = { pendiente: 'Pendiente', confirmada: 'Confirmada ✓', completada: 'Completada', cancelada: 'Cancelada' };
      addNotification({ type: 'info', message: t('Cita actualizada a "{status}"', { status: t(statusLabels[status] || status) }) });
    } catch (error) { console.error(error); }
  }, [basePath, addNotification, t]);

  const deleteAppointment = useCallback(async (id) => {
    if (!basePath) return;
    try {
      await remove(ref(db, `${basePath}/citas/${id}`));
      addNotification({ type: 'info', message: t('Cita eliminada') });
    } catch (error) { console.error(error); }
  }, [basePath, addNotification, t]);

  // ========== BARBEROS CRUD ==========
  const addBarber = useCallback(async (barber) => {
    if (!basePath) return;
    try {
      const initials = barber.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const colorScheme = BARBER_COLORS[Math.floor(Math.random() * BARBER_COLORS.length)];
      await push(ref(db, `${basePath}/barberos`), { ...barber, avatar: initials, ...colorScheme, active: true });
      addNotification({ type: 'success', message: t('{name} agregado al equipo', { name: barber.name }) });
    } catch (error) { console.error(error); }
  }, [basePath, addNotification, t]);

  const toggleBarber = useCallback(async (id) => {
    if (!basePath) return;
    try {
      const barber = barbers.find(b => b.id === id);
      if (!barber) return;
      await update(ref(db, `${basePath}/barberos/${id}`), { active: !barber.active });
    } catch (error) { console.error(error); }
  }, [basePath, barbers]);

  const deleteBarber = useCallback(async (id) => {
    if (!basePath) return;
    try {
      await remove(ref(db, `${basePath}/barberos/${id}`));
      addNotification({ type: 'info', message: t('Barbero eliminado') });
    } catch (error) { console.error(error); }
  }, [basePath, addNotification, t]);

  const value = {
    slug, basePath, barbershopConfig, suspended,
    appointments, barbers, blocks, services, productos,
    notifications, loading, citasReady, notFound,
    addAppointment, updateAppointmentStatus, deleteAppointment,
    addBarber, toggleBarber, deleteBarber,
    addNotification, removeNotification,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp debe usarse dentro de AppProvider');
  return context;
}
