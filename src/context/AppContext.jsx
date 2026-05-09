import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ref, onValue, push, update, remove, set } from 'firebase/database';
import { db } from '../firebase';
import { INITIAL_BARBERS } from '../utils/data';
import { generateId } from '../utils/helpers';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [appointments, setAppointments] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // ========== ESCUCHAR CITAS EN TIEMPO REAL ==========
  useEffect(() => {
    const citasRef = ref(db, 'citas');
    const unsub = onValue(citasRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.entries(data).map(([id, val]) => ({ ...val, id }));
        setAppointments(lista);
      } else {
        setAppointments([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ========== ESCUCHAR BLOQUEOS EN TIEMPO REAL ==========
  useEffect(() => {
    const blocksRef = ref(db, 'bloqueos');
    const unsub = onValue(blocksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.entries(data).map(([id, val]) => ({ ...val, id }));
        setBlocks(lista);
      } else {
        setBlocks([]);
      }
    });
    return () => unsub();
  }, []);

  // ========== ESCUCHAR BARBEROS EN TIEMPO REAL ==========
  useEffect(() => {
    const barberosRef = ref(db, 'barberos');
    const unsub = onValue(barberosRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.entries(data).map(([id, val]) => ({ ...val, id }));
        setBarbers(lista);
      } else {
        // Primera vez: guardar barberos iniciales
        INITIAL_BARBERS.forEach(b => {
          push(ref(db, 'barberos'), b);
        });
      }
    });
    return () => unsub();
  }, []);

  // ========== NOTIFICACIONES ==========
  const addNotification = useCallback((notification) => {
    const id = generateId();
    setNotifications(prev => [...prev, { ...notification, id }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // ========== CITAS: AGREGAR ==========
  const addAppointment = useCallback(async (appointment) => {
    try {
      const nuevaRef = push(ref(db, 'citas'));
      await set(nuevaRef, {
        ...appointment,
        status: 'pendiente',
        createdAt: new Date().toISOString()
      });
      addNotification({ type: 'success', message: `Cita agendada para ${appointment.client}` });
      return { ...appointment, id: nuevaRef.key, status: 'pendiente' };
    } catch (error) {
      console.error('Error al agendar:', error);
      addNotification({ type: 'error', message: 'Error al agendar la cita' });
    }
  }, [addNotification]);

  // ========== CITAS: CAMBIAR ESTADO ==========
  const updateAppointmentStatus = useCallback(async (id, status) => {
    try {
      await update(ref(db, `citas/${id}`), {
        status,
        updatedAt: new Date().toISOString()
      });
      addNotification({ type: 'info', message: `Cita actualizada a "${status}"` });
    } catch (error) {
      console.error('Error al actualizar:', error);
    }
  }, [addNotification]);

  // ========== CITAS: ELIMINAR ==========
  const deleteAppointment = useCallback(async (id) => {
    try {
      await remove(ref(db, `citas/${id}`));
      addNotification({ type: 'info', message: 'Cita eliminada' });
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  }, [addNotification]);

  // ========== BARBEROS: AGREGAR ==========
  const addBarber = useCallback(async (barber) => {
    try {
      const initials = barber.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const colors = [
        { color: '#b45309', bg: '#fef3c7' },
        { color: '#1d4ed8', bg: '#dbeafe' },
        { color: '#065f46', bg: '#d1fae5' },
        { color: '#7e22ce', bg: '#ede9fe' },
        { color: '#be123c', bg: '#fce7f3' },
      ];
      const colorScheme = colors[Math.floor(Math.random() * colors.length)];
      await push(ref(db, 'barberos'), {
        ...barber,
        avatar: initials,
        ...colorScheme,
        active: true
      });
      addNotification({ type: 'success', message: `${barber.name} agregado al equipo` });
    } catch (error) {
      console.error('Error al agregar barbero:', error);
    }
  }, [addNotification]);

  // ========== BARBEROS: TOGGLE ACTIVO ==========
  const toggleBarber = useCallback(async (id) => {
    try {
      const barber = barbers.find(b => b.id === id);
      if (!barber) return;
      await update(ref(db, `barberos/${id}`), { active: !barber.active });
    } catch (error) {
      console.error('Error al toggle barbero:', error);
    }
  }, [barbers]);

  // ========== BARBEROS: ELIMINAR ==========
  const deleteBarber = useCallback(async (id) => {
    try {
      await remove(ref(db, `barberos/${id}`));
      addNotification({ type: 'info', message: 'Barbero eliminado' });
    } catch (error) {
      console.error('Error al eliminar barbero:', error);
    }
  }, [addNotification]);

  const value = {
    appointments, barbers, blocks, notifications, loading,
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
