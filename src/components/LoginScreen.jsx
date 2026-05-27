import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';

function ClientLanding({ slug }) {
  const { theme, toggleTheme } = useTheme();
  const { barbershopConfig, productos } = useApp();
  const [productosOpen, setProductosOpen] = useState(false);
  const [carrito, setCarrito] = useState([]); // [{...producto, qty}]
  const [carritoOpen, setCarritoOpen] = useState(false);

  const agregarAlCarrito = (p) => {
    if (p.cantidad === 0) return;
    setCarrito(prev => {
      const existing = prev.find(i => i.id === p.id);
      const maxQty = p.cantidad ?? 999;
      if (existing) {
        if (existing.qty >= maxQty) return prev;
        return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...p, qty: 1 }];
    });
  };

  const quitarDelCarrito = (id) => {
    setCarrito(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing?.qty > 1) return prev.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i);
      return prev.filter(i => i.id !== id);
    });
  };

  const totalCarrito = carrito.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cantidadCarrito = carrito.reduce((sum, i) => sum + i.qty, 0);

  const irAgendar = () => {
    sessionStorage.setItem('carrito_barberos', JSON.stringify(carrito));
    window.location.href = `/${slug}/cliente`;
  };

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
                    Productos disponibles
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
                    {productos.length} producto{productos.length !== 1 ? "s" : ""} en tienda
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
              <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                {productos.map(p => {
                  const enCarrito = carrito.find(i => i.id === p.id);
                  const agotado = p.cantidad === 0;
                  return (
                    <div key={p.id} style={{
                      background: "var(--bg-main)", border: `1px solid ${enCarrito ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 10, overflow: "hidden", transition: "border-color 0.2s"
                    }}>
                      <div style={{ height: 120, background: "var(--bg-input)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        {p.image
                          ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: agotado ? 0.4 : 1 }} />
                          : <span style={{ fontSize: 32, opacity: agotado ? 0.4 : 1 }}>📦</span>
                        }
                        {agotado && (
                          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
                            <span style={{ color: "#ef4444", fontWeight: 800, fontSize: 11, letterSpacing: 1 }}>AGOTADO</span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "10px 12px" }}>
                        <p style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", marginBottom: 2, lineHeight: 1.3 }}>{p.name}</p>
                        {p.description && (
                          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {p.description}
                          </p>
                        )}
                        {p.cantidad !== null && p.cantidad !== undefined && p.cantidad <= 5 && !agotado && (
                          <p style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, marginBottom: 4 }}>Últimas {p.cantidad} piezas</p>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                          <p style={{ fontWeight: 800, fontSize: 15, color: "var(--accent)", fontFamily: "'Barlow Condensed', sans-serif" }}>${p.price}</p>
                          {!agotado && (
                            enCarrito ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <button onClick={() => quitarDelCarrito(p.id)} style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", minWidth: 16, textAlign: "center" }}>{enCarrito.qty}</span>
                                <button onClick={() => agregarAlCarrito(p)} style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent)", border: "none", color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                              </div>
                            ) : (
                              <button onClick={() => agregarAlCarrito(p)} style={{ background: "var(--accent)", border: "none", color: "white", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Barlow', sans-serif" }}>
                                + Agregar
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ir a agendar con carrito */}
              {carrito.length > 0 && (
                <div style={{ padding: "0 16px 16px" }}>
                  <button onClick={irAgendar} className="btn-gold" style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Agendar cita con productos</span>
                    <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: 6, padding: "2px 10px", fontSize: 14, fontWeight: 800 }}>
                      ${totalCarrito.toLocaleString()}
                    </span>
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Carrito flotante */}
        {cantidadCarrito > 0 && (
          <button
            onClick={() => setCarritoOpen(true)}
            style={{
              position: "fixed", bottom: 24, right: 24, zIndex: 999,
              background: "var(--accent)", color: "white",
              border: "none", borderRadius: 50, padding: "14px 20px",
              display: "flex", alignItems: "center", gap: 10,
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              fontFamily: "'Barlow', sans-serif"
            }}
          >
            🛒
            <span>{cantidadCarrito} {cantidadCarrito === 1 ? "producto" : "productos"}</span>
            <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: 6, padding: "2px 8px" }}>${totalCarrito.toLocaleString()}</span>
          </button>
        )}

        {/* Modal carrito */}
        {carritoOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0 }}
            onClick={e => e.target === e.currentTarget && setCarritoOpen(false)}
          >
            <div style={{ background: "var(--bg-elevated)", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, padding: 24, maxHeight: "80vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>Tu carrito</h3>
                <button onClick={() => setCarritoOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>✕</button>
              </div>

              <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
                {carrito.map(item => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", background: "var(--bg-input)", borderRadius: 10 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", background: "var(--bg-elevated)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {item.image ? <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>📦</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{item.name}</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>${item.price} c/u</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => quitarDelCarrito(item.id)} style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bg-elevated)", border: "1px solid var(--border)", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                      <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                      <button onClick={() => agregarAlCarrito(item)} style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent)", border: "none", color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                    </div>
                    <p style={{ fontWeight: 800, fontSize: 15, color: "var(--accent)", fontFamily: "'Barlow Condensed', sans-serif", flexShrink: 0 }}>${(item.price * item.qty).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Total productos</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)", fontFamily: "'Barlow Condensed', sans-serif" }}>${totalCarrito.toLocaleString()}</span>
              </div>

              <button onClick={irAgendar} className="btn-gold" style={{ width: "100%" }}>
                Agendar cita →
              </button>
              <button onClick={() => { setCarrito([]); setCarritoOpen(false); }} style={{ width: "100%", marginTop: 10, background: "transparent", border: "none", color: "var(--danger)", fontSize: 13, cursor: "pointer", fontFamily: "'Barlow', sans-serif" }}>
                Vaciar carrito
              </button>
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
