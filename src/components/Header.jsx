import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Header({ userType, navItems = [] }) {
  const navigate = useNavigate();
  const { appointments } = useApp();
  const pendingCount = appointments.filter(a => a.status === "pendiente").length;

  return (
    <header style={{ 
      borderBottom: "1px solid #1e1e1e", 
      padding: "0 24px", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "space-between", 
      height: 60,
      background: "#0a0a0a",
      position: "sticky",
      top: 0,
      zIndex: 100
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <div style={{ 
          width: 32, 
          height: 32, 
          background: "linear-gradient(135deg, #c9a84c, #e8c96a)", 
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

      {/* Navigation */}
      <nav style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {navItems.map(item => (
          <button
            key={item.key}
            className={`nav-btn ${item.active ? 'active' : ''}`}
            onClick={item.onClick}
          >
            {item.label}
            {item.key === 'dashboard' && pendingCount > 0 && (
              <span style={{
                background: "#c9a84c",
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
        
        <div style={{ 
          marginLeft: 16, 
          paddingLeft: 16, 
          borderLeft: "1px solid #2e2e2e",
          display: "flex",
          alignItems: "center",
          gap: 12
        }}>
          <span style={{ 
            fontSize: 11, 
            color: "#888",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            background: userType === 'admin' ? "#1a1410" : "#0f1a0f",
            padding: "4px 10px",
            borderRadius: 4,
            border: `1px solid ${userType === 'admin' ? "#3d2e0a" : "#0f2e0f"}`
          }}>
            {userType === 'admin' ? '⚙️ Admin' : '👤 Cliente'}
          </span>
          {userType === 'admin' && (
            <button
              className="btn-ghost"
              onClick={() => { sessionStorage.removeItem('admin_auth'); navigate('/admin'); window.location.reload(); }}
              style={{ padding: "6px 14px", fontSize: 12, color: "#f87171", borderColor: "#3f1111" }}
            >
              Cerrar sesión
            </button>
          )}
          <button 
            className="btn-ghost" 
            onClick={() => navigate('/')}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            Salir
          </button>
        </div>
      </nav>
    </header>
  );
}
