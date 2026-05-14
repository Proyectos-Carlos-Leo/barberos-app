import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ref, onValue, push, update, remove, set } from 'firebase/database';
import { db } from '../firebase';
import { generateId } from '../utils/helpers';

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
  const [barbershopConfig, setBarbershopConfig] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
      } else {
        setNotFound(true);
        setBarbershopConfig(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [slug, basePath]);

  // ========== CITAS ==========
  useEffect(() => {
    if (!basePath || notFound) return;
    const unsub = onValue(ref(db, `${basePath}/citas`), (snapshot) => {
      const data = snapshot.val();
      setAppointments(data ? Object.entries(data).map(([id, val]) => ({ ...val, id })) : []);
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

  // ========== NOTIFICACIONES ==========
  const addNotification = useCallback((notification) => {
    const id = generateId();
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
      await set(nuevaRef, { ...appointment, status: 'pendiente', createdAt: new Date().toISOString() });
      addNotification({ type: 'success', message: `Cita agendada para ${appointment.client}` });
      return { ...appointment, id: nuevaRef.key, status: 'pendiente' };
    } catch (error) {
      console.error('Error al agendar:', error);
      addNotification({ type: 'error', message: 'Error al agendar la cita' });
    }
  }, [basePath, addNotification]);

  const updateAppointmentStatus = useCallback(async (id, status) => {
    if (!basePath) return;
    try {
      await update(ref(db, `${basePath}/citas/${id}`), { status, updatedAt: new Date().toISOString() });
      addNotification({ type: 'info', message: `Cita actualizada a "${status}"` });
    } catch (error) { console.error(error); }
  }, [basePath, addNotification]);

  const deleteAppointment = useCallback(async (id) => {
    if (!basePath) return;
    try {
      await remove(ref(db, `${basePath}/citas/${id}`));
      addNotification({ type: 'info', message: 'Cita eliminada' });
    } catch (error) { console.error(error); }
  }, [basePath, addNotification]);

  // ========== BARBEROS CRUD ==========
  const addBarber = useCallback(async (barber) => {
    if (!basePath) return;
    try {
      const initials = barber.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const colorScheme = BARBER_COLORS[Math.floor(Math.random() * BARBER_COLORS.length)];
      await push(ref(db, `${basePath}/barberos`), { ...barber, avatar: initials, ...colorScheme, active: true });
      addNotification({ type: 'success', message: `${barber.name} agregado al equipo` });
    } catch (error) { console.error(error); }
  }, [basePath, addNotification]);

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
      addNotification({ type: 'info', message: 'Barbero eliminado' });
    } catch (error) { console.error(error); }
  }, [basePath, addNotification]);

  const value = {
    slug, basePath, barbershopConfig,
    appointments, barbers, blocks,
    notifications, loading, notFound,
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
