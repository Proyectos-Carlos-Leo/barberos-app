import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
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
  const [view, setView] = useState("dashboard");
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const previousIdsRef = useRef(null);
  const { appointments, barbers, blocks, updateAppointmentStatus, deleteAppointment, toggleBarber, addBarber, deleteBarber, loading } = useApp();

  // Escuchar cambios de auth en Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsAuth(!!user);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

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

  // Mientras verifica auth
  if (authLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
      <div style={{ width: 56, height: 56, border: "3px solid #1e1e1e", borderTop: "3px solid #36B1DF", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // Si no está autenticado, mostrar login
  if (!isAuth) return <AdminLogin onLogin={() => setIsAuth(true)} />;

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 56, height: 56, border: "3px solid #1e1e1e", borderTop: "3px solid #36B1DF", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "#888", fontFamily: "'Barlow', sans-serif" }}>Cargando datos...</p>
      </div>
    </div>
  );

  const navItems = [
    { key: "dashboard", label: "Panel", active: view === "dashboard", onClick: () => setView("dashboard") },
    { key: "team", label: "Equipo", active: view === "team", onClick: () => setView("team") },
    { key: "reports", label: "Reportes", active: view === "reports", onClick: () => setView("reports") },
    { key: "history", label: "Historial", active: view === "history", onClick: () => setView("history") }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      <Header userType="admin" navItems={navItems} />
      <Notifications />
      {showNotifBanner && (
        <div style={{
          background: "linear-gradient(90deg, #051520, #051520)",
          borderBottom: "1px solid #0a3d56",
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
              color: "#0a0a0a",
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
              color: "#888",
              border: "1px solid #2e2e2e",
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
        <p style={{ color: "#888", fontSize: 14 }}>Administra todas las citas en tiempo real</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 28 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: "#141414", border: "1px solid #1e1e1e", borderRadius: 12, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
            <span style={{ position: "absolute", top: 12, right: 14, fontSize: 18, opacity: 0.4 }}>{s.icon}</span>
            <p style={{ fontSize: 11, color: "#666", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'Barlow Condensed', sans-serif" }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: "#141414", border: "1px solid #1e1e1e", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: "#666", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Filtros</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 5, fontWeight: 600 }}>Fecha</label>
            <input type="date" value={filterDate === "all" ? "" : filterDate} onChange={e => setFilterDate(e.target.value || "all")} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 5, fontWeight: 600 }}>Barbero</label>
            <select value={filterBarber} onChange={e => setFilterBarber(e.target.value)}>
              <option value="all">Todos</option>
              {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 5, fontWeight: 600 }}>Estado</label>
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

      <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>{filtered.length} cita{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}</p>

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#555", background: "#141414", border: "1px solid #1e1e1e", borderRadius: 12 }}>
            <p style={{ fontSize: 36, marginBottom: 8 }}>📭</p>
            <p style={{ fontSize: 14 }}>No hay citas con estos filtros</p>
          </div>
        )}
        {filtered.map(appt => {
          const barber = barbers.find(b => b.id === appt.barberId);
          const sc = STATUS_COLORS[appt.status] || STATUS_COLORS.pendiente;
          const isOpen = selected === appt.id;
          return (
            <div key={appt.id} className="card appt-card" style={{ cursor: "pointer", border: `1px solid ${isOpen ? "#36B1DF33" : "#1e1e1e"}`, transition: "all 0.2s" }} onClick={() => setSelected(isOpen ? null : appt.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: "#36B1DF", minWidth: 56 }}>{appt.time}</div>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: barber?.bg || "#333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: barber?.color || "#fff", flexShrink: 0 }}>{barber?.avatar || "?"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{appt.client}</p>
                  <p style={{ fontSize: 12, color: "#888" }}>{appt.service?.name} · {barber?.name || "Sin asignar"}</p>
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
                <div className="fade-in" style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #1e1e1e" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 16 }}>
                    <div>
                      <p style={{ fontSize: 11, color: "#666", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Fecha</p>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(appt.date)}</p>
                    </div>
                    {appt.phone && (
                      <div>
                        <p style={{ fontSize: 11, color: "#666", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Teléfono</p>
                        <a href={`tel:${appt.phone}`} onClick={e => e.stopPropagation()} style={{ fontSize: 13, fontWeight: 600 }}>📞 {appt.phone}</a>
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: 11, color: "#666", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Duración</p>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{appt.service?.duration} min</p>
                    </div>
                  </div>
                  {appt.notes && (
                    <div style={{ background: "#0f0f0f", borderRadius: 8, padding: 12, marginBottom: 16, borderLeft: "3px solid #36B1DF" }}>
                      <p style={{ fontSize: 11, color: "#666", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Notas</p>
                      <p style={{ fontSize: 13, fontStyle: "italic", color: "#aaa" }}>"{appt.notes}"</p>
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: 11, color: "#666", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Cambiar estado</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {Object.entries(STATUS_COLORS).map(([key, s]) => (
                        <button key={key} onClick={e => { e.stopPropagation(); onStatusChange(appt.id, key); }} style={{ padding: "6px 14px", borderRadius: 6, border: `1.5px solid ${appt.status === key ? s.dot : "#2e2e2e"}`, background: appt.status === key ? s.bg : "transparent", color: appt.status === key ? s.text : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>{s.label}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete({ id: appt.id, name: appt.client }); }} style={{ padding: "6px 14px", background: "transparent", border: "1px solid #2e2e2e", color: "#f87171", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🗑 Eliminar</button>
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
  const [showBlocks, setShowBlocks] = useState(false);
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
          <p style={{ color: "#888", fontSize: 14 }}>Gestiona barberos y horarios</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => setShowBlocks(true)}
            style={{
              padding: "10px 18px",
              background: "transparent",
              border: "1px solid #3f1111",
              color: "#f87171",
              borderRadius: 8,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              cursor: "pointer"
            }}
          >
            🚫 Bloqueos {blocks?.length > 0 && `(${blocks.length})`}
          </button>
          <button className="btn-gold" onClick={() => setShowForm(!showForm)}>{showForm ? "Cancelar" : "+ Agregar barbero"}</button>
        </div>
      </div>

      {showBlocks && <BlockSchedule barbers={barbers} blocks={blocks} onClose={() => setShowBlocks(false)} />}

      {showForm && (
        <div className="fade-in card" style={{ padding: 24, marginBottom: 20, border: "1px solid #0a3d56" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18, color: "#36B1DF" }}>Nuevo barbero</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 5, fontWeight: 600, textTransform: "uppercase" }}>Nombre *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej. Juan Pérez" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 5, fontWeight: 600, textTransform: "uppercase" }}>Especialidad *</label>
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
                  <p style={{ fontSize: 12, color: "#888" }}>{b.specialty}</p>
                </div>
                <div style={{ width: 40, height: 22, borderRadius: 11, background: b.active ? "#14532d" : "#3f1111", border: `1px solid ${b.active ? "#16a34a" : "#dc2626"}`, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }} onClick={() => onToggle(b.id)}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: b.active ? "#4ade80" : "#f87171", position: "absolute", top: 2, left: b.active ? 21 : 2, transition: "left 0.2s" }} />
                </div>
              </div>
              <div className="divider" style={{ margin: "0 0 16px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, textAlign: "center", marginBottom: 14 }}>
                {[["Hoy", stats.today], ["Total", stats.completed], ["Ingresos", formatCurrency(stats.revenue)]].map(([label, val]) => (
                  <div key={label} style={{ background: "#0f0f0f", borderRadius: 8, padding: "12px 4px" }}>
                    <p style={{ fontSize: 10, color: "#666", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{label}</p>
                    <p style={{ fontSize: 15, fontWeight: 800, color: "#36B1DF", fontFamily: "'Barlow Condensed', sans-serif" }}>{val}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setConfirmDelete({ id: b.id, name: b.name })} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "1px solid #2e2e2e", color: "#f87171", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Eliminar</button>
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
  const completed = appointments.filter(a => a.status === "completada").sort((a, b) => new Date(b.date + "T" + b.time) - new Date(a.date + "T" + a.time));
  const totalRevenue = completed.reduce((sum, a) => sum + (a.service?.price || 0), 0);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-title" style={{ marginBottom: 4 }}><span className="gold">Historial</span> de citas</h1>
        <p style={{ color: "#888", fontSize: 14 }}>Citas completadas y reportes</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        {[["Total completadas", completed.length, "#4ade80"], ["Ingresos totales", formatCurrency(totalRevenue), "#36B1DF"], ["Ticket promedio", completed.length > 0 ? formatCurrency(Math.round(totalRevenue / completed.length)) : "$0", "#60a5fa"]].map(([label, value, color]) => (
          <div key={label} style={{ background: "#141414", border: "1px solid #1e1e1e", borderRadius: 12, padding: "18px 20px" }}>
            <p style={{ fontSize: 11, color: "#666", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</p>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {completed.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#555", background: "#141414", border: "1px solid #1e1e1e", borderRadius: 12 }}>
            <p style={{ fontSize: 36, marginBottom: 8 }}>📋</p>
            <p style={{ fontSize: 14 }}>Aún no hay citas completadas</p>
          </div>
        ) : completed.map(appt => {
          const barber = barbers.find(b => b.id === appt.barberId);
          return (
            <div key={appt.id} className="card" style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: barber?.bg || "#333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: barber?.color || "#fff" }}>{barber?.avatar || "?"}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{appt.client}</p>
                  <p style={{ fontSize: 12, color: "#888" }}>{appt.service?.name} · {formatDate(appt.date)} {appt.time}</p>
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
