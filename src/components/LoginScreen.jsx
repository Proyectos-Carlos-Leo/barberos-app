import { Link, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';

function ClientLanding({ slug }) {
  const { theme, toggleTheme } = useTheme();
  const { barbershopConfig } = useApp();

  const nombre = barbershopConfig?.nombre || 'BarberOS';
  const eslogan = barbershopConfig?.eslogan || 'Tu Barbería Digital';
  const isBarberOS = nombre === 'BarberOS';

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

      <div className="fade-in-up" style={{ textAlign: "center", padding: "0 20px", maxWidth: 480 }}>
        {/* Logo */}
        <div style={{
          width: 80, height: 80,
          background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
          borderRadius: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 32px",
          boxShadow: "0 10px 40px rgba(var(--accent-rgb),0.3)"
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
          {isBarberOS ? <><span className="gold">Barber</span>OS</> : nombre}
        </h1>
        <p style={{ color: "var(--text-tertiary)", fontSize: 16, marginBottom: 32, letterSpacing: 1 }}>
          {eslogan}
        </p>

        {/* Línea divisora azul */}
        <div style={{
          width: 40, height: 3,
          background: "var(--accent)",
          borderRadius: 2,
          margin: "0 auto 36px",
          opacity: 0.6
        }} />

        {/* Botones */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 360, margin: "0 auto" }}>
          <Link to={`/${slug}/cliente`} style={{ textDecoration: "none" }}>
            <button className="btn-large" style={{ width: "100%", fontSize: 16, padding: "16px 32px" }}>
              ✂️ Agendar mi cita
            </button>
          </Link>
          <Link to={`/${slug}/mi-cita`} style={{ textDecoration: "none" }}>
            <button className="btn-large gray" style={{ width: "100%", fontSize: 15, padding: "14px 32px" }}>
              🎫 Ya tengo cita
            </button>
          </Link>
          {barbershopConfig?.lealtad_activa !== false && (
            <Link to={`/${slug}/sellos`} style={{ textDecoration: "none" }}>
              <button style={{
                width: "100%",
                background: "transparent",
                color: "var(--accent)",
                border: "1.5px solid var(--accent-border)",
                borderRadius: 10,
                padding: "12px 32px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: 1,
                textTransform: "uppercase",
                transition: "all 0.2s"
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "var(--accent-bg)";
                  e.currentTarget.style.borderColor = "var(--accent)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "var(--accent-border)";
                }}
              >
                ⭐ Ver mis sellos
              </button>
            </Link>
          )}
        </div>

        {/* Info de la barbería */}
        {(barbershopConfig?.direccion || barbershopConfig?.telefono) && (
          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
            {barbershopConfig.direccion && (
              <p style={{ color: "var(--text-tertiary)", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <span>📍</span><span>{barbershopConfig.direccion}</span>
              </p>
            )}
            {barbershopConfig.telefono && (
              <p style={{ color: "var(--text-tertiary)", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <span>📞</span><span>{barbershopConfig.telefono}</span>
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, color: "var(--text-dim)", fontSize: 12 }}>
          <p>💈 Powered by <strong style={{ color: "var(--accent)", letterSpacing: 1 }}>MBT</strong></p>
        </div>
      </div>
    </div>
  );
}

function AdminLanding({ slug }) {
  const { theme, toggleTheme } = useTheme();
  const { barbershopConfig } = useApp();

  const nombre = barbershopConfig?.nombre || 'BarberOS';
  const isBarberOS = nombre === 'BarberOS';

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

      <div className="fade-in-up" style={{ textAlign: "center", padding: "0 20px", maxWidth: 480 }}>
        <div style={{
          width: 80, height: 80,
          background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
          borderRadius: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 32px",
          boxShadow: "0 10px 40px rgba(var(--accent-rgb),0.3)"
        }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="white">
            <path d="M12 1C8.676 1 6 3.676 6 7v1H4v15h16V8h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v1H8V7c0-2.276 1.724-4 4-4zm0 9a2 2 0 110 4 2 2 0 010-4z"/>
          </svg>
        </div>

        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "clamp(40px, 12vw, 56px)",
          fontWeight: 800,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: "var(--text-primary)",
          marginBottom: 8
        }}>
          {isBarberOS ? <><span className="gold">Barber</span>OS</> : nombre}
        </h1>
        <p style={{ color: "var(--text-tertiary)", fontSize: 16, marginBottom: 32, letterSpacing: 1 }}>
          Panel del dueño
        </p>

        <div style={{
          width: 40, height: 3,
          background: "var(--accent)",
          borderRadius: 2,
          margin: "0 auto 36px",
          opacity: 0.6
        }} />

        <Link to={`/${slug}/admin/panel`} style={{ textDecoration: "none" }}>
          <button className="btn-large" style={{ width: "100%", maxWidth: 360, fontSize: 16, padding: "16px 32px" }}>
            ⚙️ Administrar barbería
          </button>
        </Link>

        <div style={{ marginTop: 40, color: "var(--text-dim)", fontSize: 12 }}>
          <p>🔒 Acceso restringido al dueño</p>
        </div>
      </div>
    </div>
  );
}

function GlobalLogin() {
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
        style={{ position: "absolute", top: 20, right: 20 }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="fade-in-up" style={{ textAlign: "center", padding: "0 20px", maxWidth: 500 }}>
        <div style={{
          width: 80, height: 80,
          background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
          borderRadius: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 32px",
          boxShadow: "0 10px 40px rgba(var(--accent-rgb),0.3)"
        }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="white">
            <path d="M7 2h10l-2 4H9L7 2zm5 6a1 1 0 110 2 1 1 0 010-2zM4 18c0-4.4 3.6-8 8-8s8 3.6 8 8H4z"/>
          </svg>
        </div>

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
        <p style={{ color: "var(--text-tertiary)", fontSize: 16, marginBottom: 48, letterSpacing: 1 }}>
          Plataforma profesional para barberías
        </p>

        <div style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 28,
          maxWidth: 420,
          margin: "0 auto"
        }}>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
            Usa el link de tu barbería para agendar una cita:
          </p>
          <div style={{
            background: "var(--accent-bg)",
            border: "1px solid var(--accent-border)",
            borderRadius: 8,
            padding: "10px 16px",
            fontFamily: "monospace",
            fontSize: 14,
            color: "var(--accent)"
          }}>
            tuapp.com/<strong>tu-barberia</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente principal — decide qué mostrar según la ruta
export default function LoginScreen({ mode = 'client' }) {
  const { slug } = useParams();
  if (!slug) return <GlobalLogin />;
  if (mode === 'admin') return <AdminLanding slug={slug} />;
  return <ClientLanding slug={slug} />;
}
