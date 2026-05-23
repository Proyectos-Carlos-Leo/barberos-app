import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import AdminSettings from './AdminSettings';

export default function Header({ userType, navItems = [] }) {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { appointments } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const pendingCount = appointments.filter(a => a.status === "pendiente").length;
  const home = slug
    ? (userType === 'admin' ? `/${slug}/admin` : `/${slug}`)
    : '/';

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
            background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
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
                data-key={item.key}
                className={`nav-btn ${item.active ? 'active' : ''}`}
                onClick={item.onClick}
              >
                {item.label}
                {item.key === 'dashboard' && pendingCount > 0 && (
                  <span style={{
                    background: "var(--accent)", color: "var(--bg-main)",
                    borderRadius: "50%", width: 18, height: 18,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, marginLeft: 6
                  }}>
                    {pendingCount}
                  </span>
                )}
                {item.badge && (
                  <span style={{
                    background: "#f59e0b", color: "#0a0a0a",
                    borderRadius: "50%", width: 18, height: 18,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 800, marginLeft: 6
                  }}>
                    {item.badge}
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

          {/* Badge rol — clickeable para admin */}
          {userType === 'admin' ? (
            <button
              onClick={() => setSettingsOpen(true)}
              title="Configuración de la barbería"
              style={{
                fontSize: 14,
                background: "var(--accent-bg)",
                padding: "6px 10px", borderRadius: 6,
                border: "1px solid var(--accent-border)",
                cursor: "pointer",
                transition: "all 0.15s",
                color: "var(--accent)",
                fontFamily: "inherit"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "var(--accent)";
                e.currentTarget.style.transform = "rotate(45deg)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "var(--accent-bg)";
                e.currentTarget.style.transform = "rotate(0)";
              }}
            >⚙️</button>
          ) : (
            <span style={{
              fontSize: 11, color: "var(--text-tertiary)",
              fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
              background: "var(--bg-elevated)",
              padding: "4px 8px", borderRadius: 4,
              border: "1px solid var(--border)",
              whiteSpace: "nowrap",
            }}>
              👤
            </span>
          )}

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
                  background: "var(--accent)", color: "var(--bg-main)",
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
      {userType === 'admin' && <AdminSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />}
    </header>
  );
}
