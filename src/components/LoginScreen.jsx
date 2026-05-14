import { Link, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';

function LoginContent({ slug }) {
  const { theme, toggleTheme } = useTheme();
  const { barbershopConfig } = useApp();

  const nombre = barbershopConfig?.nombre || 'BarberOS';
  const eslogan = barbershopConfig?.eslogan || 'Tu Barbería Digital · Sistema Profesional de Agendamiento';

  // Separar "Barber" + "OS" si el nombre es BarberOS
  const isBarberOS = nombre === 'BarberOS';

  return (
    <div style={{
      minHeight: "100vh",
      position: "relative",
      background: theme === 'dark'
        ? "radial-gradient(ellipse at top, var(--accent-bg) 0%, var(--bg-main) 60%)"
        : "radial-gradient(ellipse at top, #e0f4fc 0%, #f4f6f8 60%)",
      overflow: "hidden"
    }}>
      {/* Toggle de tema */}
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="fade-in-up" style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "60px 20px 40px",
        textAlign: "center"
      }}>
        {/* Logo */}
        <div style={{
          width: 100, height: 100,
          background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
          borderRadius: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 32px",
          boxShadow: "0 20px 60px rgba(54, 177, 223, 0.35)"
        }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="white">
            <path d="M7 2h10l-2 4H9L7 2zm5 6a1 1 0 110 2 1 1 0 010-2zM4 18c0-4.4 3.6-8 8-8s8 3.6 8 8H4z"/>
          </svg>
        </div>

        {/* Título */}
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "clamp(48px, 12vw, 64px)",
          fontWeight: 800,
          letterSpacing: 3,
          marginBottom: 16,
          lineHeight: 1,
          color: "var(--text-primary)"
        }}>
          {isBarberOS ? (
            <><span className="gold">Barber</span>OS</>
          ) : (
            nombre
          )}
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: 20,
          color: "var(--text-tertiary)",
          marginBottom: 48,
          fontStyle: "italic",
          maxWidth: 600,
          margin: "0 auto 48px"
        }}>
          {eslogan}
        </p>

        {/* Botones principales */}
        <div style={{
          display: "flex",
          gap: 14,
          maxWidth: 480,
          margin: "0 auto 48px",
          flexWrap: "wrap",
          justifyContent: "center"
        }}>
          <Link to={`/${slug}/cliente`} style={{ textDecoration: "none", flex: "1 1 200px" }}>
            <button className="btn-large" style={{ width: "100%" }}>
              ✂️ Agendar mi cita
            </button>
          </Link>
          <Link to={`/${slug}/admin`} style={{ textDecoration: "none", flex: "1 1 200px" }}>
            <button className="btn-large gray" style={{ width: "100%" }}>
              ⚙️ Panel admin
            </button>
          </Link>
        </div>

        {/* Features grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
          margin: "48px 0",
          textAlign: "left"
        }}>
          <Feature
            icon="👤"
            title="Vista Cliente"
            description="Tus clientes agendan en 4 pasos sencillos. Eligen barbero, servicio, fecha y hora con horarios actualizados al instante."
          />
          <Feature
            icon="⚙️"
            title="Panel Admin"
            description="Gestiona todas las citas, cambia estados, controla tu equipo y mira tus ingresos en tiempo real."
          />
          <Feature
            icon="🔄"
            title="Sincronización"
            description="Las dos vistas están conectadas. Cuando un cliente agenda, aparece al instante en tu panel."
          />
        </div>

        {/* Info de la barbería si existe */}
        {(barbershopConfig?.direccion || barbershopConfig?.telefono) && (
          <div style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 20,
            maxWidth: 500,
            margin: "0 auto 32px",
            textAlign: "left",
            display: "grid",
            gap: 8
          }}>
            {barbershopConfig.direccion && (
              <p style={{ color: "var(--text-secondary)", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                📍 <span>{barbershopConfig.direccion}</span>
              </p>
            )}
            {barbershopConfig.telefono && (
              <p style={{ color: "var(--text-secondary)", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                📞 <span>{barbershopConfig.telefono}</span>
              </p>
            )}
            {barbershopConfig.horario_semana && (
              <p style={{ color: "var(--text-secondary)", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                🕐 <span>Lun-Vie {barbershopConfig.horario_semana}</span>
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 48,
          paddingTop: 32,
          borderTop: "1px solid var(--border)",
          color: "var(--text-muted)",
          fontSize: 12
        }}>
          <p>💈 Powered by <strong style={{ color: "var(--accent)" }}>BarberOS</strong> · Sistema profesional para barberías</p>
        </div>
      </div>
    </div>
  );
}

// ====== Feature card ======
function Feature({ icon, title, description }) {
  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
      borderRadius: 16,
      padding: 24,
      transition: "transform 0.2s, border-color 0.2s",
      cursor: "default"
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.borderColor = "var(--accent)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 16 }}>{icon}</div>
      <h3 style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: "var(--accent)",
        marginBottom: 12
      }}>
        {title}
      </h3>
      <p style={{
        color: "var(--text-tertiary)",
        fontSize: 14,
        lineHeight: 1.6
      }}>
        {description}
      </p>
    </div>
  );
}

// ====== Pantalla global sin slug ======
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
        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="fade-in-up" style={{ textAlign: "center", padding: "0 20px", maxWidth: 500 }}>
        <div style={{
          width: 100, height: 100,
          background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
          borderRadius: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 32px",
          boxShadow: "0 20px 60px rgba(54, 177, 223, 0.35)"
        }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="white">
            <path d="M7 2h10l-2 4H9L7 2zm5 6a1 1 0 110 2 1 1 0 010-2zM4 18c0-4.4 3.6-8 8-8s8 3.6 8 8H4z"/>
          </svg>
        </div>

        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "clamp(48px, 12vw, 64px)",
          fontWeight: 800,
          letterSpacing: 3,
          marginBottom: 16,
          lineHeight: 1,
          color: "var(--text-primary)"
        }}>
          <span className="gold">Barber</span>OS
        </h1>
        <p style={{
          fontSize: 20,
          color: "var(--text-tertiary)",
          marginBottom: 48,
          fontStyle: "italic"
        }}>
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
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 16 }}>
            ¿Eres dueño de una barbería? Contacta al administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginScreen() {
  const { slug } = useParams();
  if (!slug) return <GlobalLogin />;
  return <LoginContent slug={slug} />;
}
