export default function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmText = "Eliminar", danger = true }) {
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
          background: "#141414",
          border: "1px solid #2e2e2e",
          borderRadius: 16,
          width: "100%",
          maxWidth: 420,
          padding: 28,
          textAlign: "center"
        }}
      >
        <div style={{
          width: 64, height: 64,
          background: danger ? "#3f1111" : "#051520",
          border: `2px solid ${danger ? "#dc2626" : "#36B1DF"}`,
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
          color: "#aaa",
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
              color: "#f5f0eb",
              border: "1px solid #2e2e2e",
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
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "12px 24px",
              background: danger ? "#dc2626" : "linear-gradient(135deg, #36B1DF, #5FC8EC)",
              color: danger ? "#fff" : "#0a0a0a",
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
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
