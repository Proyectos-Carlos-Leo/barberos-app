import { useState, useEffect, useRef, useMemo } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, update, push, remove, onValue } from 'firebase/database';
import { auth, db } from '../firebase';
import { useApp } from '../context/AppContext';
import Header from './Header';
import Notifications from './Notifications';
import AdminLogin from './AdminLogin';
import BlockSchedule from './BlockSchedule';
import ReportsView from './ReportsView';
import ConfirmModal from './ConfirmModal';
import { STATUS_COLORS } from '../utils/data';
import { initNotifications, notifyNewAppointment, updateTabTitle } from '../utils/notifications';
import { imageToBase64 } from '../utils/imageUpload';
import {
  getTodayStr,
  filterAppointments,
  calculateStats,
  getBarberStats,
  formatDate,
  formatCurrency
} from '../utils/helpers';
import { useT } from '../utils/i18n';

export default function AdminView() {
  const [isAuth, setIsAuth] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [view, setView] = useState("dashboard");
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const previousIdsRef = useRef(null);
  const previousRedemptionsRef = useRef(null);
  const [pendingRedemptionsCount, setPendingRedemptionsCount] = useState(0);
  const { appointments, barbers, blocks, barbershopConfig, slug, updateAppointmentStatus, deleteAppointment, toggleBarber, addBarber, deleteBarber, loading, citasReady } = useApp();
  const t = useT(barbershopConfig?.idioma);

  const [currentUser, setCurrentUser] = useState(null);

  // Escuchar cambios de auth (solo una vez)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setIsAuth(false);
        setAccessDenied(false);
        setAuthLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Validar acceso cuando tengamos tanto el usuario como el config
  useEffect(() => {
    if (!currentUser || loading || !barbershopConfig) return;

    const adminsList = barbershopConfig?.admins
      ? Object.values(barbershopConfig.admins)
      : barbershopConfig?.email_admin
        ? [barbershopConfig.email_admin]
        : [];

    if (adminsList.length > 0 && !adminsList.includes(currentUser.email)) {
      signOut(auth);
      setIsAuth(false);
      setAccessDenied(true);
    } else {
      setIsAuth(true);
      setAccessDenied(false);
    }
    setAuthLoading(false);
  }, [currentUser, barbershopConfig, loading]);

  // Pedir permisos de notificación al entrar al admin
  useEffect(() => {
    if (!isAuth) return;
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        setShowNotifBanner(true);
      }
    }
  }, [isAuth]);

  // Detectar citas nuevas y notificar
  useEffect(() => {
    // citasReady evita la condición de carrera: sin esto, el efecto puede correr
    // primero con appointments=[] (antes de que /citas termine de cargar) y guardar
    // ese vacío como "punto de partida" — luego, cuando llegan las citas reales
    // (que ya existían), el sistema las trata como "nuevas" y dispara notificación.
    if (!isAuth || loading || !citasReady) return;

    const currentIds = new Set(appointments.map(a => a.id));

    // Primera carga real: solo guardar IDs, no notificar
    if (previousIdsRef.current === null) {
      previousIdsRef.current = currentIds;
      return;
    }

    // Detectar IDs nuevos
    const newOnes = appointments.filter(a => !previousIdsRef.current.has(a.id));

    if (newOnes.length > 0) {
      const pending = appointments.filter(a => a.status === 'pendiente').length;
      newOnes.forEach(appt => notifyNewAppointment(appt, pending));
    }

    // Actualizar título con citas pendientes
    const pendingCount = appointments.filter(a => a.status === 'pendiente').length;
    updateTabTitle(pendingCount);

    previousIdsRef.current = currentIds;
  }, [appointments, isAuth, loading, citasReady]);

  // Limpiar título al salir
  useEffect(() => {
    return () => updateTabTitle(0);
  }, []);

  // Detectar canjes pendientes nuevos
  useEffect(() => {
    if (!isAuth || !slug) return;
    const unsub = onValue(ref(db, `barberias/${slug}/canjes`), (snap) => {
      const data = snap.val();
      const allRedemptions = data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : [];
      const pending = allRedemptions.filter(r => r.status === 'pendiente');
      setPendingRedemptionsCount(pending.length);

      // Detectar canjes nuevos
      const currentIds = new Set(pending.map(r => r.id));
      if (previousRedemptionsRef.current === null) {
        previousRedemptionsRef.current = currentIds;
        return;
      }

      const newOnes = pending.filter(r => !previousRedemptionsRef.current.has(r.id));
      if (newOnes.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
        newOnes.forEach(r => {
          new Notification('🎁 Nuevo canje pendiente', {
            body: `${r.client} solicita: ${r.reward_requested}`,
            icon: '/favicon.ico',
            tag: r.id
          });
        });
      }
      previousRedemptionsRef.current = currentIds;
    });
    return () => unsub();
  }, [isAuth, slug]);

  const handleEnableNotifications = async () => {
    await initNotifications();
    setShowNotifBanner(false);
  };

  // Mientras verifica auth o carga config
  if (authLoading || loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)" }}>
      <div style={{ width: 56, height: 56, border: "3px solid var(--border)", borderTop: "3px solid var(--accent)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // Email no corresponde a esta barbería
  if (accessDenied) return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center" }}>
      <div className="fade-in">
        <div style={{ width: 80, height: 80, background: "var(--danger-bg)", border: "2px solid var(--danger-border)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 36 }}>
          🔒
        </div>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "var(--danger)", marginBottom: 12 }}>
          {t("Acceso Denegado")}
        </h2>
        <p style={{ color: "var(--text-tertiary)", fontSize: 15, marginBottom: 8, maxWidth: 380 }}>
          {t("Tu cuenta no tiene permiso para administrar esta barbería.")}
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 32 }}>
          {t("Verifica que estés usando el correo correcto.")}
        </p>
        <button className="btn-gold" onClick={() => setAccessDenied(false)} style={{ minWidth: 200 }}>
          {t("Intentar con otra cuenta")}
        </button>
      </div>
    </div>
  );

  // Si no está autenticado, mostrar login
  if (!isAuth) return <AdminLogin onLogin={() => setIsAuth(true)} />;

  const navItems = [
    { key: "dashboard", label: t("Panel"), active: view === "dashboard", onClick: () => setView("dashboard") },
    { key: "team", label: t("Equipo"), active: view === "team", onClick: () => setView("team") },
    { key: "services", label: t("Servicios"), active: view === "services", onClick: () => setView("services") },
    { key: "schedule", label: t("Horarios"), active: view === "schedule", onClick: () => setView("schedule") },
    { key: "reports", label: t("Reportes"), active: view === "reports", onClick: () => setView("reports") },
    { key: "history", label: t("Historial"), active: view === "history", onClick: () => setView("history") },
    ...(barbershopConfig?.productos_activos !== false ? [{ key: "products", label: t("Productos"), active: view === "products", onClick: () => setView("products") }] : []),
    ...(barbershopConfig?.lealtad_activa !== false ? [
      { key: "loyalty", label: t("Lealtad"), active: view === "loyalty", onClick: () => setView("loyalty"), badge: pendingRedemptionsCount > 0 ? pendingRedemptionsCount : null }
    ] : [])
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)" }}>
      <Header userType="admin" navItems={navItems} />
      <Notifications />
      {showNotifBanner && (
        <div style={{
          background: "var(--accent-bg)",
          borderBottom: "1px solid var(--accent-border)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap"
        }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          <p style={{ fontSize: 13, color: "var(--accent)", flex: 1, minWidth: 200 }}>
            <strong>{t("Activa las notificaciones")}</strong> {t("para recibir un aviso cada vez que alguien agende una cita")}
          </p>
          <button
            onClick={handleEnableNotifications}
            style={{
              padding: "6px 14px",
              background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
              color: "var(--bg-main)",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              textTransform: "uppercase"
            }}
          >
            {t("Activar")}
          </button>
          <button
            onClick={() => setShowNotifBanner(false)}
            style={{
              padding: "6px 10px",
              background: "transparent",
              color: "var(--text-tertiary)",
              border: "1px solid var(--border-strong)",
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer"
            }}
          >
            {t("Después")}
          </button>
        </div>
      )}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 14px" }}>
        {view === "dashboard" && <DashboardView appointments={appointments} barbers={barbers} onStatusChange={updateAppointmentStatus} onDelete={deleteAppointment} />}
        {view === "team" && <TeamView barbers={barbers} appointments={appointments} blocks={blocks} onToggle={toggleBarber} onAdd={addBarber} onDelete={deleteBarber} />}
        {view === "reports" && <ReportsView appointments={appointments} barbers={barbers} />}
        {view === "history" && <HistoryView appointments={appointments} barbers={barbers} />}
        {view === "schedule" && <ScheduleView barbershopConfig={barbershopConfig} slug={slug} barbers={barbers} blocks={blocks} />}
        {view === "services" && <ServicesView slug={slug} />}
        {view === "loyalty" && <LoyaltyView appointments={appointments} />}
        {view === "products" && <ProductsView slug={slug} />}
      </main>
    </div>
  );
}

// ==================== DASHBOARD ====================
function DashboardView({ appointments, barbers, onStatusChange, onDelete }) {
  const { barbershopConfig, slug } = useApp();
  const t = useT(barbershopConfig?.idioma);
  const idioma = barbershopConfig?.idioma;
  const [filterDate, setFilterDate] = useState(getTodayStr());
  const [filterBarber, setFilterBarber] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [emailConfirm, setEmailConfirm] = useState(barbershopConfig?.email_confirmacion || "");
  const [savingEmail, setSavingEmail] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(getTodayStr());

  const q = searchQuery.trim().toLowerCase();
  const filtered = filterAppointments(appointments, { date: filterDate, barberId: filterBarber, status: filterStatus })
    .filter(a => !q
      || (a.client || '').toLowerCase().includes(q)
      || (a.phone || '').toLowerCase().includes(q)
      || (a.folio || '').toLowerCase().includes(q))
    .sort((a, b) => a.time.localeCompare(b.time));

  const stats = calculateStats(appointments);
  const todayStr = getTodayStr();

  // 🆕 Calcular tendencia vs ayer
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdayAppts = appointments.filter(a => a.date === yesterdayStr);
  const yesterdayRevenue = yesterdayAppts
    .filter(a => a.status === 'completada')
    .reduce((s, a) => s + (a.service?.price || 0), 0);
  const revenueChange = yesterdayRevenue > 0
    ? Math.round(((stats.revenueToday - yesterdayRevenue) / yesterdayRevenue) * 100)
    : 0;
  const apptsChange = yesterdayAppts.length > 0
    ? Math.round(((stats.todayTotal - yesterdayAppts.length) / yesterdayAppts.length) * 100)
    : 0;

  // 🆕 Sparklines últimos 7 días
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dStr = d.toISOString().split('T')[0];
    const dayAppts = appointments.filter(a => a.date === dStr && a.status === 'completada');
    return {
      revenue: dayAppts.reduce((s, a) => s + (a.service?.price || 0), 0),
      count: dayAppts.length
    };
  });
  const maxRev = Math.max(...last7Days.map(d => d.revenue), 1);
  const maxCount = Math.max(...last7Days.map(d => d.count), 1);

  // 🆕 Ocupación de hoy
  const horario = barbershopConfig?.horario || {};
  const dur = horario.duracion || 30;
  const startH = parseInt((horario.hora_inicio || '09:00').split(':')[0]);
  const endH = parseInt((horario.hora_fin || '20:00').split(':')[0]);
  const totalSlots = Math.floor(((endH - startH) * 60) / dur) * (barbers.length || 1);
  const todayActive = appointments.filter(a =>
    a.date === todayStr && a.status !== 'cancelada'
  ).length;
  const ocupacion = totalSlots > 0 ? Math.min(100, Math.round((todayActive / totalSlots) * 100)) : 0;

  // 🆕 Próximas citas (próximas 4 horas desde ahora)
  const now = new Date();
  const upcomingAppts = appointments
    .filter(a => {
      if (a.date !== todayStr) return false;
      if (a.status !== 'pendiente' && a.status !== 'confirmada') return false;
      const [h, m] = a.time.split(':').map(Number);
      const apptTime = new Date();
      apptTime.setHours(h, m, 0, 0);
      const diff = (apptTime - now) / (1000 * 60); // minutos
      return diff >= -15 && diff <= 240;
    })
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 5);

  const getMinutesUntil = (time) => {
    const [h, m] = time.split(':').map(Number);
    const apptTime = new Date();
    apptTime.setHours(h, m, 0, 0);
    return Math.round((apptTime - now) / (1000 * 60));
  };

  const handleSaveEmail = async () => {
    if (!emailConfirm.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailConfirm)) {
      alert(t('Email inválido'));
      return;
    }
    setSavingEmail(true);
    try {
      await update(ref(db, `barberias/${slug}/config`), { email_confirmacion: emailConfirm.trim() });
      setShowEmailConfig(false);
      alert(t('Email guardado. Desde ahora se enviarán confirmaciones desde este email.'));
    } catch (err) {
      console.error(err);
      alert(t('Error al guardar'));
    } finally {
      setSavingEmail(false);
    }
  };

  // Saludo según hora
  const hour = now.getHours();
  const greeting = t(hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches');
  const adminName = barbershopConfig?.nombre || 'admin';

  return (
    <div className="fade-in">
      {/* 🆕 Header con saludo */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: 24, flexWrap: "wrap", gap: 16,
        paddingBottom: 18, borderBottom: "1px solid var(--border)"
      }}>
        <div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
            {greeting} 👋
          </p>
          <h1 className="section-title" style={{ marginBottom: 4, marginTop: 4 }}>
            {t("Tu")} <span className="gold">{t("barbería")}</span> {t("hoy")}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => { setEmailConfirm(barbershopConfig?.email_confirmacion || ""); setShowEmailConfig(true); }}
            style={{
              background: "var(--accent-bg)",
              border: "1px solid var(--accent-border)",
              color: "var(--accent)",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "rgba(var(--accent-rgb), 0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--accent-border)"; e.currentTarget.style.background = "var(--accent-bg)"; }}
          >
            {t("📧 Email confirmación")}
          </button>
          <div style={{
            background: "var(--accent-bg)",
            border: "1px solid var(--accent-border)",
            color: "var(--accent)",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: 0.5,
            whiteSpace: "nowrap"
          }}>
            📅 {new Date().toLocaleDateString(idioma === 'en' ? 'en-US' : 'es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
          </div>
        </div>
      </div>

      {/* 🆕 KPIs mejorados con sparklines y tendencias */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatCardPro
          label={t("Citas hoy")}
          value={stats.todayTotal}
          color="var(--accent)"
          change={apptsChange}
          spark={last7Days.map(d => d.count)}
          maxSpark={maxCount}
        />
        <StatCardPro
          label={t("Pendientes")}
          value={stats.pending}
          color="#f59e0b"
          icon={stats.pending > 0 ? "!" : null}
          subtitle={stats.pending > 0 ? t("Por confirmar") : t("Al día")}
          onClick={stats.pending > 0 ? () => {
            setFilterDate('all');
            setFilterStatus('pendiente');
            setFilterBarber('all');
            setTimeout(() => {
              document.querySelector('.appointments-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          } : null}
        />
        <StatCardPro
          label={t("Ingresos por cortes")}
          value={formatCurrency(stats.revenueCortesToday)}
          color="#4ade80"
          change={revenueChange}
          spark={last7Days.map(d => d.revenue)}
          maxSpark={maxRev}
        />
        <StatCardPro
          label={t("Ingresos por productos")}
          value={formatCurrency(stats.revenueProductosToday)}
          color="#a78bfa"
          subtitle={stats.revenueProductosToday > 0 ? t("Del día") : t("Sin ventas hoy")}
        />
        <StatCardPro
          label={t("Ocupación")}
          value={`${ocupacion}%`}
          color="var(--accent)"
          progress={ocupacion}
        />
      </div>

      {/* 🆕 Acciones rápidas */}
      <div style={{ marginBottom: 24 }}>
        <p style={{
          fontSize: 10, color: "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: 1,
          marginBottom: 10, fontWeight: 700
        }}>{t("⚡ Acciones rápidas")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
          <QuickAction
            icon="📅"
            label={t("Calendario")}
            color="#4285F4"
            onClick={() => { setCalendarDate(getTodayStr()); setShowCalendar(true); }}
          />
          <QuickAction
            icon="📊"
            label={t("Ver reportes")}
            color="var(--accent)"
            onClick={() => document.querySelector('[data-key="reports"]')?.click()}
          />
          <QuickAction
            icon="🚫"
            label={t("Bloquear hora")}
            color="#f87171"
            onClick={() => document.querySelector('[data-key="schedule"]')?.click()}
          />
          <QuickAction
            icon="💈"
            label={t("Editar servicios")}
            color="#f59e0b"
            onClick={() => document.querySelector('[data-key="services"]')?.click()}
          />
        </div>
      </div>

      {/* 🆕 Próximas citas con countdown */}
      {upcomingAppts.length > 0 && (
        <div style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 18,
          marginBottom: 24
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 16, fontWeight: 700,
              color: "var(--text-primary)",
              textTransform: "uppercase", letterSpacing: 1
            }}>{t("⏱ Próximas citas")}</p>
            <span style={{
              background: "var(--accent-bg)",
              color: "var(--accent)",
              padding: "4px 10px",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700
            }}>{t("HOY")} · {upcomingAppts.length}</span>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {upcomingAppts.map(appt => {
              const barber = barbers.find(b => b.id === appt.barberId);
              const minutes = getMinutesUntil(appt.time);
              const isNow = minutes >= -15 && minutes <= 15;
              const isSoon = minutes > 15 && minutes <= 60;
              const borderColor = isNow ? "#f59e0b" : isSoon ? "var(--accent)" : "var(--border)";
              const timeLabel = minutes < 0
                ? t("AHORA")
                : minutes < 60
                  ? `${idioma === 'en' ? 'IN' : 'EN'} ${minutes} ${t("MIN")}`
                  : `${idioma === 'en' ? 'IN' : 'EN'} ${Math.floor(minutes / 60)}H ${minutes % 60}M`;

              return (
                <div key={appt.id} style={{
                  display: "flex", gap: 10,
                  padding: "10px 12px",
                  background: "var(--bg-elevated-2)",
                  borderRadius: 10,
                  borderLeft: `3px solid ${borderColor}`,
                  alignItems: "center",
                  flexWrap: "wrap"
                }}>
                  <div style={{ textAlign: "center", minWidth: 52, flexShrink: 0 }}>
                    <p style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 20, fontWeight: 800,
                      color: "var(--text-primary)"
                    }}>{appt.time}</p>
                    <p style={{
                      fontSize: 10,
                      color: isNow ? "#f59e0b" : "var(--text-muted)",
                      fontWeight: 700,
                      letterSpacing: 0.5
                    }}>{timeLabel}</p>
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{appt.client}</p>
                    <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                      {appt.service?.emoji || '✂️'} {appt.service?.name} · {barber?.name || t('Sin asignar')}
                    </p>
                  </div>
                  {/* Badge de productos */}
                  {appt.productos && appt.productos.length > 0 && (
                    <div style={{
                      width: '100%', marginTop: 6,
                      background: 'rgba(var(--accent-rgb),0.08)',
                      border: '1px solid var(--accent-border)',
                      borderRadius: 8, padding: '6px 10px',
                      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'
                    }}>
                      <span style={{ fontSize: 12 }}>🛍</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                        {t("Productos pedidos:")}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {appt.productos.map(p => `${p.name} x${p.qty}`).join(' · ')}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: 'var(--accent)', fontFamily: "'Barlow Condensed', sans-serif" }}>
                        +${appt.totalProductos?.toLocaleString() || appt.productos.reduce((s,p)=>s+p.price*p.qty,0).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    {appt.status === 'pendiente' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onStatusChange(appt.id, 'confirmada'); }}
                        style={{
                          background: "rgba(74,222,128,0.15)",
                          border: "1px solid #4ade80",
                          color: "#4ade80",
                          padding: "6px 10px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >{t("✓ Confirmar")}</button>
                    )}
                    {appt.phone && (
                      <a href={`tel:${appt.phone}`} style={{
                        background: "transparent",
                        border: "1px solid var(--border-strong)",
                        color: "var(--text-tertiary)",
                        padding: "6px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        textDecoration: "none"
                      }}>📞</a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Separador */}
      <div style={{ marginBottom: 18 }}>
        <h2 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 20, fontWeight: 800,
          textTransform: "uppercase", letterSpacing: 1,
          color: "var(--text-secondary)"
        }}>📋 {t("Todas las citas")}</h2>
      </div>

      <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        {/* Búsqueda rápida */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14, pointerEvents: "none" }}>🔍</span>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t("Buscar por nombre, teléfono o folio…")}
            style={{ paddingLeft: 38, paddingRight: searchQuery ? 38 : 14 }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              aria-label={t("Limpiar búsqueda")}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "var(--bg-input)", border: "1px solid var(--border-strong)",
                color: "var(--text-tertiary)", borderRadius: 6, width: 24, height: 24,
                fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1
              }}
            >✕</button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 600 }}>{t("Fecha")}</label>
            <input type="date" value={filterDate === "all" ? "" : filterDate} onChange={e => setFilterDate(e.target.value || "all")} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 600 }}>{t("Barbero")}</label>
            <select value={filterBarber} onChange={e => setFilterBarber(e.target.value)}>
              <option value="all">{t("Todos")}</option>
              {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        {/* Chips de estado: un clic en lugar de dropdown */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { key: "all",        label: t("Todos"),      color: "var(--accent)" },
            { key: "pendiente",  label: t("Pendiente"),  color: "#f59e0b" },
            { key: "confirmada", label: t("Confirmada"), color: "#4ade80" },
            { key: "completada", label: t("Completada"), color: "var(--accent)" },
            { key: "cancelada",  label: t("Cancelada"),  color: "#f87171" },
          ].map(s => {
            const active = filterStatus === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setFilterStatus(s.key)}
                style={{
                  background: active ? s.color : "transparent",
                  border: `1px solid ${active ? s.color : "var(--border-strong)"}`,
                  color: active ? "#0a0a0a" : "var(--text-tertiary)",
                  borderRadius: 20, padding: "6px 13px",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Barlow', sans-serif",
                  transition: "all 0.15s", whiteSpace: "nowrap"
                }}
              >
                {s.key !== "all" && (
                  <span style={{
                    display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                    background: active ? "#0a0a0a" : s.color, marginRight: 6, verticalAlign: "middle"
                  }} />
                )}
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {filterDate === 'all' && filterStatus === 'pendiente' && filtered.length > 0 && (
        <div style={{
          background: "rgba(245,158,11,0.1)",
          border: "1px solid #f59e0b",
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap"
        }}>
          <p style={{ fontSize: 13, color: "#f59e0b", fontWeight: 600 }}>
            ⚠️ {t("⚠️ Mostrando TODAS las citas pendientes")} ({filtered.length})
          </p>
          <button
            onClick={() => { setFilterDate(getTodayStr()); setFilterStatus('all'); }}
            style={{
              background: "transparent",
              border: "1px solid #f59e0b44",
              color: "#f59e0b",
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {t("Ver solo hoy")}
          </button>
        </div>
      )}

      <p className="appointments-list" style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 16, scrollMarginTop: 80 }}>{filtered.length} {t(filtered.length !== 1 ? 'citas' : 'cita')} {t(filtered.length !== 1 ? 'encontradas' : 'encontrada')}</p>

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-dim)", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <p style={{ fontSize: 36, marginBottom: 8 }}>📭</p>
            <p style={{ fontSize: 14, marginBottom: 14 }}>{t("No hay citas con estos filtros")}</p>
            <button
              onClick={() => { setSearchQuery(""); setFilterDate(getTodayStr()); setFilterBarber("all"); setFilterStatus("all"); }}
              style={{
                background: "transparent", border: "1px solid var(--accent-border)",
                color: "var(--accent)", borderRadius: 8, padding: "8px 16px",
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Barlow', sans-serif"
              }}
            >
              {t("Limpiar filtros")}
            </button>
          </div>
        )}
        {filtered.map(appt => {
          const barber = barbers.find(b => b.id === appt.barberId);
          const sc = STATUS_COLORS[appt.status] || STATUS_COLORS.pendiente;
          const isOpen = selected === appt.id;
          return (
            <div key={appt.id} className="card appt-card" style={{ cursor: "pointer", border: `1px solid ${isOpen ? "rgba(var(--accent-rgb), 0.2)" : "var(--border)"}`, transition: "all 0.2s" }} onClick={() => setSelected(isOpen ? null : appt.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--accent)", minWidth: 56 }}>{appt.time}</div>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: barber?.bg || "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: barber?.color || "#fff", flexShrink: 0 }}>{barber?.avatar || "?"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{appt.client}</p>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{appt.service?.name} · {barber?.name || t("Sin asignar")}</p>
                  {appt.productos && appt.productos.length > 0 && (
                    <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginTop: 3 }}>
                      🛍 {appt.productos.map(p => `${p.name} x${p.qty}`).join(' · ')}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 16 }}>
                    {formatCurrency((appt.service?.price || 0) + (appt.totalProductos || 0))}
                  </span>
                  <span className="tag" style={{ background: sc.bg, color: sc.text }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot, display: "inline-block" }}></span>
                    {t(sc.label)}
                  </span>
                </div>
              </div>
              {isOpen && (
                <div className="fade-in" style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 16 }}>
                    <div>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>{t("Fecha")}</p>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(appt.date, idioma)}</p>
                    </div>
                    {appt.phone && (
                      <div>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>{t("Teléfono")}</p>
                        <a href={`tel:${appt.phone}`} onClick={e => e.stopPropagation()} style={{ fontSize: 13, fontWeight: 600 }}>📞 {appt.phone}</a>
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>{t("Duración")}</p>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{appt.service?.duration} {t("min")}</p>
                    </div>
                  </div>
                  {appt.notes && (
                    <div style={{ background: "var(--bg-elevated-2)", borderRadius: 8, padding: 12, marginBottom: 16, borderLeft: "3px solid var(--accent)" }}>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{t("Notas")}</p>
                      <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--text-secondary)" }}>"{appt.notes}"</p>
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>{t("Cambiar estado")}</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {Object.entries(STATUS_COLORS).map(([key, s]) => (
                        <button key={key} onClick={e => { e.stopPropagation(); onStatusChange(appt.id, key); }} style={{ padding: "6px 14px", borderRadius: 6, border: `1.5px solid ${appt.status === key ? s.dot : "var(--border-strong)"}`, background: appt.status === key ? s.bg : "transparent", color: appt.status === key ? s.text : "var(--text-tertiary)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>{t(s.label)}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete({ id: appt.id, name: appt.client }); }} style={{ padding: "6px 14px", background: "transparent", border: "1px solid var(--border-strong)", color: "#f87171", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{t("🗑 Eliminar")}</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <ConfirmModal
        open={!!confirmDelete}
        title={t("¿Eliminar cita?")}
        message={confirmDelete ? `${t("Vas a eliminar la cita de")} ${confirmDelete.name}${t(". Esta acción no se puede deshacer.")}` : ''}
        confirmText={t("Sí, eliminar")}
        onConfirm={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* 📅 Modal Calendario */}
      {showCalendar && (
        <CalendarModal
          appointments={appointments}
          barbers={barbers}
          date={calendarDate}
          setDate={setCalendarDate}
          onClose={() => setShowCalendar(false)}
          barbershopConfig={barbershopConfig}
          onStatusChange={onStatusChange}
          t={t}
          idioma={idioma}
        />
      )}

      {/* Modal configurar email */}
      {showEmailConfig && (
        <div onClick={() => setShowEmailConfig(false)} style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20, zIndex: 3000
        }}>
          <div onClick={e => e.stopPropagation()} className="fade-in" style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-strong)",
            borderRadius: 16,
            width: "100%", maxWidth: 480,
            padding: 24
          }}>
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 22, fontWeight: 800, letterSpacing: 1,
              textTransform: "uppercase", color: "var(--text-primary)", marginBottom: 6
            }}>
              {t("📧 Email de confirmación")}
            </h2>
            <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginBottom: 20 }}>
              {t("Desde qué email se enviarán las confirmaciones de citas")}
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{
                fontSize: 11, color: "var(--text-tertiary)",
                fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
                display: "block", marginBottom: 8
              }}>
                {t("Dirección de email *")}
              </label>
              <input
                value={emailConfirm}
                onChange={e => setEmailConfirm(e.target.value)}
                placeholder="tu-barberia@gmail.com"
                type="email"
                style={{ width: "100%", boxSizing: "border-box" }}
              />
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                {t("Asegúrate de que sea un email de Gmail y que hayas activado \"apps menos seguras\"")}
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setShowEmailConfig(false)} disabled={savingEmail}>
                {t("Cancelar")}
              </button>
              <button className="btn-gold" onClick={handleSaveEmail} disabled={savingEmail || !emailConfirm.trim()}>
                {savingEmail ? t('Guardando...') : t('💾 Guardar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== TEAM VIEW ====================
function TeamView({ barbers, appointments, blocks, onToggle, onAdd, onDelete }) {
  const { barbershopConfig } = useApp();
  const t = useT(barbershopConfig?.idioma);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ name: "", specialty: "", photo: null });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    setUploadingPhoto(true);
    try {
      const base64 = await imageToBase64(file, 200, 0.85);
      setForm(f => ({ ...f, photo: base64 }));
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAdd = () => {
    if (!form.name.trim() || !form.specialty.trim()) return;
    onAdd({
      name: form.name.trim(),
      specialty: form.specialty.trim(),
      photo: form.photo || null
    });
    setForm({ name: "", specialty: "", photo: null });
    setShowForm(false);
  };

  // Calcular stats por barbero y ordenar por ingresos
  const barbersWithStats = useMemo(() => {
    return barbers.map(b => ({
      ...b,
      stats: getBarberStats(appointments, b.id)
    })).sort((a, b) => b.stats.revenue - a.stats.revenue);
  }, [barbers, appointments]);

  const totalRevenue = barbersWithStats.reduce((s, b) => s + b.stats.revenue, 0);
  const totalCompleted = barbersWithStats.reduce((s, b) => s + b.stats.completed, 0);
  const activeBarbers = barbers.filter(b => b.active).length;

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: 4 }}>{t("Tu")} <span className="gold">{t("equipo")}</span></h1>
          <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>{activeBarbers} {t(activeBarbers !== 1 ? "barberos" : "barbero")} {t(activeBarbers !== 1 ? "activos" : "activo")} · {totalCompleted} {t("cortes totales")}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn-gold" onClick={() => setShowForm(!showForm)}>{showForm ? t("Cancelar") : t("+ Agregar barbero")}</button>
        </div>
      </div>

      {/* Stats top */}
      {barbersWithStats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
            <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{t("Equipo activo")}</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)", fontFamily: "'Barlow Condensed', sans-serif", marginTop: 4 }}>
              {activeBarbers}<span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 400 }}>/{barbers.length}</span>
            </p>
          </div>
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
            <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{t("Cortes totales")}</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: "#4ade80", fontFamily: "'Barlow Condensed', sans-serif", marginTop: 4 }}>{totalCompleted}</p>
          </div>
          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
            <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{t("Ingresos generados")}</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: "#f59e0b", fontFamily: "'Barlow Condensed', sans-serif", marginTop: 4 }}>{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fade-in card" style={{ padding: 24, marginBottom: 20, border: "1px solid var(--accent-border)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18, color: "var(--accent)" }}>{t("➕ Nuevo barbero")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 600, textTransform: "uppercase" }}>{t("Nombre *")}</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t("Ej. Juan Pérez")} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 600, textTransform: "uppercase" }}>{t("Especialidad *")}</label>
              <input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder={t("Ej. Degradados")} />
            </div>
          </div>

          {/* Foto del barbero */}
          <div style={{ marginTop: 18 }}>
            <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 8, fontWeight: 600, textTransform: "uppercase" }}>
              {t("📸 Foto del barbero (opcional)")}
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{
                width: 60, height: 60, borderRadius: "50%",
                background: form.photo ? "transparent" : "var(--bg-elevated-2)",
                border: "2px solid var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", fontSize: 22, color: "var(--text-tertiary)",
                flexShrink: 0
              }}>
                {form.photo ? <img src={form.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{
                  background: "var(--accent-bg)",
                  border: "1px solid var(--accent-border)",
                  color: "var(--accent)",
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: uploadingPhoto ? "not-allowed" : "pointer",
                  opacity: uploadingPhoto ? 0.6 : 1
                }}>
                  {uploadingPhoto ? t('⏳ Procesando...') : (form.photo ? t('🔄 Cambiar foto') : t('📷 Subir foto'))}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} style={{ display: "none" }} />
                </label>
                {form.photo && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, photo: null }))} style={{
                    background: "transparent", border: "1px solid var(--danger-bg)",
                    color: "var(--danger)", padding: "6px 12px", borderRadius: 6,
                    fontSize: 11, fontWeight: 600, cursor: "pointer"
                  }}>
                    {t("🗑 Quitar")}
                  </button>
                )}
              </div>
            </div>
            {photoError && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>⚠ {photoError}</p>}
          </div>

          <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn-ghost" onClick={() => { setShowForm(false); setForm({ name: "", specialty: "", photo: null }); setPhotoError(''); }}>{t("Cancelar")}</button>
            <button className="btn-gold" onClick={handleAdd} disabled={!form.name || !form.specialty || uploadingPhoto}>{t("Agregar")}</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 16 }}>
        {barbersWithStats.map((b, idx) => {
          const stats = b.stats;
          const isTop = idx === 0 && stats.revenue > 0;
          return (
            <div key={b.id} className="card" style={{
              padding: 22,
              opacity: b.active ? 1 : 0.55,
              transition: "all 0.3s",
              position: "relative",
              border: isTop ? "1px solid #f59e0b44" : "1px solid var(--border)",
              boxShadow: isTop ? "0 4px 20px rgba(245,158,11,0.1)" : "none"
            }}>
              {isTop && (
                <div style={{
                  position: "absolute",
                  top: -8, left: 16,
                  background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                  color: "#0a0a0a",
                  padding: "3px 10px",
                  borderRadius: 12,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  fontFamily: "'Barlow Condensed', sans-serif"
                }}>
                  {t("🏆 Top Performer")}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%",
                  background: b.photo ? "transparent" : b.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 20, color: b.color,
                  flexShrink: 0,
                  border: isTop ? `2px solid #f59e0b` : `2px solid ${b.color}22`,
                  overflow: "hidden"
                }}>
                  {b.photo ? (
                    <img src={b.photo} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : b.avatar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 3, color: "var(--text-primary)" }}>{b.name}</p>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{b.specialty}</p>
                  {!b.active && (
                    <p style={{ fontSize: 10, color: "var(--danger)", marginTop: 4, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{t("● Inactivo")}</p>
                  )}
                </div>
                <div style={{ width: 40, height: 22, borderRadius: 11, background: b.active ? "var(--success-bg)" : "var(--danger-bg)", border: `1px solid ${b.active ? "var(--success)" : "var(--danger)"}`, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }} onClick={() => onToggle(b.id)}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: b.active ? "var(--success)" : "var(--danger)", position: "absolute", top: 2, left: b.active ? 21 : 2, transition: "left 0.2s" }} />
                </div>
              </div>
              <div className="divider" style={{ margin: "0 0 14px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, textAlign: "center", marginBottom: 14 }}>
                {[["Hoy", stats.today, "var(--accent)"], ["Cortes", stats.completed, "#4ade80"], ["Ingresos", formatCurrency(stats.revenue), "#f59e0b"]].map(([label, val, color]) => (
                  <div key={label} style={{ background: "var(--bg-elevated-2)", borderRadius: 8, padding: "12px 4px" }}>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{t(label)}</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "'Barlow Condensed', sans-serif" }}>{val}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setConfirmDelete({ id: b.id, name: b.name })} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "1px solid var(--border-strong)", color: "var(--danger)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--danger-bg)"; e.currentTarget.style.borderColor = "var(--danger)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
              >{t("🗑 Eliminar")}</button>
            </div>
          );
        })}
      </div>
      <ConfirmModal
        open={!!confirmDelete}
        title={t("¿Eliminar barbero?")}
        message={confirmDelete ? `${t("Vas a eliminar a")} ${confirmDelete.name} ${t("del equipo. Esta acción no se puede deshacer.")}` : ''}
        confirmText={t("Sí, eliminar")}
        onConfirm={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

// ==================== HISTORY VIEW ====================
function HistoryView({ appointments, barbers }) {
  const { barbershopConfig } = useApp();
  const t = useT(barbershopConfig?.idioma);
  const idioma = barbershopConfig?.idioma;
  const [filterBarberId, setFilterBarberId] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const completed = appointments
    .filter(a => a.status === "completada")
    .sort((a, b) => new Date(b.date + "T" + b.time) - new Date(a.date + "T" + a.time));

  // Aplicar filtros
  const filtered = completed.filter(a => {
    if (filterBarberId !== 'all' && a.barberId !== filterBarberId) return false;
    if (filterDateFrom && a.date < filterDateFrom) return false;
    if (filterDateTo && a.date > filterDateTo) return false;
    return true;
  });

  const totalRevenue = filtered.reduce((sum, a) => sum + (a.service?.price || 0), 0);
  const hasFilters = filterBarberId !== 'all' || filterDateFrom || filterDateTo;

  // Exportar CSV
  const handleExport = () => {
    const BOM = '\uFEFF';
    const headers = [t('Fecha'), t('Hora'), t('Cliente'), t('Telefono'), t('Servicio'), t('Precio'), t('Barbero'), t('Estado')];

    const rows = filtered.map(a => {
      const barber = barbers.find(b => b.id === a.barberId);
      return [
        a.date,
        a.time,
        a.client || '',
        a.phone || '',
        a.service?.name || '',
        a.service?.price || 0,
        barber?.name || t('Sin asignar'),
        a.status
      ];
    });

    // Resumen al final
    rows.push([]);
    rows.push([t('RESUMEN')]);
    rows.push([t('Total citas'), filtered.length]);
    rows.push([t('Ingresos totales'), totalRevenue]);
    rows.push([t('Ticket promedio'), filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0]);

    if (filterBarberId !== 'all') {
      const b = barbers.find(x => x.id === filterBarberId);
      rows.push([t('Filtrado por barbero'), b?.name || filterBarberId]);
    }
    if (filterDateFrom) rows.push([t('Desde'), filterDateFrom]);
    if (filterDateTo) rows.push([t('Hasta'), filterDateTo]);

    const csv = BOM + [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historial-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilterBarberId('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: 4 }}><span className="gold">{t("Historial")}</span> {t("de citas")}</h1>
          <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>{t("Citas completadas y reportes")}</p>
        </div>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          style={{
            background: filtered.length === 0 ? "var(--bg-track)" : "linear-gradient(135deg, var(--accent), var(--accent-light))",
            color: filtered.length === 0 ? "var(--text-muted)" : "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: 0.5,
            textTransform: "uppercase",
            cursor: filtered.length === 0 ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            whiteSpace: "nowrap"
          }}
        >
          {t("📥 Exportar CSV")}
        </button>
      </div>

      {/* Filtros */}
      <div style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
        alignItems: "end"
      }}>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
            {t("Barbero")}
          </label>
          <select
            value={filterBarberId}
            onChange={e => setFilterBarberId(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="all">{t("Todos los barberos")}</option>
            {barbers.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
            {t("Desde")}
          </label>
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={{ width: "100%" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
            {t("Hasta")}
          </label>
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={{ width: "100%" }} />
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{
              background: "transparent",
              color: "var(--text-tertiary)",
              border: "1px solid var(--border-strong)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            {t("✕ Limpiar filtros")}
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        {[
          ["Total completadas", filtered.length, "#4ade80"],
          ["Ingresos totales", formatCurrency(totalRevenue), "var(--accent)"],
          ["Ticket promedio", filtered.length > 0 ? formatCurrency(Math.round(totalRevenue / filtered.length)) : "$0", "#60a5fa"]
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{t(label)}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-dim)", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <p style={{ fontSize: 36, marginBottom: 8 }}>📋</p>
            <p style={{ fontSize: 14 }}>
              {hasFilters ? t("No hay citas que coincidan con los filtros") : t("Aún no hay citas completadas")}
            </p>
          </div>
        ) : filtered.map(appt => {
          const barber = barbers.find(b => b.id === appt.barberId);
          return (
            <div key={appt.id} className="card" style={{
              padding: "14px 18px",
              transition: "all 0.2s",
              cursor: "default"
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-border)"; e.currentTarget.style.background = "var(--bg-elevated)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = ""; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: barber?.bg || "var(--bg-elevated-2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, color: barber?.color || "var(--text-tertiary)",
                  flexShrink: 0,
                  border: `1.5px solid ${barber?.color || "var(--border)"}33`
                }}>{barber?.avatar || "?"}</div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{appt.client}</p>
                    <span style={{
                      background: "rgba(74,222,128,0.12)",
                      color: "#4ade80",
                      padding: "2px 8px",
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      textTransform: "uppercase"
                    }}>{t("✓ Completada")}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    {appt.service?.emoji || '✂️'} {appt.service?.name} · <strong style={{ color: "var(--text-secondary)" }}>{barber?.name || t("Sin asignar")}</strong>
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    📅 {formatDate(appt.date, idioma)} · 🕐 {appt.time}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{
                    fontWeight: 800, color: "var(--accent)",
                    fontSize: 20,
                    fontFamily: "'Barlow Condensed', sans-serif"
                  }}>{formatCurrency(appt.service?.price || 0)}</p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {appt.service?.duration} {t("min")}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== SCHEDULE VIEW ====================
const DAYS = [
  { key: 'lun', label: 'Lunes' },
  { key: 'mar', label: 'Martes' },
  { key: 'mie', label: 'Miércoles' },
  { key: 'jue', label: 'Jueves' },
  { key: 'vie', label: 'Viernes' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

const ALL_HOURS = [
  '07:00','07:30','08:00','08:30','09:00','09:30',
  '10:00','10:30','11:00','11:30','12:00','12:30',
  '13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30',
  '19:00','19:30','20:00','20:30','21:00'
];

const DURATIONS = [15, 20, 30, 45, 60, 75, 90];

function ScheduleView({ barbershopConfig, slug, barbers, blocks }) {
  const t = useT(barbershopConfig?.idioma);
  const config = barbershopConfig?.horario || {};

  // Estado local del horario (inicializado desde Firebase)
  const [duracion, setDuracion] = useState(config.duracion || 30);
  const [horaInicio, setHoraInicio] = useState(config.hora_inicio || '09:00');
  const [horaFin, setHoraFin] = useState(config.hora_fin || '20:00');
  const [diasActivos, setDiasActivos] = useState(
    config.dias_activos || { lun: true, mar: true, mie: true, jue: true, vie: true, sab: true, dom: false }
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sincronizar si llegan datos de Firebase
  useEffect(() => {
    if (barbershopConfig?.horario) {
      const h = barbershopConfig.horario;
      if (h.duracion) setDuracion(h.duracion);
      if (h.hora_inicio) setHoraInicio(h.hora_inicio);
      if (h.hora_fin) setHoraFin(h.hora_fin);
      if (h.dias_activos) setDiasActivos(h.dias_activos);
    }
  }, [barbershopConfig]);

  const toggleDay = (day) => {
    setDiasActivos(prev => ({ ...prev, [day]: !prev[day] }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!slug) return;
    setSaving(true);
    try {
      await update(ref(db, `barberias/${slug}/config/horario`), {
        duracion,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        dias_activos: diasActivos
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert(t('Error al guardar. Intenta de nuevo.'));
    } finally {
      setSaving(false);
    }
  };

  // Preview de slots generados
  const previewSlots = [];
  const [startH, startM] = horaInicio.split(':').map(Number);
  const [endH, endM] = horaFin.split(':').map(Number);
  let cur = startH * 60 + startM;
  const endMin = endH * 60 + endM;
  while (cur + duracion <= endMin) {
    const h = String(Math.floor(cur / 60)).padStart(2, '0');
    const m = String(cur % 60).padStart(2, '0');
    previewSlots.push(`${h}:${m}`);
    cur += duracion;
  }

  const diasActivosCount = Object.values(diasActivos).filter(Boolean).length;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-title" style={{ marginBottom: 4 }}>
          🕐 <span className="gold">{t("Horarios")}</span> {t("de atención")}
        </h1>
        <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>
          {t("Configura cuándo y cómo puedes recibir citas")}
        </p>
      </div>

      <div style={{ display: "grid", gap: 20 }}>
        {/* Días activos */}
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
          <h3 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 18, fontWeight: 700, letterSpacing: 1,
            textTransform: "uppercase", marginBottom: 4, color: "var(--text-primary)"
          }}>{t("📅 Días de atención")}</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18 }}>
            {diasActivosCount} {t(diasActivosCount !== 1 ? "días" : "día")} {t(diasActivosCount !== 1 ? "activos" : "activo")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
            {DAYS.map(d => {
              const active = diasActivos[d.key];
              return (
                <div
                  key={d.key}
                  onClick={() => toggleDay(d.key)}
                  style={{
                    padding: "14px 10px",
                    borderRadius: 10,
                    border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "var(--accent-bg)" : "var(--bg-elevated-2)",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s",
                    transform: active ? "translateY(-2px)" : "none",
                    boxShadow: active ? "0 4px 14px rgba(var(--accent-rgb),0.2)" : "none"
                  }}
                >
                  <p style={{
                    fontSize: 14, fontWeight: 700,
                    color: active ? "var(--accent)" : "var(--text-tertiary)"
                  }}>{t(d.label)}</p>
                  <div style={{
                    marginTop: 8,
                    width: 20, height: 20,
                    borderRadius: "50%",
                    background: active ? "var(--accent)" : "var(--bg-track)",
                    border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "8px auto 0",
                    fontSize: 12, color: "white"
                  }}>
                    {active ? "✓" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hora inicio / fin */}
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
          <h3 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 18, fontWeight: 700, letterSpacing: 1,
            textTransform: "uppercase", marginBottom: 18, color: "var(--text-primary)"
          }}>{t("⏰ Horario de apertura")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
                {t("Primer turno")}
              </label>
              <select value={horaInicio} onChange={e => { setHoraInicio(e.target.value); setSaved(false); }}>
                {ALL_HOURS.filter(h => h < horaFin).map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
                {t("Último turno")}
              </label>
              <select value={horaFin} onChange={e => { setHoraFin(e.target.value); setSaved(false); }}>
                {ALL_HOURS.filter(h => h > horaInicio).map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Duración de citas */}
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
          <h3 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 18, fontWeight: 700, letterSpacing: 1,
            textTransform: "uppercase", marginBottom: 4, color: "var(--text-primary)"
          }}>{t("⚡ Duración de cada cita")}</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18 }}>
            {t("Cada cuántos minutos se puede agendar un turno")}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {DURATIONS.map(d => {
              const selected = duracion === d;
              return (
                <div
                  key={d}
                  onClick={() => { setDuracion(d); setSaved(false); }}
                  style={{
                    padding: "12px 20px",
                    borderRadius: 10,
                    border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                    background: selected ? "var(--accent-bg)" : "var(--bg-elevated-2)",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s",
                    minWidth: 70
                  }}
                >
                  <p style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 22, fontWeight: 800,
                    color: selected ? "var(--accent)" : "var(--text-primary)"
                  }}>{d}</p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{t("min")}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Preview de slots */}
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
          <h3 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 18, fontWeight: 700, letterSpacing: 1,
            textTransform: "uppercase", marginBottom: 4, color: "var(--text-primary)"
          }}>{t("👁 Vista previa")}</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18 }}>
            {t("Así verán los clientes los horarios disponibles")} · {previewSlots.length} {t("turnos por día")}
          </p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))",
            gap: 8
          }}>
            {previewSlots.map(slot => (
              <div key={slot} style={{
                padding: "10px 4px",
                borderRadius: 8,
                background: "var(--bg-elevated-2)",
                border: "1px solid var(--border)",
                textAlign: "center",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)"
              }}>
                {slot}
              </div>
            ))}
          </div>
          {previewSlots.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>
              {t("⚠ Ajusta la hora de inicio, fin y duración para generar turnos")}
            </p>
          )}
        </div>

        {/* Bloqueos de horarios */}
        <BlockSchedule barbers={barbers} blocks={blocks} />

        {/* Guardar */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, alignItems: "center" }}>
          {saved && (
            <p style={{ color: "#4ade80", fontSize: 14, fontWeight: 600 }}>
              {t("✓ Horarios guardados")}
            </p>
          )}
          <button
            className="btn-gold"
            onClick={handleSave}
            disabled={saving}
            style={{ minWidth: 160 }}
          >
            {saving ? t('Guardando...') : t('💾 Guardar horarios')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== LOYALTY VIEW ====================
function LoyaltyView({ appointments }) {
  const { slug, barbershopConfig } = useApp();
  const t = useT(barbershopConfig?.idioma);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('clientes'); // clientes | canjes | config
  const [redemptions, setRedemptions] = useState([]);

  // Config de lealtad
  const loyaltyConfig = barbershopConfig?.loyalty_config || {};
  const REQUIRED_STAMPS = loyaltyConfig.required_stamps || 10;
  const REWARD_NAME = loyaltyConfig.reward_name || 'Corte gratis';
  const STAMP_IMAGE = loyaltyConfig.stamp_image || null;

  const normalizePhone = (p) => (p || '').replace(/[\s\-().]/g, '');

  // Cargar canjes desde Firebase
  useEffect(() => {
    if (!slug) return;
    const unsub = onValue(ref(db, `barberias/${slug}/canjes`), (snap) => {
      const data = snap.val();
      setRedemptions(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : []);
    });
    return () => unsub();
  }, [slug]);

  // Agrupar SOLO citas completadas por teléfono y descontar canjes aprobados
  const clientStats = useMemo(() => {
    const map = new Map();

    // 1. Sumar citas completadas
    appointments
      .filter(a => {
        const status = (a.status || '').toString().trim().toLowerCase();
        return status === 'completada';
      })
      .forEach(a => {
        const phoneKey = normalizePhone(a.phone);
        if (!phoneKey) return;
        if (!map.has(phoneKey)) {
          map.set(phoneKey, {
            phone: a.phone, client: a.client,
            stamps: 0, totalSpent: 0,
            lastVisit: null, redeemed: 0
          });
        }
        const c = map.get(phoneKey);
        c.stamps += 1;
        c.totalSpent += a.service?.price || 0;
        if (!c.lastVisit || (a.createdAt && a.createdAt > c.lastVisit)) {
          c.lastVisit = a.createdAt;
          c.client = a.client;
          c.phone = a.phone;
        }
      });

    // 2. Restar canjes APROBADOS
    redemptions
      .filter(r => r.status === 'aprobado')
      .forEach(r => {
        const phoneKey = normalizePhone(r.phone);
        if (!phoneKey || !map.has(phoneKey)) return;
        const c = map.get(phoneKey);
        c.stamps -= (r.stamps_used || REQUIRED_STAMPS);
        c.redeemed += 1;
      });

    return Array.from(map.values())
      .map(c => ({ ...c, stamps: Math.max(0, c.stamps) }))
      .sort((a, b) => b.stamps - a.stamps);
  }, [appointments, redemptions, REQUIRED_STAMPS]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clientStats;
    const q = search.toLowerCase().trim();
    return clientStats.filter(c =>
      c.client.toLowerCase().includes(q) ||
      normalizePhone(c.phone).includes(normalizePhone(q))
    );
  }, [clientStats, search]);

  const pendingRedemptions = redemptions.filter(r => r.status === 'pendiente');
  const totalClients = clientStats.length;
  const totalStamps = clientStats.reduce((s, c) => s + c.stamps, 0);
  const vipClients = clientStats.filter(c => c.stamps >= REQUIRED_STAMPS).length;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 className="section-title" style={{ marginBottom: 4 }}>
          🏆 <span className="gold">{t("Lealtad")}</span> {t("de clientes")}
        </h1>
        <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>
          {REQUIRED_STAMPS} {t("sellos")} = {REWARD_NAME}
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 24,
        background: "var(--bg-elevated)",
        padding: 4, borderRadius: 10,
        border: "1px solid var(--border)"
      }}>
        {[
          { key: 'clientes', label: t('👥 Clientes'), count: totalClients },
          { key: 'canjes', label: t('🎁 Canjes'), count: pendingRedemptions.length, badge: pendingRedemptions.length > 0 },
          { key: 'config', label: t('⚙️ Configuración') }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              background: activeTab === tab.key ? "linear-gradient(135deg, var(--accent), var(--accent-light))" : "transparent",
              color: activeTab === tab.key ? "white" : "var(--text-tertiary)",
              border: "none",
              borderRadius: 7,
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              transition: "all 0.2s",
              position: "relative",
              whiteSpace: "nowrap"
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                marginLeft: 6,
                background: tab.badge ? "#dc2626" : "rgba(255,255,255,0.2)",
                color: "white",
                borderRadius: 10,
                padding: "2px 7px",
                fontSize: 10,
                fontWeight: 800
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* TAB: CLIENTES */}
      {activeTab === 'clientes' && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{t("Clientes")}</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "var(--accent)", fontFamily: "'Barlow Condensed', sans-serif" }}>{totalClients}</p>
            </div>
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{t("Sellos activos")}</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "#4ade80", fontFamily: "'Barlow Condensed', sans-serif" }}>{totalStamps}</p>
            </div>
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{t("Listos para canjear")}</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "#f59e0b", fontFamily: "'Barlow Condensed', sans-serif" }}>{vipClients}</p>
            </div>
          </div>

          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
              {t("🔍 Buscar cliente")}
            </label>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("Por nombre o teléfono...")}
              style={{ width: "100%" }}
            />
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "var(--text-dim)", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12 }}>
              <p style={{ fontSize: 36, marginBottom: 8 }}>🎫</p>
              <p style={{ fontSize: 14 }}>
                {search ? t("Ningún cliente coincide") : t("Aún no hay clientes con citas completadas")}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {filtered.map((client, i) => (
                <ClientLoyaltyCard key={client.phone + i} client={client} requiredStamps={REQUIRED_STAMPS} rewardName={REWARD_NAME} stampImage={STAMP_IMAGE} idioma={barbershopConfig?.idioma} />
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB: CANJES */}
      {activeTab === 'canjes' && (
        <RedemptionsManager redemptions={redemptions} slug={slug} requiredStamps={REQUIRED_STAMPS} rewardName={REWARD_NAME} idioma={barbershopConfig?.idioma} />
      )}

      {/* TAB: CONFIG */}
      {activeTab === 'config' && (
        <LoyaltyConfig slug={slug} currentConfig={loyaltyConfig} idioma={barbershopConfig?.idioma} />
      )}
    </div>
  );
}

// ========== CONFIG ==========
function LoyaltyConfig({ slug, currentConfig, idioma }) {
  const t = useT(idioma);
  const [stamps, setStamps] = useState(currentConfig.required_stamps || 10);
  const [reward, setReward] = useState(currentConfig.reward_name || 'Corte gratis');
  const [stampImage, setStampImage] = useState(currentConfig.stamp_image || null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const base64 = await imageToBase64(file, 200, 0.85);
      setStampImage(base64);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    if (confirm(t('¿Quitar imagen y usar ✂️ por defecto?'))) {
      setStampImage(null);
    }
  };

  const handleSave = async () => {
    if (stamps < 2 || stamps > 50) { alert(t('Sellos entre 2 y 50')); return; }
    if (!reward.trim()) { alert(t('Escribe un premio')); return; }
    setSaving(true);
    try {
      await update(ref(db, `barberias/${slug}/config/loyalty_config`), {
        required_stamps: Number(stamps),
        reward_name: reward.trim(),
        stamp_image: stampImage || null
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
      alert(t('Error al guardar'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, maxWidth: 600 }}>
      <h3 style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 18, fontWeight: 700, letterSpacing: 1,
        textTransform: "uppercase", marginBottom: 18, color: "var(--text-primary)"
      }}>
        {t("⚙️ Configurar programa de lealtad")}
      </h3>

      {/* Imagen del sello */}
      <div style={{ marginBottom: 22 }}>
        <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
          {t("🎨 Imagen del sello (opcional)")}
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {/* Preview */}
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: stampImage ? "transparent" : "linear-gradient(135deg, var(--accent), var(--accent-light))",
            border: `2px solid var(--accent)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", fontSize: 24, flexShrink: 0
          }}>
            {stampImage ? <img src={stampImage} alt="Sello" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "✂️"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{
              background: "var(--accent-bg)",
              border: "1px solid var(--accent-border)",
              color: "var(--accent)",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: uploading ? "not-allowed" : "pointer",
              opacity: uploading ? 0.6 : 1,
              fontFamily: "'Barlow', sans-serif"
            }}>
              {uploading ? t('⏳ Procesando...') : (stampImage ? t('🔄 Cambiar imagen') : t('📷 Subir imagen'))}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>
            {stampImage && (
              <button
                type="button"
                onClick={handleRemoveImage}
                style={{
                  background: "transparent",
                  border: "1px solid var(--danger-bg)",
                  color: "var(--danger)",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {t("🗑 Quitar imagen")}
              </button>
            )}
          </div>
        </div>
        {uploadError && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 8 }}>⚠ {uploadError}</p>}
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
          {t("Sube el logo de tu barbería como sello. Tamaño máx 5 MB, se redimensiona automáticamente.")}
        </p>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
          {t("Sellos necesarios para premio")}
        </label>
        <input
          type="number"
          value={stamps}
          onChange={e => setStamps(e.target.value)}
          min="2" max="50"
        />
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          {t("Cuántos cortes debe completar el cliente")}
        </p>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
          {t("Premio")}
        </label>
        <input
          value={reward}
          onChange={e => setReward(e.target.value)}
          placeholder={t("Ej. Corte gratis, 50% descuento, Producto...")}
          maxLength={80}
        />
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          {t("Qué se lleva el cliente al juntar sellos")}
        </p>
      </div>

      <div style={{
        background: "var(--accent-bg)",
        border: "1px solid var(--accent-border)",
        borderRadius: 10,
        padding: 14,
        marginBottom: 18
      }}>
        <p style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, marginBottom: 4 }}>
          {t("📋 Vista previa")}
        </p>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          "{t("Junta")} <strong style={{ color: "var(--accent)" }}>{stamps} {t("sellos")}</strong> {t("y obtén un")} <strong style={{ color: "var(--accent)" }}>{reward}</strong>"
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn-gold" onClick={handleSave} disabled={saving}>
          {saving ? t('Guardando...') : t('💾 Guardar')}
        </button>
        {saved && <p style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>{t("✓ Guardado")}</p>}
      </div>
    </div>
  );
}

// ========== REDEMPTIONS MANAGER ==========
function RedemptionsManager({ redemptions, slug, requiredStamps, rewardName, idioma }) {
  const t = useT(idioma);
  const [filter, setFilter] = useState('pendiente'); // pendiente | aprobado | rechazado | todos

  const filtered = redemptions
    .filter(r => filter === 'todos' || r.status === filter)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const handleApprove = async (id) => {
    if (!confirm(t('Aprobar canje de "{reward}"? Se descontarán {stamps} sellos del cliente.', { reward: rewardName, stamps: requiredStamps }))) return;
    try {
      await update(ref(db, `barberias/${slug}/canjes/${id}`), {
        status: 'aprobado',
        approvedAt: new Date().toISOString(),
        stamps_used: requiredStamps,
        reward_given: rewardName
      });
    } catch (err) {
      console.error(err);
      alert(t('Error al aprobar'));
    }
  };

  const handleReject = async (id) => {
    if (!confirm(t('¿Rechazar este canje? Los sellos NO se descontarán.'))) return;
    try {
      await update(ref(db, `barberias/${slug}/canjes/${id}`), {
        status: 'rechazado',
        rejectedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
      alert(t('Error al rechazar'));
    }
  };

  const statusInfo = {
    pendiente: { label: t('Pendiente'), color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    aprobado: { label: t('Aprobado ✓'), color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    rechazado: { label: t('Rechazado ✗'), color: '#f87171', bg: 'rgba(248,113,113,0.1)' }
  };

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { key: 'pendiente', label: t('⏳ Pendientes') },
          { key: 'aprobado', label: t('✓ Aprobados') },
          { key: 'rechazado', label: t('✗ Rechazados') },
          { key: 'todos', label: t('Todos') }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              background: filter === f.key ? "var(--accent)" : "transparent",
              color: filter === f.key ? "white" : "var(--text-tertiary)",
              border: `1px solid ${filter === f.key ? "var(--accent)" : "var(--border-strong)"}`,
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-dim)", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12 }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>🎁</p>
          <p style={{ fontSize: 14 }}>
            {filter === 'pendiente' ? t('No hay canjes pendientes')
              : filter === 'aprobado' ? t('No hay canjes aprobados')
              : filter === 'rechazado' ? t('No hay canjes rechazados')
              : t('No hay canjes registrados')}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map(r => {
            const info = statusInfo[r.status] || statusInfo.pendiente;
            const initials = (r.client || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={r.id} style={{
                background: "var(--bg-elevated)",
                border: `1px solid ${r.status === 'pendiente' ? '#f59e0b44' : 'var(--border)'}`,
                borderRadius: 12,
                padding: 18
              }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 16, color: "#fff", flexShrink: 0
                  }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{r.client}</p>
                    <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>📞 {r.phone}</p>
                  </div>
                  <div style={{
                    background: info.bg,
                    color: info.color,
                    border: `1px solid ${info.color}`,
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 700
                  }}>{info.label}</div>
                </div>
                <div style={{
                  background: "var(--bg-elevated-2)",
                  border: "1px dashed var(--border-strong)",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: r.status === 'pendiente' ? 12 : 0
                }}>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>{t("Premio solicitado")}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)" }}>🎁 {r.reward_requested || rewardName}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                    {t("Solicitado:")} {r.createdAt ? new Date(r.createdAt).toLocaleString(idioma === 'en' ? 'en-US' : 'es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </p>
                  {r.approvedAt && (
                    <p style={{ fontSize: 11, color: "#4ade80", marginTop: 2 }}>
                      {t("Aprobado:")} {new Date(r.approvedAt).toLocaleString(idioma === 'en' ? 'en-US' : 'es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  )}
                </div>
                {r.status === 'pendiente' && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleReject(r.id)}
                      style={{
                        flex: 1,
                        background: "transparent",
                        color: "#f87171",
                        border: "1px solid #7f1d1d",
                        borderRadius: 8,
                        padding: "10px 14px",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      {t("✗ Rechazar")}
                    </button>
                    <button
                      onClick={() => handleApprove(r.id)}
                      style={{
                        flex: 1,
                        background: "linear-gradient(135deg, #16a34a, #4ade80)",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        padding: "10px 14px",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      {t("✓ Aprobar")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClientLoyaltyCard({ client, requiredStamps, rewardName, stampImage, idioma }) {
  const t = useT(idioma);
  const REQ = requiredStamps || 10;
  const stampsForNext = REQ - (client.stamps % REQ);
  const initials = (client.client || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const stampsInCurrentRow = client.stamps % REQ === 0 && client.stamps > 0 ? REQ : client.stamps % REQ;
  const canRedeem = client.stamps >= REQ;

  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: `1px solid ${canRedeem ? "#f59e0b44" : "var(--border)"}`,
      borderRadius: 12,
      padding: 18
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: canRedeem
            ? "linear-gradient(135deg, #f59e0b, #fbbf24)"
            : "linear-gradient(135deg, var(--accent), var(--accent-light))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 16, color: "#fff", flexShrink: 0
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{client.client}</p>
            {canRedeem && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                color: "#fff", padding: "2px 8px",
                borderRadius: 10, letterSpacing: 0.5
              }}>{t("🎁 LISTO")}</span>
            )}
            {client.redeemed > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: "rgba(var(--accent-rgb),0.15)",
                color: "var(--accent)",
                padding: "2px 8px",
                borderRadius: 10
              }}>{client.redeemed}× {t("canjeado")}</span>
            )}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>📞 {client.phone}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 28, fontWeight: 800, color: "var(--accent)", fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1 }}>{client.stamps}</p>
          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
{t(client.stamps !== 1 ? "sellos" : "sello")}
          </p>
        </div>
      </div>

      <div style={{ background: "var(--bg-elevated-2)", border: "1px dashed var(--border-strong)", borderRadius: 10, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {t("Progreso")} ({stampsInCurrentRow}/{REQ})
          </p>
          {canRedeem ? (
            <p style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>{t("🎁 Premio listo")}</p>
          ) : stampsForNext > 0 && stampsForNext < REQ && (
            <p style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>
              {stampsForNext} {t("para premio")}
            </p>
          )}
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(REQ, 10)}, minmax(0, 1fr))`,
          gap: 6
        }}
        className="stamps-grid"
        >
          {Array.from({ length: REQ }).map((_, idx) => {
            const filled = idx < stampsInCurrentRow;
            return (
              <div key={idx} style={{
                aspectRatio: "1",
                borderRadius: "50%",
                background: filled
                  ? (stampImage ? "transparent" : "linear-gradient(135deg, var(--accent), var(--accent-light))")
                  : "var(--bg-track)",
                border: `2px solid ${filled ? "var(--accent)" : "var(--border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: filled ? "#fff" : "transparent",
                overflow: "hidden"
              }}>
                {filled && stampImage ? (
                  <img src={stampImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : filled ? "✂️" : "·"}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 8, marginTop: 12, paddingTop: 12,
        borderTop: "1px solid var(--border)"
      }}>
        <div>
          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>{t("Total gastado")}</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(client.totalSpent)}</p>
        </div>
        <div>
          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>{t("Ticket promedio")}</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            {client.stamps > 0 ? formatCurrency(Math.round(client.totalSpent / (client.stamps + (client.redeemed * REQ)))) : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== SERVICES VIEW ====================
const DEFAULT_SERVICES_TEMPLATE = [
  { name: "Corte clásico", duration: 30, price: 150, description: "Corte tradicional con tijera y máquina", emoji: "✂️" },
  { name: "Corte + barba", duration: 50, price: 220, description: "Corte completo con arreglo de barba", emoji: "💈" },
  { name: "Degradado", duration: 40, price: 180, description: "Degradado profesional con técnica avanzada", emoji: "🔥" },
  { name: "Barba completa", duration: 30, price: 120, description: "Diseño y arreglo completo de barba", emoji: "🧔" },
  { name: "Corte infantil", duration: 25, price: 100, description: "Corte para niños menores de 12 años", emoji: "👦" },
  { name: "Diseño + líneas", duration: 45, price: 200, description: "Diseños personalizados con líneas", emoji: "✨" },
];

const SERVICE_EMOJIS = ["✂️", "💈", "🔥", "🧔", "👦", "✨", "💇", "🎨", "⭐", "🪒", "👨", "🧖"];

function ServicesView({ slug }) {
  const { services, barbershopConfig } = useApp();
  const t = useT(barbershopConfig?.idioma);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", duration: 30, price: 100, description: "", emoji: "✂️" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setForm({ name: "", duration: 30, price: 100, description: "", emoji: "✂️" });
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const handleEdit = (svc) => {
    setForm({
      name: svc.name || "",
      duration: svc.duration || 30,
      price: svc.price || 100,
      description: svc.description || "",
      emoji: svc.emoji || "✂️"
    });
    setEditingId(svc.id);
    setShowForm(true);
    setError("");
  };

  const handleSave = async () => {
    setError("");
    if (!form.name.trim()) { setError(t("El nombre es obligatorio")); return; }
    if (form.duration < 5 || form.duration > 240) { setError(t("Duración entre 5 y 240 minutos")); return; }
    if (form.price < 0) { setError(t("Precio debe ser positivo")); return; }

    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        duration: Number(form.duration),
        price: Number(form.price),
        description: form.description.trim() || "",
        emoji: form.emoji
      };
      if (editingId) {
        await update(ref(db, `barberias/${slug}/servicios/${editingId}`), data);
      } else {
        await push(ref(db, `barberias/${slug}/servicios`), data);
      }
      resetForm();
    } catch (err) {
      console.error(err);
      setError(t("Error al guardar el servicio"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t("¿Eliminar este servicio? Las citas pasadas con este servicio no se afectan."))) return;
    try {
      await remove(ref(db, `barberias/${slug}/servicios/${id}`));
    } catch (err) {
      console.error(err);
      alert(t("Error al eliminar"));
    }
  };

  const loadDefaults = async () => {
    if (services.length > 0) {
      if (!confirm(t("Ya tienes servicios. ¿Quieres agregar los servicios por defecto a los existentes?"))) return;
    }
    try {
      for (const svc of DEFAULT_SERVICES_TEMPLATE) {
        await push(ref(db, `barberias/${slug}/servicios`), svc);
      }
    } catch (err) {
      console.error(err);
      alert(t("Error al cargar defaults"));
    }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: 4 }}>
            💈 <span className="gold">{t("Servicios")}</span> {t("ofrecidos")}
          </h1>
          <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>
            {t("Edita los cortes y servicios que ofrece tu barbería")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {services.length === 0 && (
            <button className="btn-ghost" onClick={loadDefaults}>
              {t("📋 Cargar defaults")}
            </button>
          )}
          <button className="btn-gold" onClick={() => { resetForm(); setShowForm(true); }}>
            {t("➕ Nuevo servicio")}
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="fade-in" style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--accent-border)",
          borderRadius: 14,
          padding: 22,
          marginBottom: 20
        }}>
          <h3 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 18, fontWeight: 700, letterSpacing: 1,
            textTransform: "uppercase", marginBottom: 18,
            color: "var(--text-primary)"
          }}>
            {editingId ? t("✏️ Editar servicio") : t("➕ Nuevo servicio")}
          </h3>

          {/* Emoji selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
              {t("Ícono")}
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SERVICE_EMOJIS.map(e => (
                <div
                  key={e}
                  onClick={() => setForm({ ...form, emoji: e })}
                  style={{
                    width: 44, height: 44,
                    borderRadius: 10,
                    border: `2px solid ${form.emoji === e ? "var(--accent)" : "var(--border)"}`,
                    background: form.emoji === e ? "var(--accent-bg)" : "var(--bg-elevated-2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, cursor: "pointer", transition: "all 0.2s"
                  }}
                >
                  {e}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
              {t("Nombre del servicio *")}
            </label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder={t("Ej. Corte clásico")}
              maxLength={50}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
                {t("Duración (min) *")}
              </label>
              <input
                type="number"
                value={form.duration}
                onChange={e => setForm({ ...form, duration: e.target.value })}
                min="5" max="240" step="5"
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
                {t("Precio (MXN) *")}
              </label>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                min="0" step="10"
              />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
              {t("Descripción")}
            </label>
            <input
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder={t("Breve descripción del servicio")}
              maxLength={150}
            />
          </div>

          {error && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>⚠ {error}</p>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn-ghost" onClick={resetForm} disabled={saving}>{t("Cancelar")}</button>
            <button className="btn-gold" onClick={handleSave} disabled={saving}>
              {saving ? t("Guardando...") : editingId ? t("Actualizar") : t("Crear servicio")}
            </button>
          </div>
        </div>
      )}

      {/* Lista de servicios */}
      {services.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60,
          color: "var(--text-dim)",
          background: "var(--bg-elevated)",
          border: "1px dashed var(--border-strong)",
          borderRadius: 12
        }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>💈</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
            {t("Aún no tienes servicios configurados")}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {t("Crea tu primer servicio o carga los predeterminados")}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {services.map(svc => (
            <div key={svc.id} style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 18,
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap"
            }}>
              <div style={{
                fontSize: 30,
                width: 56, height: 56,
                background: "var(--bg-elevated-2)",
                borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid var(--border)",
                flexShrink: 0
              }}>
                {svc.emoji || "✂️"}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", marginBottom: 4 }}>
                  {svc.name}
                </p>
                {svc.description && (
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>
                    {svc.description}
                  </p>
                )}
                <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  ⏱ {svc.duration} {t("min")}
                </p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{
                  fontSize: 24, fontWeight: 800,
                  color: "var(--accent)",
                  fontFamily: "'Barlow Condensed', sans-serif"
                }}>${svc.price}</p>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => handleEdit(svc)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-strong)",
                    color: "var(--accent)",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {t("✏️ Editar")}
                </button>
                <button
                  onClick={() => handleDelete(svc.id)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--danger-bg)",
                    color: "var(--danger)",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== CALENDAR MODAL ====================
function CalendarModal({ appointments, barbers, date, setDate, onClose, barbershopConfig, onStatusChange, t, idioma }) {
  const [barberFilter, setBarberFilter] = useState('all');

  const horario = barbershopConfig?.horario || {};
  const startHour = parseInt((horario.hora_inicio || '08:00').split(':')[0]);
  const endHour   = parseInt((horario.hora_fin   || '21:00').split(':')[0]);
  const SLOT_HEIGHT = 64;
  const HOURS = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  const allDayAppts = appointments
    .filter(a => a.date === date && a.status !== 'cancelada')
    .sort((a, b) => a.time.localeCompare(b.time));

  // Columnas: una por barbero (los que tienen citas ese día), o solo el filtrado
  const columns = barberFilter !== 'all'
    ? barbers.filter(b => b.id === barberFilter)
    : barbers.filter(b => allDayAppts.some(a => a.barberId === b.id));

  // Citas sin barbero asignado (edge case) van en columna aparte
  const unassignedAppts = allDayAppts.filter(a => !barbers.some(b => b.id === a.barberId));
  const showUnassignedCol = barberFilter === 'all' && unassignedAppts.length > 0;

  const dayAppts = barberFilter !== 'all'
    ? allDayAppts.filter(a => a.barberId === barberFilter)
    : allDayAppts;

  const moveDay = (delta) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split('T')[0]);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = date === todayStr;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes   = startHour * 60;
  const endMinutes     = endHour   * 60;
  const timeLineTop = isToday && currentMinutes >= startMinutes && currentMinutes <= endMinutes
    ? ((currentMinutes - startMinutes) / 60) * SLOT_HEIGHT
    : null;

  const getApptTop    = (time) => { const [h, m] = time.split(':').map(Number); return ((h * 60 + m - startMinutes) / 60) * SLOT_HEIGHT; };
  const getApptHeight = (dur = 30) => Math.max((dur / 60) * SLOT_HEIGHT, 28);

  const STATUS_COLORS = {
    pendiente:  { bg: 'rgba(245,158,11,0.18)', border: '#f59e0b' },
    confirmada: { bg: 'rgba(74,222,128,0.15)', border: '#4ade80' },
    completada: { bg: 'rgba(54,177,223,0.15)', border: 'var(--accent)' },
  };

  const headerDate = (() => {
    const d = new Date(date + 'T00:00:00');
    return idioma === 'en'
      ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  })();

  const gcalLink = (appt) => {
    const barber = barbers.find(b => b.id === appt.barberId);
    const [h, m] = appt.time.split(':').map(Number);
    const dur = appt.service?.duration || 30;
    const pad = n => String(n).padStart(2, '0');
    const dateStr = appt.date.replace(/-/g, '');
    const startT  = `${dateStr}T${pad(h)}${pad(m)}00`;
    const endDt   = new Date(`${appt.date}T${appt.time}`);
    endDt.setMinutes(endDt.getMinutes() + dur);
    const endT = `${endDt.getFullYear()}${pad(endDt.getMonth()+1)}${pad(endDt.getDate())}T${pad(endDt.getHours())}${pad(endDt.getMinutes())}00`;
    const title   = encodeURIComponent(`✂️ ${appt.client} — ${appt.service?.name || 'Cita'}`);
    const details = encodeURIComponent(`Barbero: ${barber?.name || '—'}
Servicio: ${appt.service?.name || '—'}
Teléfono: ${appt.phone || '—'}
Folio: ${appt.folio || '—'}`);
    const location = encodeURIComponent(barbershopConfig?.direccion || barbershopConfig?.nombre || '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startT}/${endT}&details=${details}&location=${location}`;
  };

  // Render de una columna (apoya un barbero específico, o null = todas las citas en una sola)
  const renderColumn = (barberId, isLast) => {
    const colAppts = barberId === null
      ? dayAppts
      : (barberId === 'unassigned' ? unassignedAppts : dayAppts.filter(a => a.barberId === barberId));

    return (
      <div key={barberId ?? 'single'} style={{
        flex: 1, position: 'relative', minWidth: 140,
        borderLeft: '1px solid var(--border)',
        borderRight: isLast ? 'none' : 'none'
      }}>
        {/* Hour rows */}
        {HOURS.map(h => (
          <div key={h} style={{ height: SLOT_HEIGHT, borderTop: '1px solid var(--border)', background: h % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.008)' }} />
        ))}
        {/* Half-hour marks */}
        {HOURS.map(h => (
          <div key={`h${h}`} style={{ position: 'absolute', top: ((h - startHour) + 0.5) * SLOT_HEIGHT, left: 0, right: 0, height: 1, background: 'var(--border)', opacity: 0.4 }} />
        ))}
        {/* Current time line */}
        {timeLineTop !== null && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: timeLineTop, zIndex: 10, display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0, marginLeft: -4 }} />
            <div style={{ flex: 1, height: 2, background: '#ef4444' }} />
          </div>
        )}
        {/* Appointment blocks */}
        {colAppts.map((appt, idx) => {
          const barber  = barbers.find(b => b.id === appt.barberId);
          const top     = getApptTop(appt.time);
          const height  = getApptHeight(appt.service?.duration || 30) - 4;
          const colors  = STATUS_COLORS[appt.status] || STATUS_COLORS.pendiente;
          const overlap = colAppts.filter((a, i) => i < idx && Math.abs(getApptTop(a.time) - top) < getApptHeight(a.service?.duration || 30));
          const offsetX = overlap.length * 8;

          return (
            <div key={appt.id} style={{
              position: 'absolute', top: top + 2, left: 4 + offsetX, right: 4,
              height, background: colors.bg,
              border: `1.5px solid ${colors.border}`, borderLeft: `4px solid ${colors.border}`,
              borderRadius: 8, padding: '3px 6px', overflow: 'hidden', zIndex: 5 + idx,
              transition: 'box-shadow 0.15s', display: 'flex', flexDirection: 'column', justifyContent: 'center'
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 2px 12px ${colors.border}55`}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
                <p style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {appt.time} · {appt.client}
                </p>
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  {appt.status === 'pendiente' && (
                    <button title={t('Confirmar')} onClick={() => onStatusChange(appt.id, 'confirmada')} style={{ background: '#4ade8018', border: '1px solid #4ade80', color: '#4ade80', borderRadius: 4, padding: '1px 4px', fontSize: 8, fontWeight: 800, cursor: 'pointer' }}>✓</button>
                  )}
                  {(appt.status === 'pendiente' || appt.status === 'confirmada') && (
                    <button title={t('Completada')} onClick={() => onStatusChange(appt.id, 'completada')} style={{ background: '#36B1DF18', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 4, padding: '1px 4px', fontSize: 8, fontWeight: 800, cursor: 'pointer' }}>✂</button>
                  )}
                  <a href={gcalLink(appt)} target="_blank" rel="noopener noreferrer" title="Agregar a Google Calendar" style={{ background: '#4285F418', border: '1px solid #4285F4', color: '#4285F4', borderRadius: 4, padding: '1px 4px', fontSize: 8, fontWeight: 800, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>G</a>
                </div>
              </div>
              {height > 34 && (
                <p style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {appt.service?.name || '—'}{(barberId === null && barber) ? ` · ${barber.name}` : ''}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const useColumns = barberFilter === 'all' && columns.length > 1;
  const modalMaxWidth = useColumns
    ? Math.min(420 + (columns.length + (showUnassignedCol ? 1 : 0)) * 170, 1100)
    : 680;

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.78)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 2000, padding: '20px 16px', overflowY: 'auto'
      }}
    >
      <div className="fade-in" style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
        borderRadius: 16, width: '100%', maxWidth: modalMaxWidth, marginBottom: 20,
        overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
        transition: 'max-width 0.2s'
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-elevated-2)', flexWrap: 'wrap', gap: 8
        }}>
          {/* Nav arrows + today + date picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => moveDay(-1)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-strong)', color: 'var(--text-secondary)', borderRadius: 7, width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <button onClick={() => setDate(todayStr)} style={{ background: isToday ? 'var(--accent)' : 'var(--bg-input)', border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border-strong)'}`, color: isToday ? 'white' : 'var(--text-secondary)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: "'Barlow', sans-serif", textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('Hoy')}</button>
            <button onClick={() => moveDay(1)}  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-strong)', color: 'var(--text-secondary)', borderRadius: 7, width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-strong)', color: 'var(--text-secondary)', borderRadius: 7, padding: '5px 8px', fontSize: 12, fontFamily: "'Barlow', sans-serif" }} />
          </div>

          {/* Date title */}
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-primary)', textTransform: 'capitalize', flex: 1, textAlign: 'center', minWidth: 160 }}>
            {headerDate}
            <span style={{ marginLeft: 8, background: 'var(--accent-bg)', color: 'var(--accent)', padding: '1px 9px', borderRadius: 10, fontSize: 10, fontWeight: 800 }}>
              {dayAppts.length} {t(dayAppts.length !== 1 ? 'citas' : 'cita')}
            </span>
          </p>

          {/* Barber filter + close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={barberFilter}
              onChange={e => setBarberFilter(e.target.value)}
              style={{
                background: 'var(--bg-input)', border: '1px solid var(--border-strong)',
                color: 'var(--text-secondary)', borderRadius: 7, padding: '5px 8px',
                fontSize: 12, fontFamily: "'Barlow', sans-serif", cursor: 'pointer'
              }}
            >
              <option value="all">👥 {t('Todos')}</option>
              {barbers.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* ── Column headers (solo si hay varias columnas) ── */}
        {useColumns && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated-2)' }}>
            <div style={{ width: 50, flexShrink: 0 }} />
            {columns.map(b => (
              <div key={b.id} style={{
                flex: 1, minWidth: 140, padding: '8px 10px', textAlign: 'center',
                borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 6
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.color || 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
              </div>
            ))}
            {showUnassignedCol && (
              <div style={{ flex: 1, minWidth: 140, padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{t('Sin asignar')}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Calendar grid ── */}
        <div style={{ display: 'flex', overflowY: 'auto', overflowX: useColumns ? 'auto' : 'hidden', maxHeight: 'calc(100vh - 240px)' }}>

          {/* Time gutter */}
          <div style={{ width: 50, flexShrink: 0 }}>
            {HOURS.map(h => (
              <div key={h} style={{
                height: SLOT_HEIGHT, display: 'flex', alignItems: 'flex-start',
                justifyContent: 'flex-end', paddingRight: 8, paddingTop: 4,
                borderTop: '1px solid var(--border)', color: 'var(--text-muted)',
                fontSize: 9, fontWeight: 600, userSelect: 'none', letterSpacing: 0.3
              }}>
                {String(h).padStart(2,'0')}:00
              </div>
            ))}
          </div>

          {/* Columnas */}
          {useColumns ? (
            <>
              {columns.map((b, i) => renderColumn(b.id, i === columns.length - 1 && !showUnassignedCol))}
              {showUnassignedCol && renderColumn('unassigned', true)}
            </>
          ) : (
            renderColumn(null, true)
          )}

          {/* Empty state global */}
          {dayAppts.length === 0 && (
            <div style={{ position: 'absolute', left: 50, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', pointerEvents: 'none' }}>
              <p style={{ fontSize: 32, marginBottom: 6 }}>📭</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{t('Sin citas este día')}</p>
            </div>
          )}
        </div>

        {/* ── Footer legend ── */}
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated-2)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {[
            { k: 'pendiente',  label: t('Pendiente'),    col: '#f59e0b' },
            { k: 'confirmada', label: t('Confirmada ✓'), col: '#4ade80' },
            { k: 'completada', label: t('Completada'),    col: 'var(--accent)' },
          ].map(s => (
            <div key={s.k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 9, height: 9, borderRadius: 2, background: s.col }} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 800, background: '#4285F418', border: '1px solid #4285F4', color: '#4285F4', padding: '1px 6px', borderRadius: 4 }}>G</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t('Agregar a Google Calendar')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== COMPONENTES DASHBOARD ====================
function StatCardPro({ label, value, color, change, spark, maxSpark, icon, subtitle, progress, onClick }) {
  const sparkPoints = spark
    ? spark.map((v, i) => `${(i / (spark.length - 1)) * 100},${20 - (v / maxSpark) * 16}`).join(' ')
    : null;

  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-elevated)",
        border: `1px solid ${isClickable ? color + '44' : "var(--border)"}`,
        borderRadius: 12,
        padding: 14,
        position: "relative",
        overflow: "hidden",
        transition: "all 0.2s",
        cursor: isClickable ? "pointer" : "default",
        boxShadow: isClickable ? `0 0 0 1px ${color}22` : "none"
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        if (isClickable) {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.boxShadow = `0 4px 16px ${color}33`;
        } else {
          e.currentTarget.style.borderColor = "var(--border-strong)";
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = isClickable ? color + '44' : "var(--border)";
        e.currentTarget.style.boxShadow = isClickable ? `0 0 0 1px ${color}22` : "none";
      }}
    >
      {/* Hairline de color: identifica la métrica de un vistazo */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${color}, transparent 70%)`,
        opacity: 0.8
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{
          fontSize: 10, color: "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: 0.5,
          fontWeight: 600
        }}>{label}</span>
        {change !== undefined && change !== 0 && (
          <span style={{
            background: change > 0 ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
            color: change > 0 ? "#4ade80" : "#f87171",
            fontSize: 10,
            padding: "2px 6px",
            borderRadius: 4,
            fontWeight: 700
          }}>
            {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
        {icon && (
          <span style={{
            background: "rgba(245,158,11,0.15)",
            color: "#f59e0b",
            fontSize: 11,
            width: 18, height: 18,
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800
          }}>{icon}</span>
        )}
      </div>
      <p style={{
        fontSize: 26, fontWeight: 800,
        color, fontFamily: "'Barlow Condensed', sans-serif",
        lineHeight: 1, letterSpacing: 0.3
      }}>{value}</p>
      {subtitle && (
        <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{subtitle}</p>
      )}
      {sparkPoints && (
        <svg width="100%" height="20" viewBox="0 0 100 20" preserveAspectRatio="none" style={{ marginTop: 6 }}>
          <polyline points={sparkPoints} fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
      )}
      {progress !== undefined && (
        <div style={{
          background: "var(--bg-track)",
          height: 4, borderRadius: 2,
          marginTop: 8, overflow: "hidden"
        }}>
          <div style={{
            background: `linear-gradient(90deg, ${color}, ${color}aa)`,
            height: "100%", width: `${progress}%`,
            transition: "width 0.4s"
          }} />
        </div>
      )}
    </div>
  );
}

function QuickAction({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 12,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        transition: "all 0.2s",
        fontFamily: "'Barlow', sans-serif"
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 6px 18px ${color}22`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <span style={{
        fontSize: 20,
        width: 40, height: 40, borderRadius: 11,
        background: `${color}18`,
        border: `1px solid ${color}33`,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>{icon}</span>
      <span style={{
        fontSize: 12,
        fontWeight: 700,
        color: "var(--text-secondary)"
      }}>{label}</span>
    </button>
  );
}

// ==================== PRODUCTS VIEW ====================
function ProductsView({ slug }) {
  const { barbershopConfig } = useApp();
  const t = useT(barbershopConfig?.idioma);
  const idioma = barbershopConfig?.idioma;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', costo: '', description: '', image: '', cantidad: '' });
  const [showCalc, setShowCalc] = useState(false);
  const [calc, setCalc] = useState({ costo: '', precio: '' });
  const fileRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onValue(ref(db, `barberias/${slug}/productos`), snap => {
      const data = snap.val();
      if (data) {
        setProducts(Object.entries(data).map(([id, p]) => ({ id, ...p })).sort((a,b) => (a.name||'').localeCompare(b.name||'')));
      } else {
        setProducts([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [slug]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', price: '', costo: '', description: '', image: '', cantidad: '' });
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p.id);
    setForm({ name: p.name || '', price: String(p.price || ''), costo: String(p.costo ?? ''), description: p.description || '', image: p.image || '', cantidad: String(p.cantidad ?? '') });
    setShowForm(true);
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert(t('La imagen no debe pesar más de 5MB')); return; }
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, image: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { alert(t('El nombre del producto es obligatorio')); return; }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) { alert(t('Ingresa un precio válido')); return; }
    if (form.cantidad !== '' && (isNaN(Number(form.cantidad)) || Number(form.cantidad) < 0)) { alert(t('Ingresa una cantidad válida')); return; }
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        price: Number(form.price),
        costo: form.costo !== '' ? Number(form.costo) : null,
        description: form.description.trim(),
        image: form.image || '',
        cantidad: form.cantidad !== '' ? Number(form.cantidad) : null,
        updatedAt: Date.now()
      };
      if (editing) {
        await update(ref(db, `barberias/${slug}/productos/${editing}`), data);
      } else {
        await push(ref(db, `barberias/${slug}/productos`), { ...data, createdAt: Date.now() });
      }
      setShowForm(false);
    } catch (err) {
      alert(t('Error al guardar el producto'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('¿Eliminar este producto?'))) return;
    setDeleting(id);
    try {
      await remove(ref(db, `barberias/${slug}/productos/${id}`));
    } catch { alert(t('Error al eliminar')); }
    finally { setDeleting(null); }
  };

  const labelStyle = { fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 8 };

  // Export products CSV
  const exportProductos = () => {
    const rows = [[t('Nombre'), t('Precio Venta'), t('Costo Adquisición'), t('Ganancia Neta'), t('Margen %'), t('Stock'), t('Descripción')]];
    products.forEach(p => {
      const ganancia = p.costo != null ? p.price - p.costo : '';
      const margen = p.costo != null ? (((p.price - p.costo) / p.price) * 100).toFixed(1) : '';
      rows.push([p.name, p.price, p.costo ?? '', ganancia, margen, p.cantidad ?? '', p.description || '']);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = idioma === 'en' ? 'products.csv' : 'productos.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // Summary stats
  const totalProductos = products.length;
  const productosConCosto = products.filter(p => p.costo != null);
  const gananciaTotal = productosConCosto.reduce((s, p) => s + (p.price - p.costo) * (p.cantidad || 1), 0);
  const margenPromedio = productosConCosto.length > 0
    ? (productosConCosto.reduce((s, p) => s + ((p.price - p.costo) / p.price * 100), 0) / productosConCosto.length).toFixed(1)
    : null;

  // Calc results
  const calcPrecio = Number(calc.precio) || 0;
  const calcCosto = Number(calc.costo) || 0;
  const calcGanancia = calcPrecio - calcCosto;
  const calcMargen = calcPrecio > 0 ? ((calcGanancia / calcPrecio) * 100).toFixed(1) : 0;
  const calcROI = calcCosto > 0 ? ((calcGanancia / calcCosto) * 100).toFixed(1) : 0;

  return (
    <div style={{ padding: '32px 24px', maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: 4 }}>{t("Productos")}</h2>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
            {products.length} {t(products.length !== 1 ? "productos" : "producto")} {t("en el catálogo")}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setShowCalc(c => !c)} style={{
            background: showCalc ? 'var(--accent-bg)' : 'var(--bg-elevated)',
            border: `1px solid ${showCalc ? 'var(--accent)' : 'var(--border)'}`,
            color: showCalc ? 'var(--accent)' : 'var(--text-secondary)',
            borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: "'Barlow', sans-serif"
          }}>
            {t("🧮 Calculadora")}
          </button>
          <button onClick={exportProductos} style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', borderRadius: 8, padding: '8px 14px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Barlow', sans-serif"
          }}>
            {t("↓ Exportar")}
          </button>
          <button className="btn-gold" onClick={openNew}>{t("+ Agregar producto")}</button>
        </div>
      </div>

      {/* KPIs de ganancias */}
      {productosConCosto.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { label: t('Ganancia neta potencial'), value: `$${gananciaTotal.toLocaleString()}`, color: '#4ade80', sub: t('Si vendes todo el stock') },
            { label: t('Margen promedio'), value: `${margenPromedio}%`, color: 'var(--accent)', sub: t('Sobre precio de venta') },
            { label: t('Productos con costo'), value: `${productosConCosto.length}/${totalProductos}`, color: '#a78bfa', sub: t('Tienen costo registrado') },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Calculadora de ganancias */}
      {showCalc && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--accent-border)', borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>{t("🧮 Calculadora de ganancias")}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>{t("Costo de adquisición")}</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700 }}>$</span>
                <input value={calc.costo} onChange={e => setCalc(c => ({ ...c, costo: e.target.value }))} type="number" min="0" placeholder="0" style={{ paddingLeft: 28 }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>{t("Precio de venta")}</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700 }}>$</span>
                <input value={calc.precio} onChange={e => setCalc(c => ({ ...c, precio: e.target.value }))} type="number" min="0" placeholder="0" style={{ paddingLeft: 28 }} />
              </div>
            </div>
          </div>
          {calcPrecio > 0 && calcCosto > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: t('Ganancia neta'), value: `$${calcGanancia.toLocaleString()}`, color: calcGanancia > 0 ? '#4ade80' : '#ef4444' },
                { label: t('Margen'), value: `${calcMargen}%`, color: 'var(--accent)' },
                { label: 'ROI', value: `${calcROI}%`, color: '#a78bfa' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</p>
                  <p style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</p>
                </div>
              ))}
            </div>
          )}
          {calcPrecio > 0 && calcCosto > 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
              {idioma === 'en'
                ? `For every $${calcPrecio} you sell, you make $${calcGanancia > 0 ? calcGanancia : 0} after recovering your $${calcCosto} investment.`
                : `Por cada $${calcPrecio} que vendes, ganas $${calcGanancia > 0 ? calcGanancia : 0} después de recuperar tu inversión de $${calcCosto}.`}
            </p>
          )}
        </div>
      )}


      {/* Grid de productos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>{t("Cargando...")}</div>
      ) : products.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60,
          background: 'var(--bg-elevated)', border: '2px dashed var(--border)',
          borderRadius: 16, color: 'var(--text-tertiary)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🛍</div>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{t("Sin productos aún")}</p>
          <p style={{ fontSize: 14 }}>{t("Agrega los productos que vendes en tu barbería")}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {products.map(p => (
            <div key={p.id} style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s'
            }}>
              {/* Imagen */}
              <div style={{
                height: 180, background: 'var(--bg-input)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', position: 'relative'
              }}>
                {p.image ? (
                  <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 48 }}>📦</span>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
                  <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.3 }}>{p.name}</p>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)', fontFamily: "'Barlow Condensed', sans-serif" }}>
                      ${p.price}
                    </p>
                    {p.costo != null && (
                      <p style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>
                        +${(p.price - p.costo).toLocaleString()} {t("neto")}
                      </p>
                    )}
                  </div>
                </div>
                {/* Costo + margen */}
                {p.costo != null && (
                  <div style={{ marginBottom: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: '#1a1a1a', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      {t("Costo:")} ${p.costo}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#4ade8015', color: '#4ade80', border: '1px solid #4ade8040' }}>
                      {(((p.price - p.costo) / p.price) * 100).toFixed(0)}% {t("margen")}
                    </span>
                  </div>
                )}
                {/* Stock badge */}
                {p.cantidad !== null && p.cantidad !== undefined && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                      background: p.cantidad === 0 ? '#ef444415' : p.cantidad <= 5 ? '#f59e0b15' : '#10b98115',
                      color: p.cantidad === 0 ? '#ef4444' : p.cantidad <= 5 ? '#f59e0b' : '#10b981',
                      border: `1px solid ${p.cantidad === 0 ? '#ef444440' : p.cantidad <= 5 ? '#f59e0b40' : '#10b98140'}`,
                    }}>
                      {p.cantidad === 0 ? t('Agotado') : p.cantidad <= 5 ? `${t('Últimas')} ${p.cantidad} ${t('piezas')}` : `${p.cantidad} ${t('en stock')}`}
                    </span>
                  </div>
                )}
                {p.description && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                    {p.description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(p)} style={{
                    flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', borderRadius: 8, padding: '8px 0',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Barlow', sans-serif"
                  }}>
                    {t("Editar")}
                  </button>
                  <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} style={{
                    background: '#ef444410', border: '1px solid #ef444430',
                    color: '#ef4444', borderRadius: 8, padding: '8px 14px',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Barlow', sans-serif"
                  }}>
                    {deleting === p.id ? '...' : '🗑'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20
        }} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
            borderRadius: 16, padding: 28, width: '100%', maxWidth: 480,
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24 }}>
              {editing ? t('Editar producto') : t('Nuevo producto')}
            </h3>

            {/* Foto */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>{t("Fotografía del producto")}</label>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  width: '100%', height: 200, borderRadius: 12,
                  border: `2px dashed ${form.image ? 'var(--accent)' : 'var(--border)'}`,
                  background: 'var(--bg-input)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', transition: 'border-color 0.2s'
                }}
              >
                {form.image ? (
                  <img src={form.image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
                    <p style={{ fontSize: 13 }}>{t("Click para subir imagen")}</p>
                    <p style={{ fontSize: 11, marginTop: 4 }}>{t("JPG, PNG · Máx 5MB")}</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
              {form.image && (
                <button onClick={() => setForm(f => ({ ...f, image: '' }))} style={{
                  marginTop: 8, background: 'transparent', border: 'none',
                  color: 'var(--danger)', fontSize: 12, cursor: 'pointer', fontFamily: "'Barlow', sans-serif"
                }}>
                  {t("Quitar imagen")}
                </button>
              )}
            </div>

            {/* Nombre */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>{t("Nombre del producto *")}</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t("Ej: Pomada texturizante, aceite para barba...")}
                autoFocus
              />
            </div>

            {/* Precio y Costo — lado a lado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>{t("Precio de venta *")}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700, fontSize: 16 }}>$</span>
                  <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" type="number" min="0" style={{ paddingLeft: 30 }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>{t("Costo de adquisición")} <span style={{ textTransform: 'none', fontWeight: 400 }}>{t("(opcional)")}</span></label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700, fontSize: 16 }}>$</span>
                  <input value={form.costo} onChange={e => setForm(f => ({ ...f, costo: e.target.value }))} placeholder="0" type="number" min="0" style={{ paddingLeft: 30 }} />
                </div>
              </div>
            </div>

            {/* Preview ganancia */}
            {form.price && form.costo && Number(form.price) > 0 && Number(form.costo) > 0 && (
              <div style={{ marginBottom: 16, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t("Ganancia neta por unidad")}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#4ade80', fontFamily: "'Barlow Condensed', sans-serif" }}>
                  ${(Number(form.price) - Number(form.costo)).toLocaleString()} ({(((Number(form.price) - Number(form.costo)) / Number(form.price)) * 100).toFixed(0)}%)
                </span>
              </div>
            )}

            {/* Cantidad en stock */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>
                {t("Cantidad en inventario")}
                <span style={{ textTransform: 'none', fontWeight: 400 }}> {t("(opcional)")}</span>
              </label>
              <input
                value={form.cantidad}
                onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
                placeholder={t("Ej: 10")}
                type="number" min="0"
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                {t('Deja vacío si no quieres mostrar stock. Con 0 aparecerá como "Agotado".')}
              </p>
            </div>

            {/* Descripción */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>{t("Descripción")} <span style={{ textTransform: 'none', fontWeight: 400 }}>{t("(opcional)")}</span></label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t("Descripción breve del producto, uso, beneficios...")}
                style={{ minHeight: 80 }}
              />
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-ghost" onClick={() => setShowForm(false)} disabled={saving} style={{ flex: 1 }}>
                {t("Cancelar")}
              </button>
              <button className="btn-gold" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
                {saving ? t('Guardando...') : editing ? t('Guardar cambios') : t('Agregar producto')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
