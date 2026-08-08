import { useState, useEffect } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import { useT } from '../utils/i18n';
import { getPlan, upgradeWhatsAppUrl } from '../utils/plans';
import { IconConfiguracion, IconApariencia, IconCompletado } from './icons/BrandIcons';

const stripEmoji = (str) =>
  String(str || '').replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F]+\s*/u, '');

const PRESET_COLORS = [
  { name: 'Azul (default)', primary: '#36B1DF', light: '#5FC8EC', dark: '#1A7FAB', bg: '#051520', border: '#0a3d56' },
  { name: 'Dorado', primary: '#f59e0b', light: '#fbbf24', dark: '#b45309', bg: '#1a1306', border: '#451a03' },
  { name: 'Verde', primary: '#10b981', light: '#34d399', dark: '#047857', bg: '#031912', border: '#064e3b' },
  { name: 'Rojo', primary: '#ef4444', light: '#f87171', dark: '#b91c1c', bg: '#1a0606', border: '#7f1d1d' },
  { name: 'Morado', primary: '#a855f7', light: '#c084fc', dark: '#7e22ce', bg: '#1a0a26', border: '#581c87' },
  { name: 'Rosa', primary: '#ec4899', light: '#f472b6', dark: '#be185d', bg: '#1f0613', border: '#831843' },
  { name: 'Cyan', primary: '#06b6d4', light: '#22d3ee', dark: '#0e7490', bg: '#031416', border: '#155e75' },
  { name: 'Naranja', primary: '#f97316', light: '#fb923c', dark: '#c2410c', bg: '#1a0d04', border: '#7c2d12' },
];

export default function AdminSettings({ open, onClose }) {
  const { barbershopConfig, slug } = useApp();
  const t = useT(barbershopConfig?.idioma);
  const [selectedColor, setSelectedColor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const isCalConnected = !!(barbershopConfig?.google_calendar_connected);

  useEffect(() => {
    if (barbershopConfig?.theme_color) {
      const match = PRESET_COLORS.find(c => c.primary === barbershopConfig.theme_color.primary);
      setSelectedColor(match || PRESET_COLORS[0]);
    } else {
      setSelectedColor(PRESET_COLORS[0]);
    }
  }, [barbershopConfig]);

  const CLIENT_ID = '258434171702-mi7qcvggike2c9bqi7mj4bev19m209f5.apps.googleusercontent.com';
  const REDIRECT_URI = `${window.location.origin}/oauth/callback`;
  const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

  const handleConnectGoogle = () => {
    const params = new URLSearchParams({
      client_id:     CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      response_type: 'code',
      scope:         SCOPES,
      access_type:   'offline',
      prompt:        'consent',
      state:         slug,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm(t('¿Desconectar Google Calendar? Las citas nuevas ya no se sincronizarán automáticamente.'))) return;
    setDisconnecting(true);
    try {
      await update(ref(db, `barberias/${slug}/config`), { google_calendar_connected: false });
    } catch (err) {
      console.error(err);
      alert(t('Error al desconectar'));
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSave = async () => {
    if (!selectedColor || !slug) return;
    setSaving(true);
    try {
      await update(ref(db, `barberias/${slug}/config/theme_color`), selectedColor);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
      alert(t('Error al guardar el color'));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, zIndex: 3000
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="fade-in"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-strong)",
          borderRadius: 16,
          width: "100%", maxWidth: 520,
          maxHeight: "85vh",
          overflowY: "auto",
          padding: 24
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 22, fontWeight: 800, letterSpacing: 1,
            textTransform: "uppercase", color: "var(--text-primary)"
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><IconConfiguracion size={18} glow={false} />{stripEmoji(t("⚙️ Configuración"))}</span>
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none",
              fontSize: 26, cursor: "pointer", color: "var(--text-tertiary)",
              padding: 0, lineHeight: 1
            }}
          >×</button>
        </div>
        <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginBottom: 22 }}>
          {t("Personaliza la apariencia de tu barbería")}
        </p>

        {/* Selector de color */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            fontSize: 11, color: "var(--text-tertiary)",
            fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
            display: "block", marginBottom: 12
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><IconApariencia size={14} glow={false} />{stripEmoji(t("🎨 Color secundario"))}</span>
          </label>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 130px), 1fr))",
            gap: 10
          }}>
            {PRESET_COLORS.map(c => {
              const isSelected = selectedColor?.primary === c.primary;
              return (
                <div
                  key={c.primary}
                  onClick={() => setSelectedColor(c)}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: `2px solid ${isSelected ? c.primary : "var(--border)"}`,
                    background: isSelected ? c.bg : "var(--bg-elevated-2)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    transform: isSelected ? "translateY(-2px)" : "none",
                    boxShadow: isSelected ? `0 6px 20px ${c.primary}44` : "none"
                  }}
                >
                  <div style={{
                    width: "100%", aspectRatio: "2/1",
                    background: `linear-gradient(135deg, ${c.primary}, ${c.light})`,
                    borderRadius: 6,
                    marginBottom: 8,
                    boxShadow: `0 2px 8px ${c.primary}44`
                  }} />
                  <p style={{
                    fontSize: 12, fontWeight: 700,
                    color: isSelected ? c.primary : "var(--text-secondary)",
                    textAlign: "center",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    textTransform: "uppercase",
                    letterSpacing: 0.5
                  }}>{t(c.name)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vista previa */}
        {selectedColor && (
          <div style={{
            background: selectedColor.bg,
            border: `1px solid ${selectedColor.border}`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 20
          }}>
            <p style={{
              fontSize: 11, color: selectedColor.primary,
              fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
              marginBottom: 8
            }}>
              {t("Vista previa")}
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button style={{
                background: `linear-gradient(135deg, ${selectedColor.primary}, ${selectedColor.light})`,
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13, fontWeight: 700,
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: 0.5,
                textTransform: "uppercase",
                cursor: "default"
              }}>{t("Botón principal")}</button>
              <span style={{
                background: selectedColor.bg,
                border: `1px solid ${selectedColor.border}`,
                color: selectedColor.primary,
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 11, fontWeight: 700
              }}>{t("Badge")}</span>
              <span style={{
                color: selectedColor.primary,
                fontWeight: 700,
                fontSize: 14
              }}>{t("Texto destacado")}</span>
            </div>
          </div>
        )}

        {/* Plan actual */}
        {(() => {
          const plan = getPlan(barbershopConfig);
          const isTopPlan = plan.id === 'premium' || plan.id === 'multisucursal';
          return (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 22, marginBottom: 22 }}>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 10 }}>
                {t("Tu plan")}
              </label>
              <div style={{
                background: `${plan.color}10`,
                border: `1px solid ${plan.color}44`,
                borderRadius: 12, padding: "16px 18px",
                display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap"
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                  background: `${plan.color}22`, border: `1px solid ${plan.color}55`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22
                }}>
                  {plan.icon}
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 800, color: plan.color, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {t("Plan")} {plan.nombre}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                    {plan.maxBarberos === null ? t("Barberos ilimitados") : `${plan.maxBarberos} ${t("barbero(s)")}`}
                    {" · "}
                    {plan.maxCitasMes === null ? t("Citas ilimitadas") : `${plan.maxCitasMes} ${t("citas/mes")}`}
                    {plan.reportes ? ` · ${t("Reportes")}` : ""}
                    {plan.inventario ? ` · ${t("Inventario")}` : ""}
                    {plan.lealtad ? ` · ${t("Lealtad")}` : ""}
                  </p>
                </div>
                {!isTopPlan && (
                  <a
                    href={upgradeWhatsAppUrl(slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 7,
                      background: "linear-gradient(135deg, #25D366, #1ebe5b)",
                      color: "#fff", borderRadius: 9, padding: "10px 18px",
                      fontSize: 13, fontWeight: 800, textDecoration: "none",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      textTransform: "uppercase", letterSpacing: 0.5,
                      boxShadow: "0 2px 10px rgba(37,211,102,0.3)"
                    }}
                  >
                    🚀 {t("Mejorar plan")}
                  </a>
                )}
              </div>
            </div>
          );
        })()}

        {/* Google Calendar OAuth */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 22, marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            {/* Google icon */}
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <label style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Google Calendar
            </label>
            {isCalConnected && (
              <span style={{ background: "rgba(74,222,128,0.15)", border: "1px solid #4ade80", color: "#4ade80", padding: "2px 10px", borderRadius: 10, fontSize: 10, fontWeight: 800 }}>
                ✓ {t("Conectado")}
              </span>
            )}
          </div>

          {isCalConnected ? (
            <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconCompletado size={13} glow={false} />{t("Las nuevas citas se agregan automáticamente a tu Google Calendar.")}</span>
              </p>
              <button
                onClick={handleDisconnectGoogle}
                disabled={disconnecting}
                style={{ background: "transparent", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Barlow', sans-serif" }}
              >
                {disconnecting ? t("Desconectando...") : "🔌 " + t("Desconectar")}
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.6 }}>
                {t("Conecta tu cuenta de Google para que cada cita nueva aparezca automáticamente en tu calendario.")}
              </p>
              <button
                onClick={handleConnectGoogle}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "#fff", border: "1px solid #ddd",
                  color: "#333", borderRadius: 8, padding: "10px 18px",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'Barlow', sans-serif", boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                  transition: "box-shadow 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.15)"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t("Conectar con Google Calendar")}
              </button>
            </div>
          )}
        </div>

        {/* Botones */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
          {saved && (
            <p style={{ color: "#4ade80", fontSize: 13, fontWeight: 600, marginRight: "auto" }}>
              {t("✓ Color aplicado. Recarga si no ves cambios.")}
            </p>
          )}
          <button className="btn-ghost" onClick={onClose} disabled={saving}>
            {t("Cerrar")}
          </button>
          <button className="btn-gold" onClick={handleSave} disabled={saving || !selectedColor}>
            {saving ? t('Guardando...') : t('💾 Aplicar color')}
          </button>
        </div>
      </div>
    </div>
  );
}
