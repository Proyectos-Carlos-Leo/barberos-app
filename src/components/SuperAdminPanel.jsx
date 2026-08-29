import { useState, useEffect, useMemo } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, update, set, remove } from 'firebase/database';
import { auth, db } from '../firebase';
import { PLANS } from '../utils/plans';
import { emailToGroupId } from './GroupPanel';
import { IconConfiguracion, IconBarberia, IconGrupo, IconBuscar, IconClienteJoven, IconEliminar, IconAgregar, PLAN_ICON_MAP, IconPremium } from './icons/BrandIcons';

const FOUNDER_UIDS = [
  'p8knfgFj1OXQkS6xKHSjtkPXEG43',
  'DFOJycimNmTyxBWVoMgESgXkP5p1',
];

const todayStr = () => new Date().toISOString().split('T')[0];

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
      padding: 20, fontFamily: "'Barlow', sans-serif"
    }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
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
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 28, fontWeight: 800, letterSpacing: 1,
          color: '#fff', marginBottom: 8, textTransform: 'uppercase'
        }}>
          BarberOS <span style={{ color: '#36B1DF' }}>by MBT</span>
        </h1>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 36 }}>
          Panel de fundadores
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
              background: loading ? '#1a5a75' : 'linear-gradient(135deg, #36B1DF, #5FC8EC)',
              color: '#0a0a0a', border: 'none', borderRadius: 10,
              padding: '13px 0', fontSize: 15, fontWeight: 800,
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: 'uppercase', letterSpacing: 1,
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>

        <p style={{ color: '#333', fontSize: 11, marginTop: 24 }}>
          Acceso restringido · Solo fundadores autorizados
        </p>
      </div>
    </div>
  );
}

// =========================================================
// SWITCH — toggle compacto reutilizable
// =========================================================
function Switch({ on, onToggle, label, activeColor = '#36B1DF', title }) {
  return (
    <button
      onClick={onToggle}
      title={title || label}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px',
        fontFamily: "'Barlow', sans-serif"
      }}
    >
      <span style={{
        width: 36, height: 20, borderRadius: 20, position: 'relative',
        background: on ? activeColor : '#2a2a2a',
        border: `1px solid ${on ? activeColor : '#3a3a3a'}`,
        transition: 'background 0.2s, border-color 0.2s',
        display: 'inline-block', flexShrink: 0
      }}>
        <span style={{
          position: 'absolute', top: 2, left: on ? 17 : 2,
          width: 14, height: 14, borderRadius: '50%',
          background: on ? '#0a0a0a' : '#666',
          transition: 'left 0.2s, background 0.2s'
        }} />
      </span>
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
        color: on ? activeColor : '#555', whiteSpace: 'nowrap'
      }}>{label}</span>
    </button>
  );
}

// =========================================================
// STAT — tarjeta de métrica global
// =========================================================
function GlobalStat({ label, value, sub, color = '#36B1DF' }) {
  return (
    <div style={{
      background: '#141414', border: '1px solid #1f1f1f',
      borderRadius: 14, padding: '16px 20px', minWidth: 0
    }}>
      <p style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontSize: 32, fontWeight: 800, color, fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: '#444', marginTop: 5 }}>{sub}</p>}
    </div>
  );
}

// =========================================================
// PANEL PRINCIPAL
// =========================================================
function SuperAdminDashboard({ onLogout }) {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | activas | suspendidas
  const [expanded, setExpanded] = useState(null);
  const [panelView, setPanelView] = useState('barberias'); // barberias | grupos

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'barberias'), (snapshot) => {
      setRawData(snapshot.val() || {});
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Derivar lista + métricas de todo el snapshot (citas incluidas)
  const { barberias, globals } = useMemo(() => {
    const hoy = todayStr();
    const list = [];
    let citasTotal = 0, citasHoy = 0, ingresosTotal = 0;

    Object.keys(rawData || {}).forEach(slug => {
      const node = rawData[slug] || {};
      const cfg = node.config || {};
      const citas = node.citas ? Object.values(node.citas) : [];
      const nBarberos = node.barberos ? Object.keys(node.barberos).length : 0;

      const cHoy = citas.filter(c => c.date === hoy && c.status !== 'cancelada').length;
      const cCompletadas = citas.filter(c => c.status === 'completada');
      const ingresos = cCompletadas.reduce((s, c) => s + (c.service?.price || 0) + (c.totalProductos || 0), 0);

      citasTotal += citas.length;
      citasHoy += cHoy;
      ingresosTotal += ingresos;

      list.push({
        slug,
        nombre: cfg.nombre || slug,
        email_admin: cfg.email_admin || '—',
        lealtad_activa: cfg.lealtad_activa !== false,
        productos_activos: cfg.productos_activos !== false,
        idioma: cfg.idioma || 'es',
        activa: cfg.activa !== false,
        plan: cfg.plan || 'premium',
        gcalConnected: !!cfg.google_calendar_connected,
        citasTotal: citas.length,
        citasHoy: cHoy,
        citasCompletadas: cCompletadas.length,
        ingresos,
        nBarberos,
      });
    });

    list.sort((a, b) => a.nombre.localeCompare(b.nombre));
    const activas = list.filter(b => b.activa).length;
    return {
      barberias: list,
      globals: { total: list.length, activas, suspendidas: list.length - activas, citasTotal, citasHoy, ingresosTotal }
    };
  }, [rawData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return barberias.filter(b => {
      if (statusFilter === 'activas' && !b.activa) return false;
      if (statusFilter === 'suspendidas' && b.activa) return false;
      if (q && !b.nombre.toLowerCase().includes(q) && !b.slug.toLowerCase().includes(q) && !b.email_admin.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [barberias, search, statusFilter]);

  const toggleField = async (slug, field, value) => {
    try {
      await update(ref(db, `barberias/${slug}/config`), { [field]: value });
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar. Verifica las reglas de Firebase.');
    }
  };

  const toggleActiva = async (slug, currentValue) => {
    const nombre = barberias.find(b => b.slug === slug)?.nombre || slug;
    const msg = currentValue
      ? `Suspender la barbería "${nombre}"?\n\nSu página quedará inaccesible hasta que la reactives.`
      : `Activar la barbería "${nombre}"?\n\nSu página será accesible nuevamente.`;
    if (!window.confirm(msg)) return;
    toggleField(slug, 'activa', !currentValue);
  };

  const fmtMoney = n => `$${n.toLocaleString('es-MX')}`;

  const chipStyle = (active) => ({
    background: active ? '#36B1DF' : 'transparent',
    border: `1px solid ${active ? '#36B1DF' : '#2a2a2a'}`,
    color: active ? '#0a0a0a' : '#777',
    borderRadius: 20, padding: '6px 14px',
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Barlow', sans-serif",
    transition: 'all 0.15s', whiteSpace: 'nowrap'
  });

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      fontFamily: "'Barlow', sans-serif"
    }}>
      {/* ── Header ── */}
      <div style={{
        background: 'rgba(20,20,20,0.92)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #1f1f1f',
        padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10, gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <div style={{
            width: 40, height: 40, flexShrink: 0,
            background: 'linear-gradient(135deg, #36B1DF, #5FC8EC)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#0a0a0a">
              <path d="M12 1C8.676 1 6 3.676 6 7v1H4v15h16V8h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v1H8V7c0-2.276 1.724-4 4-4zm0 9a2 2 0 110 4 2 2 0 010-4z"/>
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, fontFamily: "'Barlow Condensed', sans-serif", whiteSpace: 'nowrap' }}>
              BarberOS <span style={{ color: '#36B1DF', fontSize: 14 }}>by MBT</span>
            </div>
            <div style={{ color: '#555', fontSize: 12 }}>Panel de Fundadores</div>
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            background: 'transparent', border: '1px solid #2a2a2a',
            color: '#666', borderRadius: 8, padding: '8px 16px',
            fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
            fontFamily: "'Barlow', sans-serif", flexShrink: 0
          }}
          onMouseEnter={e => { e.target.style.borderColor = '#ef4444'; e.target.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.target.style.borderColor = '#2a2a2a'; e.target.style.color = '#666'; }}
        >
          Cerrar sesión
        </button>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* ── Métricas globales ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12, marginBottom: 28
        }}>
          <GlobalStat label="Barberías" value={globals.total} sub={`${globals.activas} activas · ${globals.suspendidas} suspendidas`} />
          <GlobalStat label="Citas hoy" value={globals.citasHoy} sub="En todo el sistema" color="#4ade80" />
          <GlobalStat label="Citas históricas" value={globals.citasTotal.toLocaleString('es-MX')} sub="Desde el inicio" color="#a78bfa" />
          <GlobalStat label="Ingresos procesados" value={fmtMoney(globals.ingresosTotal)} sub="Citas completadas" color="#f59e0b" />
        </div>

        {/* ── Selector de sección ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
          {[
            { key: 'barberias', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><IconBarberia size={14} glow={false} />Barberías</span> },
            { key: 'grupos', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><IconGrupo size={14} glow={false} />Grupos Multi-Sucursal</span> },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => setPanelView(v.key)}
              style={{
                background: panelView === v.key ? '#a78bfa' : 'transparent',
                border: `1px solid ${panelView === v.key ? '#a78bfa' : '#2a2a2a'}`,
                color: panelView === v.key ? '#0a0a0a' : '#777',
                borderRadius: 10, padding: '9px 18px',
                fontSize: 13, fontWeight: 800, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif",
                textTransform: 'uppercase', letterSpacing: 0.5,
                transition: 'all 0.15s'
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        {panelView === 'grupos' && <GroupsManager allBarberias={barberias} />}

        {panelView === 'barberias' && (<>
        {/* ── Buscador + filtros ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><IconBuscar size={14} glow={false} color="#555" /></span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, slug o email…"
              style={{
                background: '#141414', color: '#fff',
                border: '1px solid #2a2a2a', borderRadius: 10,
                padding: '11px 14px 11px 38px', width: '100%',
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
                fontFamily: "'Barlow', sans-serif"
              }}
              onFocus={e => e.target.style.borderColor = '#36B1DF'}
              onBlur={e => e.target.style.borderColor = '#2a2a2a'}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={chipStyle(statusFilter === 'all')} onClick={() => setStatusFilter('all')}>Todas</button>
            <button style={chipStyle(statusFilter === 'activas')} onClick={() => setStatusFilter('activas')}>Activas</button>
            <button style={chipStyle(statusFilter === 'suspendidas')} onClick={() => setStatusFilter('suspendidas')}>Suspendidas</button>
          </div>
        </div>

        {/* ── Lista ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 60 }}>
            <div className="spinner" />
            <div style={{ color: '#555', fontSize: 14 }}>Cargando…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            color: '#555', textAlign: 'center', padding: '60px 20px',
            background: '#111', border: '1px dashed #2a2a2a', borderRadius: 14
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><IconBuscar size={32} glow={false} color="#555" /></div>
            <p style={{ fontSize: 14, marginBottom: 4 }}>
              {barberias.length === 0 ? 'No hay barberías registradas aún' : 'Sin resultados con estos filtros'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#36B1DF', fontSize: 13, cursor: 'pointer', fontFamily: "'Barlow', sans-serif" }}>
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, color: '#444', fontWeight: 600 }}>
              {filtered.length} {filtered.length === 1 ? 'barbería' : 'barberías'}
            </p>

            {filtered.map((b) => {
              const isOpen = expanded === b.slug;
              return (
                <div key={b.slug} style={{
                  background: '#141414',
                  border: `1px solid ${isOpen ? '#36B1DF44' : '#1f1f1f'}`,
                  borderRadius: 12,
                  transition: 'border-color 0.2s',
                  opacity: b.activa ? 1 : 0.65
                }}>
                  {/* Fila principal (clickable para expandir) */}
                  <div
                    onClick={() => setExpanded(isOpen ? null : b.slug)}
                    style={{
                      padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 14,
                      cursor: 'pointer', flexWrap: 'wrap'
                    }}
                  >
                    {/* Avatar + nombre */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 220px', minWidth: 0 }}>
                      <div style={{
                        width: 40, height: 40, flexShrink: 0,
                        background: b.activa ? '#36B1DF18' : '#2a2a2a',
                        border: `1px solid ${b.activa ? '#36B1DF44' : '#3a3a3a'}`,
                        borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 17, fontWeight: 800, color: b.activa ? '#36B1DF' : '#666',
                        fontFamily: "'Barlow Condensed', sans-serif"
                      }}>
                        {b.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ color: '#eee', fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {b.nombre}
                          </span>
                          {!b.activa && (
                            <span style={{
                              fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
                              background: '#ef444418', color: '#ef4444', border: '1px solid #ef444444',
                              letterSpacing: 0.5
                            }}>SUSPENDIDA</span>
                          )}
                          {b.gcalConnected && (
                            <span title="Google Calendar conectado" style={{
                              fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20,
                              background: '#4285F418', color: '#4285F4', border: '1px solid #4285F444'
                            }}>GCAL</span>
                          )}
                          {(() => {
                            const p = PLANS[b.plan] || PLANS.premium;
                            return (
                              <span title={`Plan ${p.nombre}`} style={{
                                fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
                                background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}44`,
                                letterSpacing: 0.5, textTransform: 'uppercase',
                                display: 'inline-flex', alignItems: 'center', gap: 4
                              }}>{(() => { const PlanIcon = PLAN_ICON_MAP[p.id] || IconPremium; return <PlanIcon size={10} glow={false} color={p.color} />; })()} {p.nombre}</span>
                            );
                          })()}
                        </div>
                        <div style={{ color: '#555', fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          /{b.slug} · {b.email_admin}
                        </div>
                      </div>
                    </div>

                    {/* Mini métricas */}
                    <div style={{ display: 'flex', gap: 18, flexShrink: 0, alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 18, fontWeight: 800, color: b.citasHoy > 0 ? '#4ade80' : '#444', fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1 }}>
                          {b.citasHoy}
                        </p>
                        <p style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginTop: 3 }}>hoy</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 18, fontWeight: 800, color: '#888', fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1 }}>
                          {b.citasTotal}
                        </p>
                        <p style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginTop: 3 }}>citas</p>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: 64 }}>
                        <p style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b', fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1 }}>
                          {fmtMoney(b.ingresos)}
                        </p>
                        <p style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginTop: 3 }}>ingresos</p>
                      </div>
                      <span style={{
                        color: '#444', fontSize: 12, transition: 'transform 0.2s',
                        transform: isOpen ? 'rotate(180deg)' : 'none'
                      }}>▼</span>
                    </div>
                  </div>

                  {/* Panel expandido: controles */}
                  {isOpen && (
                    <>
                    {/* Selector de plan */}
                    <div style={{
                      borderTop: '1px solid #1f1f1f',
                      padding: '12px 16px',
                      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Plan
                      </span>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {Object.values(PLANS).map(p => {
                          const active = (b.plan || 'premium') === p.id;
                          return (
                            <button
                              key={p.id}
                              onClick={(e) => { e.stopPropagation(); toggleField(b.slug, 'plan', p.id); }}
                              title={p.maxBarberos === null
                                ? `${p.nombre}: barberos y citas ilimitadas`
                                : `${p.nombre}: ${p.maxBarberos} barbero(s), ${p.maxCitasMes} citas/mes`}
                              style={{
                                background: active ? p.color : 'transparent',
                                border: `1px solid ${active ? p.color : '#2a2a2a'}`,
                                color: active ? '#0a0a0a' : '#777',
                                borderRadius: 20, padding: '5px 12px',
                                fontSize: 11, fontWeight: 800, cursor: 'pointer',
                                fontFamily: "'Barlow', sans-serif",
                                transition: 'all 0.15s', whiteSpace: 'nowrap'
                              }}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                {(() => { const PlanIcon = PLAN_ICON_MAP[p.id] || IconPremium; return <PlanIcon size={12} glow={false} color={active ? '#0a0a0a' : p.color} />; })()}
                                {p.nombre}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {(() => {
                        const p = PLANS[b.plan] || PLANS.premium;
                        return (
                          <span style={{ fontSize: 10, color: '#444', marginLeft: 'auto' }}>
                            {p.maxBarberos === null ? '∞ barberos' : `máx ${p.maxBarberos} barbero(s)`}
                            {' · '}
                            {p.maxCitasMes === null ? '∞ citas/mes' : `máx ${p.maxCitasMes} citas/mes`}
                            {' · '}
                            {p.reportes ? '✓ reportes' : '✗ reportes'}
                            {' · '}
                            {p.lealtad ? '✓ lealtad' : '✗ lealtad'}
                          </span>
                        );
                      })()}
                    </div>

                    <div style={{
                      borderTop: '1px solid #1f1f1f',
                      padding: '14px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 16, flexWrap: 'wrap'
                    }}>
                      {/* Switches */}
                      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                        <Switch
                          on={b.lealtad_activa}
                          onToggle={() => toggleField(b.slug, 'lealtad_activa', !b.lealtad_activa)}
                          label="Lealtad"
                          activeColor="#f59e0b"
                        />
                        <Switch
                          on={b.productos_activos}
                          onToggle={() => toggleField(b.slug, 'productos_activos', !b.productos_activos)}
                          label="Productos"
                          activeColor="#a78bfa"
                        />
                        <Switch
                          on={b.idioma === 'en'}
                          onToggle={() => toggleField(b.slug, 'idioma', b.idioma === 'en' ? 'es' : 'en')}
                          label={b.idioma === 'en' ? 'English' : 'Español'}
                          activeColor="#60a5fa"
                          title="Cambiar idioma"
                        />
                      </div>

                      {/* Links + suspender */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <a
                          href={`/${b.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{
                            textDecoration: 'none', background: '#36B1DF15',
                            border: '1px solid #36B1DF44', color: '#5FC8EC',
                            borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            fontFamily: "'Barlow', sans-serif", transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#36B1DF'; e.currentTarget.style.color = '#0a0a0a'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#36B1DF15'; e.currentTarget.style.color = '#5FC8EC'; }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconClienteJoven size={13} glow={false} />Ver como cliente</span>
                        </a>
                        <a
                          href={`/${b.slug}/admin`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{
                            textDecoration: 'none', background: '#2a2a2a',
                            border: '1px solid #3a3a3a', color: '#aaa',
                            borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            fontFamily: "'Barlow', sans-serif", transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#3a3a3a'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#2a2a2a'; e.currentTarget.style.color = '#aaa'; }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconConfiguracion size={13} glow={false} color="#aaa" />Panel admin</span>
                        </a>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleActiva(b.slug, b.activa); }}
                          style={{
                            background: b.activa ? 'transparent' : '#10b98115',
                            border: `1px solid ${b.activa ? '#ef444444' : '#10b98144'}`,
                            color: b.activa ? '#ef4444' : '#10b981',
                            borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700,
                            cursor: 'pointer', fontFamily: "'Barlow', sans-serif",
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => { if (b.activa) e.currentTarget.style.background = '#ef444415'; }}
                          onMouseLeave={e => { if (b.activa) e.currentTarget.style.background = 'transparent'; }}
                        >
                          {b.activa ? '⏸ Suspender' : '▶ Reactivar'}
                        </button>
                      </div>
                    </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </>)}
      </div>
    </div>
  );
}

// =========================================================
// GESTIÓN DE GRUPOS MULTI-SUCURSAL
// =========================================================
function GroupsManager({ allBarberias }) {
  const [grupos, setGrupos] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({ nombre: '', email: '', slugs: {}, asignarPlan: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, 'grupos'), (snap) => {
      setGrupos(snap.val() || {});
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const toggleFormSlug = (slug) =>
    setForm(f => ({ ...f, slugs: { ...f.slugs, [slug]: !f.slugs[slug] } }));

  const handleCreate = async () => {
    const nombre = form.nombre.trim();
    const email = form.email.trim().toLowerCase();
    const selectedSlugs = Object.keys(form.slugs).filter(s => form.slugs[s]);

    if (!nombre) { alert('Ponle nombre al grupo'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Email del dueño inválido'); return; }
    if (selectedSlugs.length === 0) { alert('Selecciona al menos una barbería'); return; }

    const gid = emailToGroupId(email);
    if (grupos[gid]) { alert('Ya existe un grupo para ese email. Edítalo en la lista.'); return; }

    setSaving(true);
    try {
      const slugsObj = {};
      selectedSlugs.forEach(s => { slugsObj[s] = true; });
      await set(ref(db, `grupos/${gid}`), {
        nombre,
        email_owner: email,
        slugs: slugsObj,
        createdAt: new Date().toISOString(),
      });
      if (form.asignarPlan) {
        await Promise.all(selectedSlugs.map(s =>
          update(ref(db, `barberias/${s}/config`), { plan: 'multisucursal' })
        ));
      }
      setForm({ nombre: '', email: '', slugs: {}, asignarPlan: true });
      setShowForm(false);
    } catch (e) {
      console.error(e);
      alert('Error al crear el grupo. Verifica las reglas de Firebase.');
    } finally {
      setSaving(false);
    }
  };

  const toggleGroupSlug = async (gid, slug, currentlyIn) => {
    try {
      await set(ref(db, `grupos/${gid}/slugs/${slug}`), currentlyIn ? null : true);
    } catch (e) { alert('Error al actualizar el grupo.'); }
  };

  const handleDelete = async (gid, nombre) => {
    if (!window.confirm(`¿Eliminar el grupo "${nombre}"?\n\nLas barberías NO se borran, solo el acceso consolidado del dueño.`)) return;
    try { await remove(ref(db, `grupos/${gid}`)); } catch (e) { alert('Error al eliminar.'); }
  };

  const inputStyle = {
    background: '#0a0a0a', color: '#fff', border: '1px solid #2a2a2a',
    borderRadius: 8, padding: '11px 14px', width: '100%', fontSize: 14,
    outline: 'none', boxSizing: 'border-box', fontFamily: "'Barlow', sans-serif"
  };

  const gruposList = Object.entries(grupos).map(([gid, g]) => ({ gid, ...g }));

  return (
    <div>
      {/* Crear grupo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <p style={{ fontSize: 12, color: '#444', fontWeight: 600 }}>
          {gruposList.length} {gruposList.length === 1 ? 'grupo' : 'grupos'} · El dueño entra en <span style={{ color: '#a78bfa' }}>/mi-grupo</span>
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: showForm ? 'transparent' : 'linear-gradient(135deg, #a78bfa, #c4b5fd)',
            border: showForm ? '1px solid #2a2a2a' : 'none',
            color: showForm ? '#888' : '#0a0a0a',
            borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 800,
            cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: 'uppercase', letterSpacing: 0.5
          }}
        >
          {showForm ? 'Cancelar' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconAgregar size={13} glow={false} />Crear grupo</span>}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#141414', border: '1px solid #a78bfa44', borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 10, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Nombre del grupo</label>
              <input style={inputStyle} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Grupo Barberías del Norte" />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Email del dueño</label>
              <input style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="dueno@grupo.com" type="email" />
            </div>
          </div>

          <label style={{ fontSize: 10, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>Sucursales del grupo</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {allBarberias.map(b => (
              <button
                key={b.slug}
                onClick={() => toggleFormSlug(b.slug)}
                style={{
                  background: form.slugs[b.slug] ? '#a78bfa' : 'transparent',
                  border: `1px solid ${form.slugs[b.slug] ? '#a78bfa' : '#2a2a2a'}`,
                  color: form.slugs[b.slug] ? '#0a0a0a' : '#777',
                  borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'Barlow', sans-serif"
                }}
              >
                {form.slugs[b.slug] ? '✓ ' : ''}{b.nombre}
              </button>
            ))}
            {allBarberias.length === 0 && <span style={{ color: '#555', fontSize: 13 }}>No hay barberías registradas.</span>}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#999', cursor: 'pointer', marginBottom: 16 }}>
            <input
              type="checkbox"
              checked={form.asignarPlan}
              onChange={e => setForm(f => ({ ...f, asignarPlan: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: '#a78bfa' }}
            />
            Asignar plan Multi-Sucursal a las barberías seleccionadas
          </label>

          <p style={{ fontSize: 11, color: '#555', marginBottom: 14 }}>
            ℹ️ El dueño necesita un usuario en Firebase Authentication con ese email para poder entrar a /mi-grupo.
          </p>

          <button
            onClick={handleCreate}
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg, #a78bfa, #c4b5fd)',
              color: '#0a0a0a', border: 'none', borderRadius: 10,
              padding: '11px 24px', fontSize: 13, fontWeight: 800,
              cursor: saving ? 'wait' : 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: 'uppercase', letterSpacing: 0.5
            }}
          >
            {saving ? 'Creando…' : 'Crear grupo'}
          </button>
        </div>
      )}

      {/* Lista de grupos */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40 }}>
          <div className="spinner" />
          <div style={{ color: '#555', fontSize: 14 }}>Cargando…</div>
        </div>
      ) : gruposList.length === 0 && !showForm ? (
        <div style={{ color: '#555', textAlign: 'center', padding: '50px 20px', background: '#111', border: '1px dashed #2a2a2a', borderRadius: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><IconGrupo size={32} glow={false} /></div>
          <p style={{ fontSize: 14 }}>Aún no hay grupos multi-sucursal.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {gruposList.map(g => {
            const isOpen = expanded === g.gid;
            const groupSlugs = Object.keys(g.slugs || {}).filter(s => g.slugs[s]);
            return (
              <div key={g.gid} style={{ background: '#141414', border: `1px solid ${isOpen ? '#a78bfa44' : '#1f1f1f'}`, borderRadius: 12 }}>
                <div
                  onClick={() => setExpanded(isOpen ? null : g.gid)}
                  style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', flexWrap: 'wrap' }}
                >
                  <div style={{
                    width: 40, height: 40, flexShrink: 0,
                    background: '#a78bfa18', border: '1px solid #a78bfa44',
                    borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                  }}><IconGrupo size={18} glow={false} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ color: '#eee', fontSize: 15, fontWeight: 700 }}>{g.nombre}</span>
                    <div style={{ color: '#555', fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.email_owner} · {groupSlugs.length} sucursal{groupSlugs.length !== 1 ? 'es' : ''}
                    </div>
                  </div>
                  <span style={{ color: '#444', fontSize: 12, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid #1f1f1f', padding: '14px 16px' }}>
                    <p style={{ fontSize: 10, color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                      Sucursales (clic para agregar / quitar)
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                      {allBarberias.map(b => {
                        const inGroup = !!(g.slugs && g.slugs[b.slug]);
                        return (
                          <button
                            key={b.slug}
                            onClick={() => toggleGroupSlug(g.gid, b.slug, inGroup)}
                            style={{
                              background: inGroup ? '#a78bfa' : 'transparent',
                              border: `1px solid ${inGroup ? '#a78bfa' : '#2a2a2a'}`,
                              color: inGroup ? '#0a0a0a' : '#777',
                              borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700,
                              cursor: 'pointer', fontFamily: "'Barlow', sans-serif"
                            }}
                          >
                            {inGroup ? '✓ ' : ''}{b.nombre}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => handleDelete(g.gid, g.nombre)}
                      style={{
                        background: 'transparent', border: '1px solid #ef444444', color: '#ef4444',
                        borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', fontFamily: "'Barlow', sans-serif"
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconEliminar size={13} glow={false} />Eliminar grupo</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =========================================================
// COMPONENTE PRINCIPAL
// =========================================================
export default function SuperAdminPanel() {
  const [authState, setAuthState] = useState('loading');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && FOUNDER_UIDS.includes(user.uid)) {
        setAuthState('logged-in');
      } else {
        if (user) await signOut(auth);
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
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16
      }}>
        <div className="spinner" />
        <div style={{ color: '#555', fontSize: 14 }}>Cargando…</div>
      </div>
    );
  }

  if (authState === 'logged-out') {
    return <SuperLogin onLogin={() => setAuthState('logged-in')} />;
  }

  return <SuperAdminDashboard onLogout={handleLogout} />;
}
