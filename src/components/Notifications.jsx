import { useApp } from '../context/AppContext';

export default function Notifications() {
  const { notifications, removeNotification } = useApp();

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      top: 80,
      right: 20,
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      maxWidth: 360
    }}>
      {notifications.map(n => {
        const colors = {
          success: { bg: "#14532d", border: "#16a34a", icon: "✓" },
          new: { bg: "#1e3a5f", border: "#3b82f6", icon: "🔔" },
          error: { bg: "#7f1d1d", border: "#dc2626", icon: "✕" },
          info: { bg: "#051520", border: "#36B1DF", icon: "ℹ" }
        };
        const c = colors[n.type] || colors.info;

        return (
          <div
            key={n.id}
            onClick={() => removeNotification(n.id)}
            className="slide-in"
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 10,
              padding: "12px 16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
            }}
          >
            <span style={{ fontSize: 18 }}>{c.icon}</span>
            <p style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{n.message}</p>
            <button style={{
              background: "transparent",
              border: "none",
              color: "#aaa",
              cursor: "pointer",
              fontSize: 16,
              padding: 0
            }}>×</button>
          </div>
        );
      })}
    </div>
  );
}
