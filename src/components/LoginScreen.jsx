import { Link } from 'react-router-dom';
import { BARBERSHOP_INFO } from '../utils/data';

export default function LoginScreen() {
  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      padding: "20px",
      background: "radial-gradient(ellipse at center, #1a1410 0%, #0a0a0a 70%)"
    }}>
      <div className="fade-in-up" style={{ textAlign: "center", maxWidth: 500, width: "100%" }}>
        {/* Logo */}
        <div style={{ 
          width: 80, 
          height: 80, 
          background: "linear-gradient(135deg, #c9a84c, #e8c96a)", 
          borderRadius: 16, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          margin: "0 auto 32px",
          boxShadow: "0 10px 40px rgba(201, 168, 76, 0.3)"
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="#0a0a0a">
            <path d="M7 2h10l-2 4H9L7 2zm5 6a1 1 0 110 2 1 1 0 010-2zM4 18c0-4.4 3.6-8 8-8s8 3.6 8 8H4z"/>
          </svg>
        </div>

        {/* Title */}
        <h1 style={{ 
          fontFamily: "'Barlow Condensed', sans-serif", 
          fontSize: "clamp(40px, 12vw, 56px)", 
          fontWeight: 800, 
          letterSpacing: 2, 
          textTransform: "uppercase", 
          marginBottom: 12,
          lineHeight: 1
        }}>
          <span style={{ color: "#c9a84c" }}>Barber</span>OS
        </h1>
        <p style={{ 
          color: "#888", 
          fontSize: 16, 
          marginBottom: 8,
          fontStyle: "italic"
        }}>
          {BARBERSHOP_INFO.tagline}
        </p>
        <p style={{ 
          color: "#666", 
          fontSize: 14, 
          marginBottom: 48,
          lineHeight: 1.6
        }}>
          Sistema profesional de agendamiento.<br />
          Elige cómo quieres acceder.
        </p>

        {/* Buttons */}
        <div style={{ display: "grid", gap: 14, marginBottom: 32 }}>
          <Link to="/cliente" style={{ textDecoration: "none" }}>
            <button className="btn-large">
              <span style={{ marginRight: 8 }}>👤</span> Soy Cliente
            </button>
          </Link>
          <Link to="/admin" style={{ textDecoration: "none" }}>
            <button className="btn-large gray">
              <span style={{ marginRight: 8 }}>⚙️</span> Soy Dueño
            </button>
          </Link>
        </div>

        {/* Info footer */}
        <div style={{ 
          padding: "20px",
          background: "#141414",
          border: "1px solid #1e1e1e",
          borderRadius: 12,
          marginTop: 32
        }}>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 12, fontWeight: 600 }}>
            📍 {BARBERSHOP_INFO.address}
          </p>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
            📞 {BARBERSHOP_INFO.phone}
          </p>
          <div style={{ borderTop: "1px solid #222", paddingTop: 12, marginTop: 12 }}>
            <p style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Lun - Vie: {BARBERSHOP_INFO.schedule.weekdays}</p>
            <p style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Sábado: {BARBERSHOP_INFO.schedule.saturday}</p>
            <p style={{ fontSize: 12, color: "#666" }}>Domingo: {BARBERSHOP_INFO.schedule.sunday}</p>
          </div>
        </div>

        <p style={{ fontSize: 11, color: "#444", marginTop: 24 }}>
          © 2026 BarberOS · Sistema de gestión profesional
        </p>
      </div>
    </div>
  );
}
