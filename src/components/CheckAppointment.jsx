import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { formatDate, formatCurrency } from '../utils/helpers';

export default function CheckAppointment() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { appointments, barbers, barbershopConfig, loading } = useApp();
  const { theme, toggleTheme } = useTheme();

  const [folio, setFolio] = useState('');
  const [phone, setPhone] = useState('');
  const [searched, setSearched] = useState(false);
  const [foundAppt, setFoundAppt] = useState(null);

  const handleSearch = () => {
    const cleanFolio = folio.trim().toUpperCase();
    const cleanPhone = phone.trim();

    if (cleanFolio.length !== 6) {
      alert('⚠ El folio debe tener 6 caracteres');
      return;
    }

    // Buscar cita por folio + teléfono (doble verificación de seguridad)
    const match = appointments.find(a =>
      a.folio === cleanFolio &&
      a.phone === cleanPhone
    );

    setSearched(true);
    setFoundAppt(match || null);
  };

  const handleNewSearch = () => {
    setFolio('');
    setPhone('');
    setSearched(false);
    setFoundAppt(null);
  };

  const STATUS_LABELS = {
    pendiente: { label: 'Pendiente de confirmación', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    confirmada: { label: 'Confirmada ✓', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    completada: { label: 'Completada', color: '#36B1DF', bg: 'rgba(54,177,223,0.1)' },
    cancelada: { label: 'Cancelada', color: '#f87171', bg: 'rgba(248,113,113,0.1)' }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)" }}>
        <div style={{ width: 56, height: 56, border: "3px solid var(--border)", borderTop: "3px solid var(--accent)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      position: "relative",
      background: theme === 'dark'
        ? "radial-gradient(ellipse at center, var(--accent-bg) 0%, var(--bg-main) 70%)"
        : "radial-gradient(ellipse at center, #e0f4fc 0%, #f4f6f8 70%)"
    }}>
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        style={{ position: "absolute", top: 20, right: 20 }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <button
        onClick={() => navigate(`/${slug}`)}
        style={{
          position: "absolute",
          top: 20, left: 20,
          background: "transparent",
          border: "1px solid var(--border-strong)",
          color: "var(--text-tertiary)",
          borderRadius: 8,
          padding: "8px 14px",
          fontSize: 13,
          cursor: "pointer"
        }}
      >
        ← Volver
      </button>

      <div className="fade-in-up" style={{ width: "100%", maxWidth: 460 }}>
        {/* Vista del comprobante */}
        {searched && foundAppt ? (
          <div className="card" style={{ padding: 28 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                width: 64, height: 64,
                background: "var(--success-bg)",
                border: "2px solid var(--success)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px"
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 26, fontWeight: 800,
                letterSpacing: 1, textTransform: "uppercase",
                color: "var(--text-primary)"
              }}>
                ¡Cita <span className="gold">encontrada</span>!
              </h2>
            </div>

            {/* Estado */}
            <div style={{
              background: STATUS_LABELS[foundAppt.status]?.bg || "var(--bg-elevated-2)",
              border: `1px solid ${STATUS_LABELS[foundAppt.status]?.color || "var(--border)"}`,
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 20,
              textAlign: "center"
            }}>
              <p style={{
                fontSize: 13,
                fontWeight: 700,
                color: STATUS_LABELS[foundAppt.status]?.color || "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: 0.5
              }}>
                {STATUS_LABELS[foundAppt.status]?.label || foundAppt.status}
              </p>
            </div>

            {/* Folio */}
            <div style={{
              textAlign: "center",
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: "1px dashed var(--border-strong)"
            }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Folio</p>
              <p style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 28, fontWeight: 800,
                color: "var(--accent)", letterSpacing: 2
              }}>#{foundAppt.folio}</p>
            </div>

            {/* Detalles */}
            <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
              <Row label="Cliente" value={foundAppt.client} />
              <Row label="Barbero" value={barbers.find(b => b.id === foundAppt.barberId)?.name || "Sin asignar"} />
              <Row label="Servicio" value={foundAppt.service?.name || "—"} />
              <Row label="Fecha" value={formatDate(foundAppt.date)} />
              <Row label="Hora" value={foundAppt.time} />
              <Row label="Total" value={formatCurrency(foundAppt.service?.price || 0)} highlight />
            </div>

            {/* Ubicación */}
            {(barbershopConfig?.direccion || barbershopConfig?.telefono) && (
              <div style={{
                background: "var(--accent-bg)",
                border: "1px solid var(--accent-border)",
                borderRadius: 10, padding: 14,
                marginBottom: 20, textAlign: "left"
              }}>
                <p style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, marginBottom: 6 }}>📍 Ubicación</p>
                {barbershopConfig.direccion && (
                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{barbershopConfig.direccion}</p>
                )}
                {barbershopConfig.telefono && (
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>📞 {barbershopConfig.telefono}</p>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn-ghost" onClick={handleNewSearch} style={{ flex: 1, minWidth: 120 }}>
                Buscar otra
              </button>
              <button className="btn-gold" onClick={() => navigate(`/${slug}`)} style={{ flex: 1, minWidth: 120 }}>
                Volver al inicio
              </button>
            </div>
          </div>
        ) : searched && !foundAppt ? (
          /* No encontrada */
          <div className="card" style={{ padding: 28, textAlign: "center" }}>
            <div style={{
              width: 64, height: 64,
              background: "var(--danger-bg)",
              border: "2px solid var(--danger)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 32
            }}>
              ❌
            </div>
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 24, fontWeight: 800,
              letterSpacing: 1, textTransform: "uppercase",
              color: "var(--text-primary)", marginBottom: 8
            }}>
              No encontramos tu cita
            </h2>
            <p style={{ color: "var(--text-tertiary)", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              El folio y/o teléfono no coinciden con ninguna cita registrada. Verifica los datos e intenta de nuevo.
            </p>
            <button className="btn-gold" onClick={handleNewSearch} style={{ width: "100%" }}>
              Intentar de nuevo
            </button>
          </div>
        ) : (
          /* Form de búsqueda */
          <div className="card" style={{ padding: 28 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                width: 64, height: 64,
                background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
                borderRadius: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px"
              }}>
                🎫
              </div>
              <h2 style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 26, fontWeight: 800,
                letterSpacing: 1, textTransform: "uppercase",
                color: "var(--text-primary)", marginBottom: 6
              }}>
                Buscar mi <span className="gold">cita</span>
              </h2>
              <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
                Ingresa tu folio y teléfono para ver tu cita
              </p>
            </div>

            <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{
                  fontSize: 11, color: "var(--text-tertiary)",
                  display: "block", marginBottom: 8,
                  fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5
                }}>
                  Folio de tu cita *
                </label>
                <input
                  value={folio}
                  onChange={e => setFolio(e.target.value.toUpperCase())}
                  placeholder="Ej. ABC123"
                  maxLength={6}
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 24,
                    fontWeight: 800,
                    letterSpacing: 4,
                    textAlign: "center",
                    textTransform: "uppercase"
                  }}
                />
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  6 caracteres que recibiste al agendar
                </p>
              </div>

              <div>
                <label style={{
                  fontSize: 11, color: "var(--text-tertiary)",
                  display: "block", marginBottom: 8,
                  fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5
                }}>
                  Tu teléfono *
                </label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="81 1234 5678"
                  type="tel"
                />
              </div>
            </div>

            <button
              className="btn-gold"
              onClick={handleSearch}
              disabled={!folio || !phone}
              style={{ width: "100%" }}
            >
              🔍 Buscar mi cita
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
      <span style={{
        fontSize: highlight ? 18 : 14,
        fontWeight: highlight ? 800 : 600,
        color: highlight ? "var(--accent)" : "var(--text-primary)",
        fontFamily: highlight ? "'Barlow Condensed', sans-serif" : "inherit"
      }}>{value}</span>
    </div>
  );
}
