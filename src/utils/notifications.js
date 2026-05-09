// ==================== SISTEMA DE NOTIFICACIONES ====================

let permission = 'default';
let audioContext = null;

// Inicializar permisos
export const initNotifications = async () => {
  if (!('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones');
    return false;
  }

  if (Notification.permission === 'granted') {
    permission = 'granted';
    return true;
  }

  if (Notification.permission !== 'denied') {
    const result = await Notification.requestPermission();
    permission = result;
    return result === 'granted';
  }

  permission = Notification.permission;
  return false;
};

// Reproducir sonido "ding"
export const playSound = () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  } catch (err) {
    console.warn('No se pudo reproducir sonido:', err);
  }
};

// Mostrar notificación del navegador
export const showNotification = (title, body, data = {}) => {
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/barber-icon.svg',
      badge: '/barber-icon.svg',
      tag: data.tag || 'barberos-notification',
      requireInteraction: false,
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    setTimeout(() => notification.close(), 10000);
  } catch (err) {
    console.warn('Error mostrando notificación:', err);
  }
};

// Actualizar título de la pestaña con contador
export const updateTabTitle = (pendingCount) => {
  const baseTitle = 'BarberOS - Tu Barbería Digital';
  if (pendingCount > 0) {
    document.title = `(${pendingCount}) ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }
};

// Función combinada: sonido + notificación + título
export const notifyNewAppointment = (appointment, pendingCount) => {
  playSound();

  const title = '🔔 Nueva cita agendada';
  const body = `${appointment.client} - ${appointment.service?.name || ''} - ${appointment.time}`;

  showNotification(title, body, { tag: `appt-${appointment.id}` });
  updateTabTitle(pendingCount);
};
