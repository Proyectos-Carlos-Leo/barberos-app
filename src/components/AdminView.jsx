import { useState, useEffect, useRef, useMemo } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, update } from 'firebase/database';
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
import {
  getTodayStr,
  filterAppointments,
  calculateStats,
  getBarberStats,
  formatDate,
  formatCurrency
} from '../utils/helpers';

export default function AdminView() {
  const [isAuth, setIsAuth] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [view, setView] = useState("dashboard");
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const previousIdsRef = useRef(null);
  const { appointments, barbers, blocks, barbershopConfig, slug, updateAppointmentStatus, deleteAppointment, toggleBarber, addBarber, deleteBarber, loading } = useApp();

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
    if (!isAuth || loading) return;

    const currentIds = new Set(appointments.map(a => a.id));

    // Primera carga: solo guardar IDs, no notificar
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
  }, [appointments, isAuth, loading]);

  // Limpiar título al salir
  useEffect(() => {
    return () => updateTabTitle(0);
  }, []);

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
          Acceso Denegado
        </h2>
        <p style={{ color: "var(--text-tertiary)", fontSize: 15, marginBottom: 8, maxWidth: 380 }}>
          Tu cuenta no tiene permiso para administrar esta barbería.
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 32 }}>
          Verifica que estés usando el correo correcto.
        </p>
        <button className="btn-gold" onClick={() => setAccessDenied(false)} style={{ minWidth: 200 }}>
          Intentar con otra cuenta
        </button>
      </div>
    </div>
  );

  // Si no está autenticado, mostrar login
  if (!isAuth) return <AdminLogin onLogin={() => setIsAuth(true)} />;

  const navItems = [
    { key: "dashboard", label: "Panel", active: view === "dashboard", onClick: () => setView("dashboard") },
    { key: "team", label: "Equipo", active: view === "team", onClick: () => setView("team") },
    { key: "schedule", label: "Horarios", active: view === "schedule", onClick: () => setView("schedule") },
    { key: "reports", label: "Reportes", active: view === "reports", onClick: () => setView("reports") },
    { key: "history", label: "Historial", active: view === "history", onClick: () => setView("history") },
    ...(barbershopConfig?.lealtad_activa !== false ? [
      { key: "loyalty", label: "Lealtad", active: view === "loyalty", onClick: () => setView("loyalty") }
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
          <p style={{ fontSize: 13, color: "#36B1DF", flex: 1, minWidth: 200 }}>
            <strong>Activa las notificaciones</strong> para recibir un aviso cada vez que alguien agende una cita
          </p>
          <button
            onClick={handleEnableNotifications}
            style={{
              padding: "6px 14px",
              background: "linear-gradient(135deg, #36B1DF, #5FC8EC)",
              color: "var(--bg-main)",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              textTransform: "uppercase"
            }}
          >
            Activar
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
            Después
          </button>
        </div>
      )}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 14px" }}>
        {view === "dashboard" && <DashboardView appointments={appointments} barbers={barbers} onStatusChange={updateAppointmentStatus} onDelete={deleteAppointment} />}
        {view === "team" && <TeamView barbers={barbers} appointments={appointments} blocks={blocks} onToggle={toggleBarber} onAdd={addBarber} onDelete={deleteBarber} />}
        {view === "reports" && <ReportsView appointments={appointments} barbers={barbers} />}
        {view === "history" && <HistoryView appointments={appointments} barbers={barbers} />}
        {view === "schedule" && <ScheduleView barbershopConfig={barbershopConfig} slug={slug} barbers={barbers} blocks={blocks} />}
        {view === "loyalty" && <LoyaltyView appointments={appointments} />}
      </main>
    </div>
  );
}

// ==================== DASHBOARD ====================
function DashboardView({ appointments, barbers, onStatusChange, onDelete }) {
  const [filterDate, setFilterDate] = useState(getTodayStr());
  const [filterBarber, setFilterBarber] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }

  const filtered = filterAppointments(appointments, { date: filterDate, barberId: filterBarber, status: filterStatus })
    .sort((a, b) => a.time.localeCompare(b.time));

  const stats = calculateStats(appointments);

  const statCards = [
    { label: "Citas hoy", value: stats.todayTotal, color: "#36B1DF", icon: "📅" },
    { label: "Pendientes", value: stats.pending, color: "#f87171", icon: "⏳" },
    { label: "Completadas hoy", value: stats.completedToday, color: "#4ade80", icon: "✓" },
    { label: "Ingresos hoy", value: formatCurrency(stats.revenueToday), color: "#60a5fa", icon: "💰" },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-title" style={{ marginBottom: 4 }}>Panel del <span className="gold">dueño</span></h1>
        <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>Administra todas las citas en tiempo real</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 28 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
            <span style={{ position: "absolute", top: 12, right: 14, fontSize: 18, opacity: 0.4 }}>{s.icon}</span>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'Barlow Condensed', sans-serif" }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Filtros</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 600 }}>Fecha</label>
            <input type="date" value={filterDate === "all" ? "" : filterDate} onChange={e => setFilterDate(e.target.value || "all")} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 600 }}>Barbero</label>
            <select value={filterBarber} onChange={e => setFilterBarber(e.target.value)}>
              <option value="all">Todos</option>
              {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 600 }}>Estado</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="confirmada">Confirmada</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 16 }}>{filtered.length} cita{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}</p>

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-dim)", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <p style={{ fontSize: 36, marginBottom: 8 }}>📭</p>
            <p style={{ fontSize: 14 }}>No hay citas con estos filtros</p>
          </div>
        )}
        {filtered.map(appt => {
          const barber = barbers.find(b => b.id === appt.barberId);
          const sc = STATUS_COLORS[appt.status] || STATUS_COLORS.pendiente;
          const isOpen = selected === appt.id;
          return (
            <div key={appt.id} className="card appt-card" style={{ cursor: "pointer", border: `1px solid ${isOpen ? "#36B1DF33" : "var(--border)"}`, transition: "all 0.2s" }} onClick={() => setSelected(isOpen ? null : appt.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: "#36B1DF", minWidth: 56 }}>{appt.time}</div>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: barber?.bg || "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: barber?.color || "#fff", flexShrink: 0 }}>{barber?.avatar || "?"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{appt.client}</p>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{appt.service?.name} · {barber?.name || "Sin asignar"}</p>
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <span style={{ fontWeight: 700, color: "#36B1DF", fontSize: 16 }}>{formatCurrency(appt.service?.price || 0)}</span>
                  <span className="tag" style={{ background: sc.bg, color: sc.text }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot, display: "inline-block" }}></span>
                    {sc.label}
                  </span>
                </div>
              </div>
              {isOpen && (
                <div className="fade-in" style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 16 }}>
                    <div>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Fecha</p>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(appt.date)}</p>
                    </div>
                    {appt.phone && (
                      <div>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Teléfono</p>
                        <a href={`tel:${appt.phone}`} onClick={e => e.stopPropagation()} style={{ fontSize: 13, fontWeight: 600 }}>📞 {appt.phone}</a>
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Duración</p>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{appt.service?.duration} min</p>
                    </div>
                  </div>
                  {appt.notes && (
                    <div style={{ background: "var(--bg-elevated-2)", borderRadius: 8, padding: 12, marginBottom: 16, borderLeft: "3px solid #36B1DF" }}>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Notas</p>
                      <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--text-secondary)" }}>"{appt.notes}"</p>
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Cambiar estado</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {Object.entries(STATUS_COLORS).map(([key, s]) => (
                        <button key={key} onClick={e => { e.stopPropagation(); onStatusChange(appt.id, key); }} style={{ padding: "6px 14px", borderRadius: 6, border: `1.5px solid ${appt.status === key ? s.dot : "var(--border-strong)"}`, background: appt.status === key ? s.bg : "transparent", color: appt.status === key ? s.text : "var(--text-tertiary)", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>{s.label}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete({ id: appt.id, name: appt.client }); }} style={{ padding: "6px 14px", background: "transparent", border: "1px solid var(--border-strong)", color: "#f87171", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🗑 Eliminar</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <ConfirmModal
        open={!!confirmDelete}
        title="¿Eliminar cita?"
        message={confirmDelete ? `Vas a eliminar la cita de ${confirmDelete.name}. Esta acción no se puede deshacer.` : ''}
        confirmText="Sí, eliminar"
        onConfirm={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

// ==================== TEAM VIEW ====================
function TeamView({ barbers, appointments, blocks, onToggle, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ name: "", specialty: "" });

  const handleAdd = () => {
    if (!form.name.trim() || !form.specialty.trim()) return;
    onAdd({ name: form.name.trim(), specialty: form.specialty.trim() });
    setForm({ name: "", specialty: "" });
    setShowForm(false);
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: 4 }}>Tu <span className="gold">equipo</span></h1>
          <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>Gestiona barberos</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn-gold" onClick={() => setShowForm(!showForm)}>{showForm ? "Cancelar" : "+ Agregar barbero"}</button>
        </div>
      </div>

      {showForm && (
        <div className="fade-in card" style={{ padding: 24, marginBottom: 20, border: "1px solid #0a3d56" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18, color: "#36B1DF" }}>Nuevo barbero</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 600, textTransform: "uppercase" }}>Nombre *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej. Juan Pérez" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 5, fontWeight: 600, textTransform: "uppercase" }}>Especialidad *</label>
              <input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="Ej. Degradados" />
            </div>
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn-ghost" onClick={() => { setShowForm(false); setForm({ name: "", specialty: "" }); }}>Cancelar</button>
            <button className="btn-gold" onClick={handleAdd} disabled={!form.name || !form.specialty}>Agregar</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {barbers.map(b => {
          const stats = getBarberStats(appointments, b.id);
          return (
            <div key={b.id} className="card" style={{ padding: 22, opacity: b.active ? 1 : 0.5, transition: "opacity 0.3s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: b.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, color: b.color, flexShrink: 0 }}>{b.avatar}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 3 }}>{b.name}</p>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{b.specialty}</p>
                </div>
                <div style={{ width: 40, height: 22, borderRadius: 11, background: b.active ? "var(--success-bg)" : "var(--danger-bg)", border: `1px solid ${b.active ? "var(--success)" : "var(--danger)"}`, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }} onClick={() => onToggle(b.id)}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: b.active ? "var(--success)" : "var(--danger)", position: "absolute", top: 2, left: b.active ? 21 : 2, transition: "left 0.2s" }} />
                </div>
              </div>
              <div className="divider" style={{ margin: "0 0 16px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, textAlign: "center", marginBottom: 14 }}>
                {[["Hoy", stats.today], ["Total", stats.completed], ["Ingresos", formatCurrency(stats.revenue)]].map(([label, val]) => (
                  <div key={label} style={{ background: "var(--bg-elevated-2)", borderRadius: 8, padding: "12px 4px" }}>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{label}</p>
                    <p style={{ fontSize: 15, fontWeight: 800, color: "#36B1DF", fontFamily: "'Barlow Condensed', sans-serif" }}>{val}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setConfirmDelete({ id: b.id, name: b.name })} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "1px solid var(--border-strong)", color: "#f87171", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Eliminar</button>
            </div>
          );
        })}
      </div>
      <ConfirmModal
        open={!!confirmDelete}
        title="¿Eliminar barbero?"
        message={confirmDelete ? `Vas a eliminar a ${confirmDelete.name} del equipo. Esta acción no se puede deshacer.` : ''}
        confirmText="Sí, eliminar"
        onConfirm={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

// ==================== HISTORY VIEW ====================
function HistoryView({ appointments, barbers }) {
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
    const headers = ['Fecha', 'Hora', 'Cliente', 'Telefono', 'Servicio', 'Precio', 'Barbero', 'Estado'];

    const rows = filtered.map(a => {
      const barber = barbers.find(b => b.id === a.barberId);
      return [
        a.date,
        a.time,
        a.client || '',
        a.phone || '',
        a.service?.name || '',
        a.service?.price || 0,
        barber?.name || 'Sin asignar',
        a.status
      ];
    });

    // Resumen al final
    rows.push([]);
    rows.push(['RESUMEN']);
    rows.push(['Total citas', filtered.length]);
    rows.push(['Ingresos totales', totalRevenue]);
    rows.push(['Ticket promedio', filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0]);

    if (filterBarberId !== 'all') {
      const b = barbers.find(x => x.id === filterBarberId);
      rows.push(['Filtrado por barbero', b?.name || filterBarberId]);
    }
    if (filterDateFrom) rows.push(['Desde', filterDateFrom]);
    if (filterDateTo) rows.push(['Hasta', filterDateTo]);

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
          <h1 className="section-title" style={{ marginBottom: 4 }}><span className="gold">Historial</span> de citas</h1>
          <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>Citas completadas y reportes</p>
        </div>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          style={{
            background: filtered.length === 0 ? "var(--bg-track)" : "linear-gradient(135deg, #36B1DF, #5FC8EC)",
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
          📥 Exportar CSV
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
            Barbero
          </label>
          <select
            value={filterBarberId}
            onChange={e => setFilterBarberId(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="all">Todos los barberos</option>
            {barbers.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
            Desde
          </label>
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={{ width: "100%" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
            Hasta
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
            ✕ Limpiar filtros
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        {[
          ["Total completadas", filtered.length, "#4ade80"],
          ["Ingresos totales", formatCurrency(totalRevenue), "#36B1DF"],
          ["Ticket promedio", filtered.length > 0 ? formatCurrency(Math.round(totalRevenue / filtered.length)) : "$0", "#60a5fa"]
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{label}</p>
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
              {hasFilters ? "No hay citas que coincidan con los filtros" : "Aún no hay citas completadas"}
            </p>
          </div>
        ) : filtered.map(appt => {
          const barber = barbers.find(b => b.id === appt.barberId);
          return (
            <div key={appt.id} className="card" style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: barber?.bg || "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: barber?.color || "#fff" }}>{barber?.avatar || "?"}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{appt.client}</p>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    {appt.service?.name} · <strong style={{ color: "var(--text-secondary)" }}>{barber?.name || "Sin asignar"}</strong>
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{formatDate(appt.date)} · {appt.time}</p>
                </div>
                <span style={{ fontWeight: 700, color: "#36B1DF", fontSize: 15 }}>{formatCurrency(appt.service?.price || 0)}</span>
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
      alert('Error al guardar. Intenta de nuevo.');
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
          🕐 <span className="gold">Horarios</span> de atención
        </h1>
        <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>
          Configura cuándo y cómo puedes recibir citas
        </p>
      </div>

      <div style={{ display: "grid", gap: 20 }}>
        {/* Días activos */}
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
          <h3 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 18, fontWeight: 700, letterSpacing: 1,
            textTransform: "uppercase", marginBottom: 4, color: "var(--text-primary)"
          }}>📅 Días de atención</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18 }}>
            {diasActivosCount} día{diasActivosCount !== 1 ? 's' : ''} activo{diasActivosCount !== 1 ? 's' : ''}
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
                    boxShadow: active ? "0 4px 14px rgba(54,177,223,0.2)" : "none"
                  }}
                >
                  <p style={{
                    fontSize: 14, fontWeight: 700,
                    color: active ? "var(--accent)" : "var(--text-tertiary)"
                  }}>{d.label}</p>
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
          }}>⏰ Horario de apertura</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
                Primer turno
              </label>
              <select value={horaInicio} onChange={e => { setHoraInicio(e.target.value); setSaved(false); }}>
                {ALL_HOURS.filter(h => h < horaFin).map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>
                Último turno
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
          }}>⚡ Duración de cada cita</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18 }}>
            Cada cuántos minutos se puede agendar un turno
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
                  <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>min</p>
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
          }}>👁 Vista previa</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18 }}>
            Así verán los clientes los horarios disponibles · {previewSlots.length} turnos por día
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
              ⚠ Ajusta la hora de inicio, fin y duración para generar turnos
            </p>
          )}
        </div>

        {/* Bloqueos de horarios */}
        <BlockSchedule barbers={barbers} blocks={blocks} />

        {/* Guardar */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, alignItems: "center" }}>
          {saved && (
            <p style={{ color: "#4ade80", fontSize: 14, fontWeight: 600 }}>
              ✓ Horarios guardados
            </p>
          )}
          <button
            className="btn-gold"
            onClick={handleSave}
            disabled={saving}
            style={{ minWidth: 160 }}
          >
            {saving ? 'Guardando...' : '💾 Guardar horarios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== LOYALTY VIEW ====================
function LoyaltyView({ appointments }) {
  const [search, setSearch] = useState('');

  // Normalizar teléfono para comparar
  const normalizePhone = (p) => (p || '').replace(/[\s\-().]/g, '');

  // Agrupar SOLO citas completadas (estricto) por teléfono
  const clientStats = useMemo(() => {
    const map = new Map();
    appointments
      .filter(a => {
        // Filtro estricto: status debe ser EXACTAMENTE "completada"
        const status = (a.status || '').toString().trim().toLowerCase();
        return status === 'completada';
      })
      .forEach(a => {
        const phoneKey = normalizePhone(a.phone);
        if (!phoneKey) return;
        if (!map.has(phoneKey)) {
          map.set(phoneKey, {
            phone: a.phone,
            client: a.client,
            stamps: 0,
            totalSpent: 0,
            lastVisit: null,
            visits: []
          });
        }
        const c = map.get(phoneKey);
        c.stamps += 1;
        c.totalSpent += a.service?.price || 0;
        c.visits.push(a);
        // Tomar el nombre más reciente (el cliente puede haberlo escrito distinto)
        if (!c.lastVisit || (a.createdAt && a.createdAt > c.lastVisit)) {
          c.lastVisit = a.createdAt;
          c.client = a.client;
          c.phone = a.phone;
        }
      });
    return Array.from(map.values()).sort((a, b) => b.stamps - a.stamps);
  }, [appointments]);

  // Filtrar por búsqueda
  const filtered = useMemo(() => {
    if (!search.trim()) return clientStats;
    const q = search.toLowerCase().trim();
    return clientStats.filter(c =>
      c.client.toLowerCase().includes(q) ||
      normalizePhone(c.phone).includes(normalizePhone(q))
    );
  }, [clientStats, search]);

  // Top stats
  const totalClients = clientStats.length;
  const totalStamps = clientStats.reduce((s, c) => s + c.stamps, 0);
  const vipClients = clientStats.filter(c => c.stamps >= 10).length;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-title" style={{ marginBottom: 4 }}>
          🏆 <span className="gold">Lealtad</span> de clientes
        </h1>
        <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>
          Conteo de sellos por cliente · Cada cita completada = 1 sello
        </p>
      </div>

      {/* Stats top */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Clientes registrados</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: "#36B1DF", fontFamily: "'Barlow Condensed', sans-serif" }}>{totalClients}</p>
        </div>
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Sellos totales</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: "#4ade80", fontFamily: "'Barlow Condensed', sans-serif" }}>{totalStamps}</p>
        </div>
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Clientes VIP (10+)</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: "#f59e0b", fontFamily: "'Barlow Condensed', sans-serif" }}>{vipClients}</p>
        </div>
      </div>

      {/* Buscador */}
      <div style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20
      }}>
        <label style={{
          fontSize: 11, color: "var(--text-tertiary)",
          fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
          display: "block", marginBottom: 8
        }}>
          🔍 Buscar cliente
        </label>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Por nombre o teléfono..."
          style={{ width: "100%" }}
        />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60,
          color: "var(--text-dim)",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 12
        }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>🎫</p>
          <p style={{ fontSize: 14 }}>
            {search ? "Ningún cliente coincide con la búsqueda" : "Aún no hay clientes con citas completadas"}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((client, i) => (
            <ClientLoyaltyCard key={client.phone + i} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClientLoyaltyCard({ client }) {
  // Calcular cuántos sellos para próxima recompensa (cada 10)
  const nextReward = Math.ceil(client.stamps / 10) * 10;
  const stampsForNext = nextReward - client.stamps;
  const initials = (client.client || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Generar grid de sellos (mostrar 10, el siguiente bloque)
  const stampsInCurrentRow = client.stamps % 10 === 0 && client.stamps > 0 ? 10 : client.stamps % 10;
  const completedRows = Math.floor(client.stamps / 10);

  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: `1px solid ${client.stamps >= 10 ? "#f59e0b44" : "var(--border)"}`,
      borderRadius: 12,
      padding: 18
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: client.stamps >= 10
            ? "linear-gradient(135deg, #f59e0b, #fbbf24)"
            : "linear-gradient(135deg, #36B1DF, #5FC8EC)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 16, color: "#fff",
          flexShrink: 0
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{client.client}</p>
            {client.stamps >= 10 && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                color: "#fff", padding: "2px 8px",
                borderRadius: 10, letterSpacing: 0.5
              }}>⭐ VIP</span>
            )}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>📞 {client.phone}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{
            fontSize: 28, fontWeight: 800,
            color: "#36B1DF",
            fontFamily: "'Barlow Condensed', sans-serif",
            lineHeight: 1
          }}>{client.stamps}</p>
          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
            sello{client.stamps !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Tarjeta de sellos visual */}
      <div style={{
        background: "var(--bg-elevated-2)",
        border: "1px dashed var(--border-strong)",
        borderRadius: 10,
        padding: 12
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Tarjeta actual ({stampsInCurrentRow}/10)
          </p>
          {stampsForNext > 0 && stampsForNext < 10 && (
            <p style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>
              {stampsForNext} para premio 🎁
            </p>
          )}
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(10, 1fr)",
          gap: 6
        }}>
          {Array.from({ length: 10 }).map((_, idx) => {
            const filled = idx < stampsInCurrentRow;
            return (
              <div key={idx} style={{
                aspectRatio: "1",
                borderRadius: "50%",
                background: filled
                  ? "linear-gradient(135deg, #36B1DF, #5FC8EC)"
                  : "var(--bg-track)",
                border: `2px solid ${filled ? "#36B1DF" : "var(--border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: filled ? "#fff" : "transparent"
              }}>
                {filled ? "✂️" : "·"}
              </div>
            );
          })}
        </div>
        {completedRows > 0 && (
          <p style={{ fontSize: 11, color: "#f59e0b", marginTop: 10, fontWeight: 600, textAlign: "center" }}>
            🏆 {completedRows} tarjeta{completedRows > 1 ? 's' : ''} completa{completedRows > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Detalles */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 8, marginTop: 12,
        paddingTop: 12,
        borderTop: "1px solid var(--border)"
      }}>
        <div>
          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total gastado</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(client.totalSpent)}</p>
        </div>
        <div>
          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Ticket promedio</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            {formatCurrency(Math.round(client.totalSpent / client.stamps))}
          </p>
        </div>
      </div>
    </div>
  );
}
