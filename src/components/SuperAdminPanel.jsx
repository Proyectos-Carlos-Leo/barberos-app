import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../firebase';

// ⚠️ REEMPLAZA ESTOS UIDs con los de tus cuentas de Firebase Auth
// Ve a Firebase Console > Authentication > Users y copia el UID de cada fundador
const FOUNDER_UIDS = [
  'p8knfgFj1OXQkS6xKHSjtkPXEG43',
  'DFOJycimNmTyxBWVoMgESgXkP5p1',
];

// =========================================================
// LOGIN SCREEN
// =========================================================
function SuperLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Completa todos los campos'); return; }
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!FOUNDER_UIDS.includes(cred.user.uid)) {
        await signOut(auth);
        setError('Acceso denegado. Solo los fundadores pueden entrar aquí.');
        setLoading(false);
        return;
      }
      onLogin();
    } catch (err) {
      let msg = 'Error al iniciar sesión';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') msg = 'Email o contraseña incorrectos';
      else if (err.code === 'auth/user-not-found') msg = 'Usuario no registrado';
      else if (err.code === 'auth/invalid-email') msg = 'Email inválido';
      else if (err.code === 'auth/too-many-requests') msg = 'Demasiados intentos, espera un momento';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        {/* Logo */}
        <div style={{
          width: 72, height: 72,
          background: 'linear-gradient(135deg, #36B1DF, #5FC8EC)',
          borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px', boxShadow: '0 8px 32px rgba(54,177,223,0.4)'
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="#0a0a0a">
            <path d="M12 1C8.676 1 6 3.676 6 7v1H4v15h16V8h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v1H8V7c0-2.276 1.724-4 4-4zm0 9a2 2 0 110 4 2 2 0 010-4z"/>
          </svg>
        </div>

        <h1 style={{
          fontSize: 28, fontWeight: 800, letterSpacing: -0.5,
          color: '#fff', marginBottom: 8
        }}>
          BarberOS <span style={{ color: '#36B1DF' }}>Admin</span>
        </h1>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 36 }}>
          Panel exclusivo para fundadores
        </p>

        <div style={{
          background: '#141414', border: '1px solid #222',
          borderRadius: 16, padding: 28
        }}>
          <div style={{ marginBottom: 16, textAlign: 'left' }}>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="tu@email.com"
              autoFocus
              style={{
                background: '#0a0a0a', color: '#fff',
                border: `1px solid ${error ? '#dc2626' : '#2a2a2a'}`,
                borderRadius: 8, padding: '12px 16px',
                width: '100%', fontSize: 15, outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 20, textAlign: 'left' }}>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={{
                background: '#0a0a0a', color: '#fff',
                border: `1px solid ${error ? '#dc2626' : '#2a2a2a'}`,
                borderRadius: 8, padding: '12px 16px',
                width: '100%', fontSize: 15, outline: 'none', letterSpacing: 4,
                boxSizing: 'border-box'
              }}
            />
            {error && <p style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>⚠ {error}</p>}
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#222' : 'linear-gradient(135deg, #36B1DF, #5FC8EC)',
              color: loading ? '#555' : '#0a0a0a',
              border: 'none', borderRadius: 8, padding: '14px 24px',
              fontSize: 15, fontWeight: 700, letterSpacing: 0.5,
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
            }}
          >
            {loading ? 'Verificando...' : 'Entrar al Panel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// TARJETA DE BARBERÍA
// =========================================================
function BarbershopCard({ slug, data }) {
  const [expanded, setExpanded] = useState(false);
  const [citas, setCitas] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const cfg = data.config || {};

  const loadDetails = () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    setLoadingData(true);

    let citasDone = false, barberosDone = false;
    const checkDone = () => {
      if (citasDone && barberosDone) setLoadingData(false);
    };

    const unsubCitas = onValue(ref(db, `barberias/${slug}/citas`), snap => {
      const d = snap.val();
      setCitas(d ? Object.values(d) : []);
      citasDone = true;
      checkDone();
    }, { onlyOnce: true });

    const unsubBarberos = onValue(ref(db, `barberias/${slug}/barberos`), snap => {
      const d = snap.val();
      setBarberos(d ? Object.values(d) : []);
      barberosDone = true;
      checkDone();
    }, { onlyOnce: true });
  };

  // Stats rápidas de citas
  const hoy = new Date().toISOString().slice(0, 10);
  const citasHoy = citas.filter(c => c.date === hoy);
  const citasPendientes = citas.filter(c => c.status === 'pendiente');
  const citasConfirmadas = citas.filter(c => c.status === 'confirmada');
  const citasCompletadas = citas.filter(c => c.status === 'completada');
  const ingresosTotal = citasCompletadas.reduce((sum, c) => sum + (c.service?.price || 0), 0);

  return (
    <div style={{
      background: '#141414', border: '1px solid #222',
      borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.2s'
    }}>
      {/* Header de la tarjeta */}
      <div
        onClick={loadDetails}
        style={{
          padding: '20px 24px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'background 0.15s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#1a1a1a'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Avatar */}
          <div style={{
            width: 48, height: 48,
            background: 'linear-gradient(135deg, #36B1DF22, #36B1DF44)',
            border: '1px solid #36B1DF44',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: '#36B1DF', flexShrink: 0
          }}>
            {(cfg.nombre || slug).charAt(0).toUpperCase()}
          </div>

          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
              {cfg.nombre || slug}
            </div>
            <div style={{ color: '#555', fontSize: 13, marginTop: 2 }}>
              /{slug} · {cfg.direccion || 'Sin dirección'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Badge email admin */}
          {cfg.email_admin && (
            <span style={{
              fontSize: 11, color: '#36B1DF', background: '#36B1DF15',
              border: '1px solid #36B1DF30', borderRadius: 6, padding: '3px 8px'
            }}>
              {cfg.email_admin}
            </span>
          )}
          {/* Flecha */}
          <span style={{
            color: '#555', fontSize: 18,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}>▾</span>
        </div>
      </div>

      {/* Panel expandido */}
      {expanded && (
        <div style={{ borderTop: '1px solid #1f1f1f', padding: '20px 24px' }}>
          {loadingData ? (
            <div style={{ color: '#555', textAlign: 'center', padding: '20px 0', fontSize: 14 }}>
              Cargando datos...
            </div>
          ) : (
            <>
              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Citas hoy', value: citasHoy.length, color: '#36B1DF' },
                  { label: 'Pendientes', value: citasPendientes.length, color: '#f59e0b' },
                  { label: 'Confirmadas', value: citasConfirmadas.length, color: '#22c55e' },
                  { label: 'Completadas', value: citasCompletadas.length, color: '#8b5cf6' },
                  { label: 'Total citas', value: citas.length, color: '#ec4899' },
                  { label: 'Ingresos', value: `$${ingresosTotal.toLocaleString()}`, color: '#36B1DF' },
                ].map(stat => (
                  <div key={stat.label} style={{
                    background: '#0a0a0a', border: '1px solid #1f1f1f',
                    borderRadius: 10, padding: '14px 16px'
                  }}>
                    <div style={{ fontSize: 11, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {stat.label}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Barberos */}
              {barberos.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                    Barberos ({barberos.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {barberos.map((b, i) => (
                      <div key={i} style={{
                        background: '#0a0a0a', border: '1px solid #1f1f1f',
                        borderRadius: 8, padding: '6px 12px',
                        display: 'flex', alignItems: 'center', gap: 8
                      }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: b.bg || '#222', color: b.color || '#fff',
                          fontSize: 10, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {b.avatar || b.name?.charAt(0)}
                        </div>
                        <span style={{ color: b.active ? '#ccc' : '#444', fontSize: 13 }}>
                          {b.name}
                        </span>
                        {!b.active && <span style={{ fontSize: 10, color: '#555' }}>(inactivo)</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Citas recientes */}
              {citas.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                    Últimas 5 citas
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[...citas]
                      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                      .slice(0, 5)
                      .map((c, i) => {
                        const statusColors = {
                          pendiente: '#f59e0b', confirmada: '#22c55e',
                          completada: '#8b5cf6', cancelada: '#ef4444'
                        };
                        return (
                          <div key={i} style={{
                            background: '#0a0a0a', border: '1px solid #1f1f1f',
                            borderRadius: 8, padding: '10px 14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                          }}>
                            <div>
                              <span style={{ color: '#ccc', fontSize: 13, fontWeight: 500 }}>
                                {c.client || 'Cliente'}
                              </span>
                              <span style={{ color: '#444', fontSize: 12, marginLeft: 8 }}>
                                {c.date} {c.time}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {c.service?.price && (
                                <span style={{ color: '#555', fontSize: 12 }}>${c.service.price}</span>
                              )}
                              <span style={{
                                fontSize: 11, fontWeight: 600,
                                color: statusColors[c.status] || '#555',
                                background: `${statusColors[c.status] || '#555'}15`,
                                borderRadius: 5, padding: '2px 8px'
                              }}>
                                {c.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================
// PANEL PRINCIPAL
// =========================================================
function SuperAdminDashboard({ onLogout }) {
  const [barberias, setBarberias] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'barberias'), (snapshot) => {
      setBarberias(snapshot.val() || {});
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const slugs = Object.keys(barberias).filter(slug =>
    search === '' ||
    slug.toLowerCase().includes(search.toLowerCase()) ||
    (barberias[slug]?.config?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  // Totales globales
  const totalCitas = Object.values(barberias).reduce((sum, b) => {
    const citas = b.citas ? Object.keys(b.citas).length : 0;
    return sum + citas;
  }, 0);

  const totalBarberos = Object.values(barberias).reduce((sum, b) => {
    const barberos = b.barberos ? Object.keys(b.barberos).length : 0;
    return sum + barberos;
  }, 0);

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      {/* Header */}
      <div style={{
        background: '#141414', borderBottom: '1px solid #1f1f1f',
        padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #36B1DF, #5FC8EC)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a0a0a">
              <path d="M12 1C8.676 1 6 3.676 6 7v1H4v15h16V8h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v1H8V7c0-2.276 1.724-4 4-4zm0 9a2 2 0 110 4 2 2 0 010-4z"/>
            </svg>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>BarberOS</div>
            <div style={{ color: '#555', fontSize: 12 }}>Panel de Fundadores</div>
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            background: 'transparent', border: '1px solid #2a2a2a',
            color: '#666', borderRadius: 8, padding: '8px 16px',
            fontSize: 13, cursor: 'pointer', transition: 'all 0.15s'
          }}
          onMouseEnter={e => { e.target.style.borderColor = '#ef4444'; e.target.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.target.style.borderColor = '#2a2a2a'; e.target.style.color = '#666'; }}
        >
          Cerrar sesión
        </button>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats globales */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 36 }}>
          {[
            { label: 'Barberías registradas', value: Object.keys(barberias).length, icon: '🏪', color: '#36B1DF' },
            { label: 'Total citas (DB)', value: totalCitas, icon: '📅', color: '#22c55e' },
            { label: 'Total barberos', value: totalBarberos, icon: '💈', color: '#8b5cf6' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#141414', border: '1px solid #1f1f1f',
              borderRadius: 14, padding: '20px 22px'
            }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{stat.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 6 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Buscador */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar barbería por nombre o slug..."
            style={{
              flex: 1, background: '#141414', color: '#fff',
              border: '1px solid #222', borderRadius: 10, padding: '12px 16px',
              fontSize: 14, outline: 'none'
            }}
          />
          <div style={{ color: '#555', fontSize: 13, whiteSpace: 'nowrap' }}>
            {slugs.length} {slugs.length === 1 ? 'resultado' : 'resultados'}
          </div>
        </div>

        {/* Lista de barberías */}
        {loading ? (
          <div style={{ color: '#555', textAlign: 'center', padding: 60, fontSize: 15 }}>
            Cargando barberías...
          </div>
        ) : slugs.length === 0 ? (
          <div style={{ color: '#555', textAlign: 'center', padding: 60, fontSize: 15 }}>
            {search ? 'No se encontraron resultados' : 'No hay barberías registradas'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {slugs.map(slug => (
              <BarbershopCard key={slug} slug={slug} data={barberias[slug]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================
// COMPONENTE PRINCIPAL
// =========================================================
export default function SuperAdminPanel() {
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'logged-out' | 'logged-in'

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && FOUNDER_UIDS.includes(user.uid)) {
        setAuthState('logged-in');
      } else {
        if (user) await signOut(auth); // Si es usuario pero no fundador, lo saca
        setAuthState('logged-out');
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setAuthState('logged-out');
  };

  if (authState === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a0a',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ color: '#555', fontSize: 14 }}>Cargando...</div>
      </div>
    );
  }

  if (authState === 'logged-out') {
    return <SuperLogin onLogin={() => setAuthState('logged-in')} />;
  }

  return <SuperAdminDashboard onLogout={handleLogout} />;
}
