import { useApp } from '../context/AppContext';
import { useT } from '../utils/i18n';

export default function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmText, danger = true }) {
  const { barbershopConfig } = useApp();
  const t = useT(barbershopConfig?.idioma);
  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 2000
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="fade-in"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-strong)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 420,
          padding: 28,
          textAlign: "center"
        }}
      >
        <div style={{
          width: 64, height: 64,
          background: danger ? "#3f1111" : "var(--accent-bg)",
          border: `2px solid ${danger ? "#dc2626" : "var(--accent)"}`,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: 28
        }}>
          {danger ? "⚠️" : "❓"}
        </div>

        <h3 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: 10
        }}>{title}</h3>

        <p style={{
          color: "var(--text-secondary)",
          fontSize: 14,
          marginBottom: 24,
          lineHeight: 1.5
        }}>{message}</p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "12px 24px",
              background: "transparent",
              color: "var(--text-primary)",
              border: "1px solid var(--border-strong)",
              borderRadius: 8,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              cursor: "pointer",
              flex: 1
            }}
          >
            {t("Cancelar")}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "12px 24px",
              background: danger ? "#dc2626" : "linear-gradient(135deg, var(--accent), var(--accent-light))",
              color: danger ? "#fff" : "var(--bg-main)",
              border: "none",
              borderRadius: 8,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              cursor: "pointer",
              flex: 1
            }}
          >
            {confirmText || t("Eliminar")}
          </button>
        </div>
      </div>
    </div>
  );
}
