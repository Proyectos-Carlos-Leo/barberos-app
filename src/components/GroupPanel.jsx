import { useState, useEffect, useMemo } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../firebase';
import { IconConfiguracion } from './icons/BrandIcons';

// El ID del grupo es el email del dueño saneado (mismo formato que usa /founders al crearlo)
export const emailToGroupId = (email) =>
  String(email || '').trim().toLowerCase().replace(/[.#$/\[\]@]/g, '_');

const todayStr = () => new Date().toISOString().split('T')[0];
const monthPrefix = () => todayStr().slice(0, 7);
const fmtMoney = (n) => `$${(n || 0).toLocaleString('es-MX')}`;

const PURPLE = '#a78bfa';

// =========================================================
// LOGIN
// =========================================================
function GroupLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Completa todos los campos'); return; }
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
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
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: "'Barlow', sans-serif"
    }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72,
          background: `linear-gradient(135deg, ${PURPLE}, #c4b5fd)`,
          borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px', boxShadow: `0 8px 32px ${PURPLE}66`, fontSize: 32
        }}>
          🏢
        </div>

        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 28, fontWeight: 800, letterSpacing: 1,
          color: '#fff', marginBottom: 8, textTransform: 'uppercase'
        }}>
          Panel <span style={{ color: PURPLE }}>Multi-Sucursal</span>
        </h1>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 36 }}>
          Todas tus barberías en un solo lugar
        </p>

        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 16, padding: 28 }}>
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
                boxSizing: 'border-box', fontFamily: "'Barlow', sans-serif"
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
                boxSizing: 'border-box', fontFamily: "'Barlow', sans-serif"
              }}
            />
            {error && <p style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>⚠ {error}</p>}
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#4c3a78' : `linear-gradient(135deg, ${PURPLE}, #c4b5fd)`,
              color: '#0a0a0a', border: 'none', borderRadius: 10,
              padding: '13px 0', fontSize: 15, fontWeight: 800,
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: 'uppercase', letterSpacing: 1
            }}
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>

        <p style={{ color: '#333', fontSize: 11, marginTop: 24 }}>
          Acceso exclusivo para dueños con plan Multi-Sucursal
        </p>
      </div>
    </div>
  );
}

// =========================================================
// DASHBOARD DEL GRUPO
// =========================================================
function GroupDashboard({ user, onLogout }) {
  const [grupo, setGrupo] = useState(undefined); // undefined = cargando, null = no existe
  const [branchData, setBranchData] = useState({});
  const [copied, setCopied] = useState(null); // slug cuyo link se acaba de copiar

  // Cargar el grupo del dueño (ID derivado de su email)
  useEffect(() => {
    const gid = emailToGroupId(user.email);
    const unsub = onValue(ref(db, `grupos/${gid}`), (snap) => {
      setGrupo(snap.exists() ? snap.val() : null);
    }, () => setGrupo(null));
    return () => unsub();
  }, [user.email]);

  // Suscribirse a config/citas/barberos de cada sucursal (nodos de lectura pública)
  useEffect(() => {
    if (!grupo?.slugs) return;
    const slugs = Object.keys(grupo.slugs).filter(s => grupo.slugs[s]);
    const unsubs = [];
    slugs.forEach(slug => {
      ['config', 'citas', 'barberos'].forEach(node => {
        unsubs.push(onValue(ref(db, `barberias/${slug}/${node}`), (snap) => {
          setBranchData(prev => ({
            ...prev,
            [slug]: { ...(prev[slug] || {}), [node]: snap.val() }
          }));
        }));
      });
    });
    return () => unsubs.forEach(u => u());
  }, [grupo]);

  // Métricas por sucursal + globales
  const { branches, globals } = useMemo(() => {
    const hoy = todayStr();
    const mes = monthPrefix();
    const slugs = grupo?.slugs ? Object.keys(grupo.slugs).filter(s => grupo.slugs[s]) : [];

    const list = slugs.map(slug => {
      const d = branchData[slug] || {};
      const cfg = d.config || {};
      const citas = d.citas ? Object.values(d.citas) : [];
      const completadas = citas.filter(c => c.status === 'completada');
      const ingresoDe = (c) => (c.service?.price || 0) + (c.totalProductos || 0);

      return {
        slug,
        nombre: cfg.nombre || slug,
        activa: cfg.activa !== false,
        citasHoy: citas.filter(c => c.date === hoy && c.status !== 'cancelada').length,
        pendientes: citas.filter(c => c.status === 'pendiente').length,
        citasTotal: citas.length,
        ingresosMes: completadas.filter(c => (c.date || '').startsWith(mes)).reduce((s, c) => s + ingresoDe(c), 0),
        ingresosTotal: completadas.reduce((s, c) => s + ingresoDe(c), 0),
        barberosActivos: d.barberos ? Object.values(d.barberos).filter(b => b.active).length : 0,
        loaded: d.config !== undefined,
      };
    });

    list.sort((a, b) => b.ingresosMes - a.ingresosMes);

    return {
      branches: list,
      globals: {
        sucursales: list.length,
        citasHoy: list.reduce((s, b) => s + b.citasHoy, 0),
        pendientes: list.reduce((s, b) => s + b.pendientes, 0),
        ingresosMes: list.reduce((s, b) => s + b.ingresosMes, 0),
        ingresosTotal: list.reduce((s, b) => s + b.ingresosTotal, 0),
      }
    };
  }, [grupo, branchData]);

  // ---- Estados de carga / sin grupo ----
  if (grupo === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#555', fontSize: 14 }}>Cargando tu grupo…</div>
      </div>
    );
  }

  if (grupo === null) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 420, fontFamily: "'Barlow', sans-serif" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🏢</div>
          <h2 style={{ color: '#fff', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Sin grupo asignado
          </h2>
          <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            La cuenta <span style={{ color: PURPLE }}>{user.email}</span> no tiene un grupo multi-sucursal configurado.
            Contacta a BarberOS para activar tu plan.
          </p>
          <button
            onClick={onLogout}
            style={{
              background: 'transparent', border: '1px solid #2a2a2a', color: '#888',
              borderRadius: 8, padding: '10px 22px', fontSize: 13, cursor: 'pointer',
              fontFamily: "'Barlow', sans-serif"
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  const Stat = ({ label, value, color = PURPLE, sub }) => (
    <div style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 14, padding: '16px 20px', minWidth: 0 }}>
      <p style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 30, fontWeight: 800, color, fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#444', marginTop: 5 }}>{sub}</p>}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: "'Barlow', sans-serif" }}>
      {/* Header */}
      <div style={{
        background: 'rgba(20,20,20,0.92)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #1f1f1f',
        padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10, gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <div style={{
            width: 40, height: 40, flexShrink: 0,
            background: `linear-gradient(135deg, ${PURPLE}, #c4b5fd)`,
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19
          }}>🏢</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, fontFamily: "'Barlow Condensed', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {grupo.nombre || 'Mi grupo'}
            </div>
            <div style={{ color: '#555', fontSize: 12 }}>Panel Multi-Sucursal · {user.email}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            background: 'transparent', border: '1px solid #2a2a2a',
            color: '#666', borderRadius: 8, padding: '8px 16px',
            fontSize: 13, cursor: 'pointer', fontFamily: "'Barlow', sans-serif", flexShrink: 0
          }}
        >
          Cerrar sesión
        </button>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* Métricas del grupo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
          <Stat label="Sucursales" value={globals.sucursales} />
          <Stat label="Citas hoy" value={globals.citasHoy} color="#4ade80" sub={globals.pendientes > 0 ? `${globals.pendientes} pendientes de confirmar` : 'Todo confirmado'} />
          <Stat label="Ingresos del mes" value={fmtMoney(globals.ingresosMes)} color="#f59e0b" sub="Todas las sucursales" />
          <Stat label="Ingresos históricos" value={fmtMoney(globals.ingresosTotal)} color="#36B1DF" />
        </div>

        {/* Comparativa de sucursales */}
        <p style={{ fontSize: 12, color: '#444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Tus sucursales · ordenadas por ingresos del mes
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {branches.map((b, i) => (
            <div key={b.slug} style={{
              background: '#141414',
              border: `1px solid ${i === 0 && b.ingresosMes > 0 ? PURPLE + '55' : '#1f1f1f'}`,
              borderRadius: 12, padding: '16px 18px',
              opacity: b.activa ? 1 : 0.6
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                {/* Nombre */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{
                    width: 40, height: 40, flexShrink: 0,
                    background: i === 0 && b.ingresosMes > 0 ? `${PURPLE}22` : '#1f1f1f',
                    border: `1px solid ${i === 0 && b.ingresosMes > 0 ? PURPLE + '55' : '#2a2a2a'}`,
                    borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 800, color: i === 0 && b.ingresosMes > 0 ? PURPLE : '#666',
                    fontFamily: "'Barlow Condensed', sans-serif"
                  }}>
                    {i === 0 && b.ingresosMes > 0 ? '🏆' : b.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: '#eee', fontSize: 15, fontWeight: 700 }}>{b.nombre}</span>
                      {!b.activa && (
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: '#ef444418', color: '#ef4444', border: '1px solid #ef444444' }}>SUSPENDIDA</span>
                      )}
                    </div>
                    <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>
                      /{b.slug} · {b.barberosActivos} barbero{b.barberosActivos !== 1 ? 's' : ''} activo{b.barberosActivos !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Métricas */}
                <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: b.citasHoy > 0 ? '#4ade80' : '#444', fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1 }}>{b.citasHoy}</p>
                    <p style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginTop: 3 }}>hoy</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: b.pendientes > 0 ? '#f59e0b' : '#444', fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1 }}>{b.pendientes}</p>
                    <p style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginTop: 3 }}>pend.</p>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 70 }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b', fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1 }}>{fmtMoney(b.ingresosMes)}</p>
                    <p style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginTop: 3 }}>mes</p>
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                  <a
                    href={`/${b.slug}/admin`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: 'none', background: `${PURPLE}18`,
                      border: `1px solid ${PURPLE}44`, color: '#c4b5fd',
                      borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700,
                      fontFamily: "'Barlow', sans-serif", whiteSpace: 'nowrap'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconConfiguracion size={13} glow={false} color="#c4b5fd" />Panel admin</span>
                  </a>
                  <a
                    href={`/${b.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Así ven tu barbería los clientes"
                    style={{
                      textDecoration: 'none', background: '#2a2a2a',
                      border: '1px solid #3a3a3a', color: '#aaa',
                      borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700,
                      fontFamily: "'Barlow', sans-serif", whiteSpace: 'nowrap'
                    }}
                  >
                    👤 Ver como cliente
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/${b.slug}/cliente`);
                      setCopied(b.slug);
                      setTimeout(() => setCopied(null), 2000);
                    }}
                    title="Copiar el link de agendar para compartirlo con clientes"
                    style={{
                      background: copied === b.slug ? '#10b98122' : 'transparent',
                      border: `1px solid ${copied === b.slug ? '#10b98155' : '#3a3a3a'}`,
                      color: copied === b.slug ? '#10b981' : '#aaa',
                      borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', fontFamily: "'Barlow', sans-serif", whiteSpace: 'nowrap',
                      transition: 'all 0.15s'
                    }}
                  >
                    {copied === b.slug ? '✓ Copiado' : '🔗 Copiar link de citas'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {branches.length === 0 && (
            <div style={{ color: '#555', textAlign: 'center', padding: '50px 20px', background: '#111', border: '1px dashed #2a2a2a', borderRadius: 14, fontSize: 14 }}>
              Tu grupo no tiene sucursales asignadas aún.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// COMPONENTE PRINCIPAL
// =========================================================
export default function GroupPanel() {
  const [authState, setAuthState] = useState('loading');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthState(u ? 'logged-in' : 'logged-out');
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setAuthState('logged-out');
  };

  if (authState === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#555', fontSize: 14 }}>Cargando…</div>
      </div>
    );
  }

  if (authState === 'logged-out') {
    return <GroupLogin onLogin={() => setAuthState('logged-in')} />;
  }

  return <GroupDashboard user={user} onLogout={handleLogout} />;
}
