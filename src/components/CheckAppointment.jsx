import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, update } from 'firebase/database';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import { useT } from '../utils/i18n';
import { IconBuscar } from './icons/BrandIcons';

const stripEmoji = (str) =>
  String(str || '').replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F]+\s*/u, '');
import { useTheme } from '../context/ThemeContext';
import { formatDate, formatCurrency } from '../utils/helpers';

export default function CheckAppointment() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { appointments, barbers, barbershopConfig, loading } = useApp();
  const { theme, toggleTheme } = useTheme();
  const t = useT(barbershopConfig?.idioma);
  const idioma = barbershopConfig?.idioma;

  const [folio, setFolio] = useState('');
  const [phone, setPhone] = useState('');
  const [searched, setSearched] = useState(false);
  const [foundAppt, setFoundAppt] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const normalizePhone = (p) => (p || '').replace(/[\s\-().]/g, '');

  const handleSearch = () => {
    const cleanFolio = folio.trim().toUpperCase();
    const cleanPhone = phone.trim();

    if (cleanFolio.length !== 6) {
      alert(t('⚠ El folio debe tener 6 caracteres'));
      return;
    }

    const inputPhone = normalizePhone(cleanPhone);
    const match = appointments.find(a =>
      a.folio === cleanFolio &&
      normalizePhone(a.phone) === inputPhone
    );

    setSearched(true);
    setFoundAppt(match || null);
  };

  const handleNewSearch = () => {
    setFolio('');
    setPhone('');
    setSearched(false);
    setFoundAppt(null);
    setShowCancelConfirm(false);
  };

  const handleCancel = async () => {
    if (!foundAppt) return;
    setCancelling(true);
    try {
      // Solo actualizar el status (las reglas validan que folio/teléfono/cliente coincidan)
      await update(ref(db, `barberias/${slug}/citas/${foundAppt.id}`), {
        ...foundAppt,
        status: 'cancelada',
        cancelledAt: new Date().toISOString()
      });
      setFoundAppt({ ...foundAppt, status: 'cancelada' });
      setShowCancelConfirm(false);
    } catch (error) {
      console.error('Error al cancelar:', error);
      alert(t('Error al cancelar la cita. Intenta de nuevo.'));
    } finally {
      setCancelling(false);
    }
  };

  const handleReschedule = () => {
    // Llevar al cliente al flujo de agendar nueva cita
    // (sin cancelar la actual — el admin lo verá)
    if (confirm(t('Para reagendar te llevamos a crear una nueva cita. ¿Deseas también cancelar la cita actual?'))) {
      handleCancel().then(() => {
        navigate(`/${slug}/cliente`);
      });
    } else {
      navigate(`/${slug}/cliente`);
    }
  };

  const STATUS_LABELS = {
    pendiente: { label: t('Pendiente de confirmación'), color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    confirmada: { label: t('Confirmada ✓'), color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    completada: { label: t('Completada'), color: 'var(--accent)', bg: 'rgba(var(--accent-rgb),0.1)' },
    cancelada: { label: t('Cancelada'), color: '#f87171', bg: 'rgba(248,113,113,0.1)' }
  };

  // Solo permitir cancelar/reagendar si la cita no está completada/cancelada
  const canModify = foundAppt && (foundAppt.status === 'pendiente' || foundAppt.status === 'confirmada');

  // Verificar si la cita ya pasó
  const apptDateTime = foundAppt ? new Date(`${foundAppt.date}T${foundAppt.time}`) : null;
  const apptPassed = apptDateTime && apptDateTime < new Date();

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
        {t("← Volver")}
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
                {idioma === 'en' ? '' : '¡'}<span className="gold">{idioma === 'en' ? 'Appointment' : 'Cita'}</span> {t("encontrada!")}
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
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{t("Folio")}</p>
              <p style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 28, fontWeight: 800,
                color: "var(--accent)", letterSpacing: 2
              }}>#{foundAppt.folio}</p>
            </div>

            {/* Detalles */}
            <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
              <Row label={t("Cliente")} value={foundAppt.client} />
              <Row label={t("Barbero")} value={barbers.find(b => b.id === foundAppt.barberId)?.name || t("Sin asignar")} />
              <Row label={t("Servicio")} value={foundAppt.service?.name || "—"} />
              <Row label={t("Fecha")} value={formatDate(foundAppt.date, idioma)} />
              <Row label={t("Hora")} value={foundAppt.time} />
              <Row label={t("Total")} value={formatCurrency(foundAppt.service?.price || 0)} highlight />
            </div>

            {/* Ubicación */}
            {(barbershopConfig?.direccion || barbershopConfig?.telefono) && (
              <div style={{
                background: "var(--accent-bg)",
                border: "1px solid var(--accent-border)",
                borderRadius: 10, padding: 14,
                marginBottom: 20, textAlign: "left"
              }}>
                <p style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, marginBottom: 6 }}>{t("📍 Ubicación")}</p>
                {barbershopConfig.direccion && (
                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{barbershopConfig.direccion}</p>
                )}
                {barbershopConfig.telefono && (
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>📞 {barbershopConfig.telefono}</p>
                )}
              </div>
            )}

            {/* Acciones según el estado */}
            {canModify && !apptPassed && (
              <div style={{
                background: "var(--bg-elevated-2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 14,
                marginBottom: 16
              }}>
                <p style={{
                  fontSize: 11, color: "var(--text-tertiary)",
                  fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
                  marginBottom: 10, textAlign: "center"
                }}>
                  {t("¿Necesitas cambios?")}
                </p>
                <div style={{ display: "grid", gap: 8 }}>
                  <button
                    onClick={handleReschedule}
                    style={{
                      background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      padding: "12px 16px",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      transition: "all 0.2s"
                    }}
                  >
                    {t("🔄 Reagendar mi cita")}
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={cancelling}
                    style={{
                      background: "transparent",
                      color: "#f87171",
                      border: "1px solid #7f1d1d",
                      borderRadius: 8,
                      padding: "10px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: cancelling ? "not-allowed" : "pointer",
                      fontFamily: "'Barlow', sans-serif",
                      transition: "all 0.2s"
                    }}
                  >
                    {t("❌ Cancelar mi cita")}
                  </button>
                </div>
              </div>
            )}

            {apptPassed && foundAppt.status !== 'cancelada' && (
              <div style={{
                background: "var(--bg-elevated-2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 12,
                marginBottom: 16,
                textAlign: "center"
              }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {t("Esta cita ya pasó. Para cambios contacta a la barbería.")}
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn-ghost" onClick={handleNewSearch} style={{ flex: 1, minWidth: 120 }}>
                {t("Buscar otra")}
              </button>
              <button className="btn-gold" onClick={() => navigate(`/${slug}`)} style={{ flex: 1, minWidth: 120 }}>
                {t("Volver al inicio")}
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
              {t("No encontramos tu cita")}
            </h2>
            <p style={{ color: "var(--text-tertiary)", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              {t("El folio y/o teléfono no coinciden con ninguna cita registrada. Verifica los datos e intenta de nuevo.")}
            </p>
            <button className="btn-gold" onClick={handleNewSearch} style={{ width: "100%" }}>
              {t("Intentar de nuevo")}
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
                {t("Buscar mi")} <span className="gold">{t("cita")}</span>
              </h2>
              <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
                {t("Ingresa tu folio y teléfono para ver tu cita")}
              </p>
            </div>

            <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{
                  fontSize: 11, color: "var(--text-tertiary)",
                  display: "block", marginBottom: 8,
                  fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5
                }}>
                  {t("Folio de tu cita *")}
                </label>
                <input
                  value={folio}
                  onChange={e => setFolio(e.target.value.toUpperCase())}
                  placeholder={t("Ej. ABC123")}
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
                  {t("6 caracteres que recibiste al agendar")}
                </p>
              </div>

              <div>
                <label style={{
                  fontSize: 11, color: "var(--text-tertiary)",
                  display: "block", marginBottom: 8,
                  fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5
                }}>
                  {t("Tu teléfono *")}
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
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}><IconBuscar size={14} glow={false} color="#0a0a0a" />{stripEmoji(t("🔍 Buscar mi cita"))}</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal de confirmación de cancelación */}
      {showCancelConfirm && (
        <div
          onClick={() => !cancelling && setShowCancelConfirm(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, zIndex: 2000
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="fade-in"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-strong)",
              borderRadius: 16,
              width: "100%", maxWidth: 420,
              padding: 28, textAlign: "center"
            }}
          >
            <div style={{
              width: 64, height: 64,
              background: "var(--danger-bg)",
              border: "2px solid var(--danger)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: 28
            }}>⚠️</div>

            <h3 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 22, fontWeight: 800,
              letterSpacing: 1, textTransform: "uppercase",
              marginBottom: 10, color: "var(--text-primary)"
            }}>{t("¿Cancelar cita?")}</h3>

            <p style={{
              color: "var(--text-secondary)",
              fontSize: 14, marginBottom: 24, lineHeight: 1.5
            }}>
              {t("Tu cita del")} <strong>{formatDate(foundAppt.date, idioma)}</strong> {t("a las")} <strong>{foundAppt.time}</strong> {t("será cancelada. Esta acción no se puede deshacer.")}
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelling}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  background: "transparent",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 8,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 14, fontWeight: 700,
                  letterSpacing: 0.5, textTransform: "uppercase",
                  cursor: cancelling ? "not-allowed" : "pointer"
                }}
              >
                {t("No, regresar")}
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 14, fontWeight: 700,
                  letterSpacing: 0.5, textTransform: "uppercase",
                  cursor: cancelling ? "not-allowed" : "pointer"
                }}
              >
                {cancelling ? t("Cancelando...") : t("Sí, cancelar")}
              </button>
            </div>
          </div>
        </div>
      )}
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
