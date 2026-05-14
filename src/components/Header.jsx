import { Link, useNavigate, useParams } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

export default function Header({ userType, navItems = [] }) {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { appointments } = useApp();
  const { theme, toggleTheme } = useTheme();
  const pendingCount = appointments.filter(a => a.status === "pendiente").length;
  const home = slug ? `/${slug}` : '/';

  return (
    <header style={{
      borderBottom: "1px solid var(--border)",
      background: "var(--bg-main)",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Fila principal */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 60,
        gap: 12,
      }}>
        {/* Logo */}
        <Link to={home} style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
          flexShrink: 0
        }}>
          <div style={{
            width: 32, height: 32,
            background: "linear-gradient(135deg, #36B1DF, #5FC8EC)",
            borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--bg-main)">
              <path d="M7 2h10l-2 4H9L7 2zm5 6a1 1 0 110 2 1 1 0 010-2zM4 18c0-4.4 3.6-8 8-8s8 3.6 8 8H4z"/>
            </svg>
          </div>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800, fontSize: 20,
            letterSpacing: 2, textTransform: "uppercase",
            color: "var(--text-primary)",
          }}>
            BarberOS
          </span>
        </Link>

        {/* Nav centrada (desktop) */}
        {navItems.length > 0 && (
          <nav style={{
            display: "flex", gap: 2, alignItems: "center",
            flex: 1, justifyContent: "center", overflowX: "auto",
          }}>
            {navItems.map(item => (
              <button
                key={item.key}
                className={`nav-btn ${item.active ? 'active' : ''}`}
                onClick={item.onClick}
              >
                {item.label}
                {item.key === 'dashboard' && pendingCount > 0 && (
                  <span style={{
                    background: "#36B1DF", color: "var(--bg-main)",
                    borderRadius: "50%", width: 18, height: 18,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, marginLeft: 6
                  }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        )}

        {/* Controles derecha */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          flexShrink: 0,
          marginLeft: navItems.length === 0 ? "auto" : 0,
        }}>
          {/* Toggle tema */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            aria-label="Cambiar tema"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Badge rol */}
          <span style={{
            fontSize: 11, color: "var(--text-tertiary)",
            fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
            background: userType === 'admin' ? "var(--accent-bg)" : "var(--bg-elevated)",
            padding: "4px 8px", borderRadius: 4,
            border: `1px solid ${userType === 'admin' ? "var(--accent-border)" : "var(--border)"}`,
            whiteSpace: "nowrap",
          }}>
            {userType === 'admin' ? '⚙️' : '👤'}
          </span>

          {/* Botón salir / inicio */}
          {userType === 'admin' ? (
            <button
              className="btn-ghost"
              onClick={async () => { await signOut(auth); navigate(home); }}
              style={{ padding: "6px 12px", fontSize: 12, color: "#f87171", borderColor: "#7f1d1d", minHeight: "auto" }}
            >
              Salir
            </button>
          ) : (
            <button
              className="btn-ghost"
              onClick={() => navigate(home)}
              style={{ padding: "6px 12px", fontSize: 12, minHeight: "auto" }}
            >
              Inicio
            </button>
          )}
        </div>
      </div>

      {/* Nav móvil */}
      {navItems.length > 0 && (
        <div className="mobile-nav">
          {navItems.map(item => (
            <button
              key={item.key}
              className={`nav-btn ${item.active ? 'active' : ''}`}
              onClick={item.onClick}
            >
              {item.label}
              {item.key === 'dashboard' && pendingCount > 0 && (
                <span style={{
                  background: "#36B1DF", color: "var(--bg-main)",
                  borderRadius: "50%", width: 16, height: 16,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, marginLeft: 4
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
