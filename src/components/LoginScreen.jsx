import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { useT } from '../utils/i18n';

// ==================== PIEZAS COMPARTIDAS DEL LANDING ====================

// Fondo con atmósfera: orbes de luz + rayas diagonales sutiles
function LandingBackdrop() {
  return (
    <>
      <div className="landing-orb" style={{ width: 380, height: 380, top: "-120px", left: "-120px" }} />
      <div className="landing-orb" style={{ width: 320, height: 320, bottom: "-100px", right: "-90px" }} />
      <div className="landing-pinstripes" />
    </>
  );
}

// Logo con anillo (ícono SVG limpio por dentro)
function LandingLogo({ children }) {
  return <div className="landing-logo">{children}</div>;
}

const ScissorsIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="3"/>
    <circle cx="6" cy="18" r="3"/>
    <line x1="20" y1="4" x2="8.12" y2="15.88"/>
    <line x1="14.47" y1="14.48" x2="20" y2="20"/>
    <line x1="8.12" y1="8.12" x2="12" y2="12"/>
  </svg>
);

const LockIcon = () => (
  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

function ClientLanding({ slug }) {
  const { theme, toggleTheme } = useTheme();
  const { barbershopConfig, productos } = useApp();
  const t = useT(barbershopConfig?.idioma);
  const [productosOpen, setProductosOpen] = useState(false);

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
        : "radial-gradient(ellipse at center, #e0f4fc 0%, #f4f6f8 70%)",
      overflow: "hidden"
    }}>
      <LandingBackdrop />
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        style={{ position: "absolute", top: 20, right: 20, zIndex: 2 }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="fade-in-up" style={{ textAlign: "center", padding: "40px 20px", maxWidth: 480, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <LandingLogo><ScissorsIcon /></LandingLogo>

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

        {/* Cinta de barber pole — firma de la marca */}
        <div className="barber-ribbon" />

        {/* Botones */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 360, margin: "0 auto" }}>
          <Link to={`/${slug}/cliente`} style={{ textDecoration: "none" }}>
            <button className="btn-large" style={{ width: "100%", fontSize: 16, padding: "16px 32px" }}>
              {t("✂️ Agendar mi cita")}
            </button>
          </Link>
          <Link to={`/${slug}/mi-cita`} style={{ textDecoration: "none" }}>
            <button className="btn-landing-secondary">
              {t("🎫 Ya tengo cita")}
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
                {t("⭐ Ver mis sellos")}
              </button>
            </Link>
          )}
        </div>

        {/* Info de la barbería */}
        {(barbershopConfig?.direccion || barbershopConfig?.telefono) && (
          <div style={{ marginTop: 36, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {barbershopConfig.direccion && (
              <span className="landing-chip">📍 {barbershopConfig.direccion}</span>
            )}
            {barbershopConfig.telefono && (
              <a href={`tel:${barbershopConfig.telefono}`} className="landing-chip" style={{ textDecoration: "none" }}>
                📞 {barbershopConfig.telefono}
              </a>
            )}
          </div>
        )}

        {/* Catálogo de productos — desplegable */}
        {barbershopConfig?.productos_activos !== false && productos && productos.length > 0 && (
          <div style={{ marginTop: 40, width: "100%", maxWidth: 480 }}>

            {/* Header clickeable */}
            <button
              onClick={() => setProductosOpen(o => !o)}
              style={{
                width: "100%",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: productosOpen ? "12px 12px 0 0" : 12,
                padding: "14px 20px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "border-radius 0.2s",
                fontFamily: "'Barlow', sans-serif",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>🛍</span>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    {t("Productos disponibles")}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
                    {productos.length} {t(productos.length !== 1 ? "productos" : "producto")} {t("en tienda")}
                  </p>
                </div>
              </div>
              <svg
                width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round"
                style={{ transition: "transform 0.25s", transform: productosOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {/* Contenido desplegable */}
            <div style={{
              overflow: "hidden",
              maxHeight: productosOpen ? "2000px" : "0px",
              transition: "max-height 0.35s ease",
              background: "var(--bg-elevated)",
              border: productosOpen ? "1px solid var(--border)" : "none",
              borderTop: "none",
              borderRadius: "0 0 12px 12px",
            }}>
              <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
                {productos.map(p => {
                  const agotado = p.cantidad === 0;
                  return (
                    <div key={p.id} style={{
                      background: "var(--bg-main)", border: "1px solid var(--border)",
                      borderRadius: 10, overflow: "hidden", opacity: agotado ? 0.6 : 1
                    }}>
                      <div style={{ height: 110, background: "var(--bg-input)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        {p.image
                          ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 30 }}>📦</span>
                        }
                        {agotado && (
                          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "#ef4444", fontWeight: 800, fontSize: 10, letterSpacing: 1 }}>{t("AGOTADO")}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "10px 12px" }}>
                        <p style={{ fontWeight: 700, fontSize: 12, color: "var(--text-primary)", marginBottom: 2, lineHeight: 1.3 }}>{p.name}</p>
                        {p.description && (
                          <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {p.description}
                          </p>
                        )}
                        {p.cantidad !== null && p.cantidad !== undefined && p.cantidad > 0 && p.cantidad <= 5 && (
                          <p style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, marginBottom: 2 }}>{t("Últimas")} {p.cantidad}</p>
                        )}
                        <p style={{ fontWeight: 800, fontSize: 14, color: "var(--accent)", fontFamily: "'Barlow Condensed', sans-serif" }}>${p.price}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

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
        : "radial-gradient(ellipse at center, #e0f4fc 0%, #f4f6f8 70%)",
      overflow: "hidden"
    }}>
      <LandingBackdrop />
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        style={{ position: "absolute", top: 20, right: 20, zIndex: 2 }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="fade-in-up" style={{ textAlign: "center", padding: "40px 20px", maxWidth: 480, position: "relative", zIndex: 1 }}>
        <LandingLogo><LockIcon /></LandingLogo>

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

        <div className="barber-ribbon" />

        <Link to={`/${slug}/admin/panel`} style={{ textDecoration: "none" }}>
          <button className="btn-large" style={{ width: "100%", maxWidth: 360, fontSize: 16, padding: "16px 32px" }}>
            ⚙️ Administrar barbería
          </button>
        </Link>

        <div style={{ marginTop: 36 }}>
          <span className="landing-chip" style={{ fontSize: 11.5 }}>🔒 Acceso restringido al dueño</span>
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
        : "radial-gradient(ellipse at center, #e0f4fc 0%, #f4f6f8 70%)",
      overflow: "hidden"
    }}>
      <LandingBackdrop />
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        style={{ position: "absolute", top: 20, right: 20, zIndex: 2 }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="fade-in-up" style={{ textAlign: "center", padding: "40px 20px", maxWidth: 500, position: "relative", zIndex: 1 }}>
        <LandingLogo><ScissorsIcon /></LandingLogo>

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
