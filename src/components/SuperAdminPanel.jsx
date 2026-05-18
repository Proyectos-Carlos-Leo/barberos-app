import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../firebase';

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
          BarberOS <span style={{ color: '#36B1DF' }}>Admin</span>
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
              background: loading ? '#222' : 'linear-gradient(135deg, #36B1DF, #5FC8EC)',
              color: loading ? '#555' : '#0a0a0a',
              border: 'none', borderRadius: 8, padding: '14px 24px',
              fontSize: 15, fontWeight: 700, letterSpacing: 0.5,
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase'
            }}
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// PANEL PRINCIPAL (SIMPLIFICADO)
// =========================================================
function SuperAdminDashboard({ onLogout }) {
  const [barberias, setBarberias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'barberias'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(slug => ({
          slug,
          nombre: data[slug]?.config?.nombre || slug,
          email_admin: data[slug]?.config?.email_admin || '—'
        }));
        setBarberias(list.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      fontFamily: "'Barlow', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        background: '#141414', borderBottom: '1px solid #1f1f1f',
        padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40, height: 40,
            background: 'linear-gradient(135deg, #36B1DF, #5FC8EC)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#0a0a0a">
              <path d="M12 1C8.676 1 6 3.676 6 7v1H4v15h16V8h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v1H8V7c0-2.276 1.724-4 4-4zm0 9a2 2 0 110 4 2 2 0 010-4z"/>
            </svg>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, fontFamily: "'Barlow Condensed', sans-serif" }}>BarberOS</div>
            <div style={{ color: '#555', fontSize: 12 }}>Panel de Fundadores</div>
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            background: 'transparent', border: '1px solid #2a2a2a',
            color: '#666', borderRadius: 8, padding: '8px 16px',
            fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
            fontFamily: "'Barlow', sans-serif"
          }}
          onMouseEnter={e => { e.target.style.borderColor = '#ef4444'; e.target.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.target.style.borderColor = '#2a2a2a'; e.target.style.color = '#666'; }}
        >
          Cerrar sesión
        </button>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Stat card */}
        <div style={{
          background: '#141414', border: '1px solid #1f1f1f',
          borderRadius: 14, padding: '20px 24px', marginBottom: 32
        }}>
          <div style={{ fontSize: 14, color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
            Total de barberías
          </div>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#36B1DF', fontFamily: "'Barlow Condensed', sans-serif" }}>
            {barberias.length}
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ color: '#555', textAlign: 'center', padding: 60, fontSize: 14 }}>
            Cargando...
          </div>
        ) : barberias.length === 0 ? (
          <div style={{ color: '#555', textAlign: 'center', padding: 60, fontSize: 14 }}>
            No hay barberías registradas aún
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 14, color: '#555', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
              Listado
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {barberias.map((barber, i) => (
                <a
                  key={i}
                  href={`/${barber.slug}/admin`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: 'none',
                    background: '#141414', border: '1px solid #1f1f1f',
                    borderRadius: 10, padding: '16px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'border-color 0.2s, background 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#36B1DF';
                    e.currentTarget.style.background = '#1a1a1a';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#1f1f1f';
                    e.currentTarget.style.background = '#141414';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <div style={{
                      width: 36, height: 36,
                      background: '#36B1DF22', border: '1px solid #36B1DF44',
                      borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 800, color: '#36B1DF', flexShrink: 0
                    }}>
                      {barber.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ color: '#ccc', fontSize: 14, fontWeight: 600 }}>
                        {barber.nombre}
                      </div>
                      <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>
                        /{barber.slug} · {barber.email_admin}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      background: '#36B1DF15', border: '1px solid #36B1DF30',
                      borderRadius: 6, padding: '4px 12px',
                      fontSize: 11, color: '#36B1DF', fontWeight: 600
                    }}>
                      ✓ Activa
                    </div>
                    <span style={{ color: '#555', fontSize: 18, lineHeight: 1 }}>→</span>
                  </div>
                </a>
              ))}
            </div>
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
