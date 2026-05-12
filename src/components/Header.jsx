import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useApp } from '../context/AppContext';

export default function Header({ userType, navItems = [] }) {
  const navigate = useNavigate();
  const { appointments } = useApp();
  const pendingCount = appointments.filter(a => a.status === "pendiente").length;

  return (
    <header className="app-header">
      {/* Logo */}
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
        <div style={{
          width: 32,
          height: 32,
          background: "linear-gradient(135deg, #36B1DF, #5FC8EC)",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a0a0a">
            <path d="M7 2h10l-2 4H9L7 2zm5 6a1 1 0 110 2 1 1 0 010-2zM4 18c0-4.4 3.6-8 8-8s8 3.6 8 8H4z"/>
          </svg>
        </div>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: 20,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#f5f0eb"
        }}>
          BarberOS
        </span>
      </Link>

      {/* Right section */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0
      }}>
        <span style={{
          fontSize: 11,
          color: "#888",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          background: userType === 'admin' ? "#051520" : "#0f1a0f",
          padding: "4px 8px",
          borderRadius: 4,
          border: `1px solid ${userType === 'admin' ? "#0a3d56" : "#0f2e0f"}`,
          whiteSpace: "nowrap"
        }}>
          {userType === 'admin' ? '⚙️' : '👤'}
        </span>
        {userType === 'admin' && (
          <button
            className="btn-ghost"
            onClick={async () => { await signOut(auth); navigate('/'); }}
            style={{
              padding: "6px 10px",
              fontSize: 11,
              color: "#f87171",
              borderColor: "#3f1111",
              minHeight: "auto"
            }}
          >
            Salir
          </button>
        )}
        {userType !== 'admin' && (
          <button
            className="btn-ghost"
            onClick={() => navigate('/')}
            style={{ padding: "6px 12px", fontSize: 12, minHeight: "auto" }}
          >
            Inicio
          </button>
        )}
      </div>

      {/* Navigation - solo se muestra si hay navItems */}
      {navItems.length > 0 && (
        <nav className="app-nav" style={{ order: 99, width: "100%" }}>
          {navItems.map(item => (
            <button
              key={item.key}
              className={`nav-btn ${item.active ? 'active' : ''}`}
              onClick={item.onClick}
            >
              {item.label}
              {item.key === 'dashboard' && pendingCount > 0 && (
                <span style={{
                  background: "#36B1DF",
                  color: "#0a0a0a",
                  borderRadius: "50%",
                  width: 18,
                  height: 18,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  marginLeft: 6
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
