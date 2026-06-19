import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const FUNCTION_BASE = 'https://us-central1-barberos-app-174cb.cloudfunctions.net';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [msg,    setMsg]    = useState('');

  useEffect(() => {
    const code  = searchParams.get('code');
    const state = searchParams.get('state'); // slug
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMsg('Acceso denegado por Google.');
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setMsg('Parámetros inválidos.');
      return;
    }

    // Intercambiar el código por tokens vía Cloud Function
    fetch(`${FUNCTION_BASE}/exchangeGoogleOAuthCode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        slug: state,
        redirect_uri: `${window.location.origin}/oauth/callback`,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setStatus('success');
          // Redirigir al panel después de 2 segundos
          setTimeout(() => navigate(`/${state}/admin/panel`), 2000);
        } else {
          setStatus('error');
          setMsg(data.error || 'Error al conectar con Google Calendar.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMsg('Error de red al conectar con Google.');
      });
  }, []); // eslint-disable-line

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Barlow', sans-serif", padding: 24
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@700;800&display=swap" rel="stylesheet" />

      <div className="fade-in" style={{ textAlign: 'center', maxWidth: 400 }}>

        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%', margin: '0 auto 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
          background: status === 'success' ? 'rgba(74,222,128,0.15)' : status === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(54,177,223,0.15)',
          border: `2px solid ${status === 'success' ? '#4ade80' : status === 'error' ? '#ef4444' : '#36B1DF'}`,
        }}>
          {status === 'loading' && (
            <div style={{
              width: 32, height: 32, border: '3px solid #222',
              borderTop: '3px solid #36B1DF', borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          )}
          {status === 'success' && '✓'}
          {status === 'error'   && '✕'}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* Title */}
        <h2 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 26, fontWeight: 800, letterSpacing: 1,
          textTransform: 'uppercase', color: '#fff', marginBottom: 10
        }}>
          {status === 'loading' && 'Conectando...'}
          {status === 'success' && '¡Conectado! ✓'}
          {status === 'error'   && 'Error'}
        </h2>

        {/* Message */}
        <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.6 }}>
          {status === 'loading' && 'Estamos vinculando tu Google Calendar con BarberOS. Solo un momento…'}
          {status === 'success' && 'Tu Google Calendar está conectado. Las nuevas citas aparecerán ahí automáticamente. Redirigiendo al panel…'}
          {status === 'error'   && (msg || 'Algo salió mal. Intenta de nuevo desde el panel.')}
        </p>

        {/* Google branding */}
        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span style={{ color: '#555', fontSize: 12 }}>Google Calendar · BarberOS by MBT</span>
        </div>
      </div>
    </div>
  );
}
