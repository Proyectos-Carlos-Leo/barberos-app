import { useApp } from '../context/AppContext';
import { IconNotificaciones } from './icons/BrandIcons';

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
          success: { bg: "var(--success-bg)", border: "var(--success)", icon: "✓" },
          new: { bg: "var(--accent-bg)", border: "var(--accent)", icon: <IconNotificaciones size={16} glow={false} /> },
          error: { bg: "var(--danger-bg)", border: "var(--danger)", icon: "✕" },
          info: { bg: "var(--accent-bg)", border: "var(--accent)", icon: "ℹ" }
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
              color: "var(--text-secondary)",
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
