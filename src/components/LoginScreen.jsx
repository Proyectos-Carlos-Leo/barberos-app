import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { BARBERSHOP_INFO } from '../utils/data';

export default function LoginScreen() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      background: theme === 'dark'
        ? "radial-gradient(ellipse at center, var(--accent-bg) 0%, var(--bg-main) 70%)"
        : "radial-gradient(ellipse at center, #e0f4fc 0%, #f4f6f8 70%)"
    }}>
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        style={{ position: "absolute", top: 20, right: 20 }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="fade-in-up" style={{ textAlign: "center", padding: "0 20px" }}>
        {/* Logo */}
        <div style={{
          width: 80, height: 80,
          background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
          borderRadius: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 32px",
          boxShadow: "0 10px 40px rgba(54,177,223,0.3)"
        }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="white">
            <path d="M7 2h10l-2 4H9L7 2zm5 6a1 1 0 110 2 1 1 0 010-2zM4 18c0-4.4 3.6-8 8-8s8 3.6 8 8H4z"/>
          </svg>
        </div>

        {/* Título */}
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "clamp(40px, 12vw, 56px)",
          fontWeight: 800,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: "var(--text-primary)",
          marginBottom: 8
        }}>
          <span className="gold">Barber</span>OS
        </h1>
        <p style={{ color: "var(--text-tertiary)", fontSize: 16, marginBottom: 56, letterSpacing: 1 }}>
          {BARBERSHOP_INFO.tagline}
        </p>

        {/* Botones */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 360, margin: "0 auto" }}>
          <Link to="/cliente" style={{ textDecoration: "none" }}>
            <button className="btn-large" style={{ width: "100%" }}>
              ✂️ Soy Cliente
            </button>
          </Link>
          <Link to="/admin" style={{ textDecoration: "none" }}>
            <button className="btn-large gray" style={{ width: "100%" }}>
              ⚙️ Soy Dueño
            </button>
          </Link>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 56, color: "var(--text-dim)", fontSize: 12 }}>
          <p>💈 Powered by BarberOS</p>
        </div>
      </div>
    </div>
  );
}
