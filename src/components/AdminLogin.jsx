import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Completa todos los campos');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (err) {
      let msg = 'Error al iniciar sesión';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Email o contraseña incorrectos';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'Usuario no registrado';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Email inválido';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Demasiados intentos, espera un momento';
      }
      setError(msg);
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: "'Barlow', sans-serif"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@700;800&display=swap" rel="stylesheet" />

      <div className="fade-in" style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72,
          background: 'linear-gradient(135deg, #36B1DF, #5FC8EC)',
          borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          boxShadow: '0 10px 40px rgba(201,168,76,0.3)'
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="#0a0a0a">
            <path d="M12 1C8.676 1 6 3.676 6 7v1H4v15h16V8h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v1H8V7c0-2.276 1.724-4 4-4zm0 9a2 2 0 110 4 2 2 0 010-4z"/>
          </svg>
        </div>

        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 36, fontWeight: 800, letterSpacing: 2,
          textTransform: 'uppercase', color: '#f5f0eb', marginBottom: 8
        }}>
          Acceso <span style={{ color: '#36B1DF' }}>Admin</span>
        </h1>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 36 }}>
          Solo el dueño puede entrar aquí
        </p>

        <div style={{
          background: '#141414', border: '1px solid #222',
          borderRadius: 16, padding: 32
        }}>
          {/* Email */}
          <div style={{ marginBottom: 16, textAlign: 'left' }}>
            <label style={{
              fontSize: 11, color: '#888', display: 'block',
              marginBottom: 8, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 0.5
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={handleKey}
              placeholder="tu@email.com"
              autoFocus
              autoComplete="email"
              style={{
                background: '#1a1a1a', color: '#f5f0eb',
                border: `1px solid ${error ? '#dc2626' : '#2e2e2e'}`,
                borderRadius: 8, padding: '12px 16px',
                width: '100%', fontFamily: "'Barlow', sans-serif",
                fontSize: 15, outline: 'none'
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20, textAlign: 'left' }}>
            <label style={{
              fontSize: 11, color: '#888', display: 'block',
              marginBottom: 8, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 0.5
            }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={handleKey}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{
                background: '#1a1a1a', color: '#f5f0eb',
                border: `1px solid ${error ? '#dc2626' : '#2e2e2e'}`,
                borderRadius: 8, padding: '12px 16px',
                width: '100%', fontFamily: "'Barlow', sans-serif",
                fontSize: 15, outline: 'none', letterSpacing: 4
              }}
            />
            {error && (
              <p style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>
                ⚠ {error}
              </p>
            )}
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#2e2e2e' : 'linear-gradient(135deg, #36B1DF, #5FC8EC)',
              color: loading ? '#888' : '#0a0a0a',
              border: 'none', borderRadius: 8,
              padding: '14px 24px',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 16, fontWeight: 700,
              letterSpacing: 1, textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Verificando...' : 'Entrar al Panel'}
          </button>
        </div>

        <p style={{ color: '#444', fontSize: 12, marginTop: 24 }}>
          ¿Eres cliente?{' '}
          <a href="/cliente" style={{ color: '#36B1DF' }}>
            Agenda tu cita aquí
          </a>
        </p>
      </div>
    </div>
  );
}
