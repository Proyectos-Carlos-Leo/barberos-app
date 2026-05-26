import { useParams } from 'react-router-dom';
import { AppProvider, useApp } from '../context/AppContext';
import NotFound from './NotFound';

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#0a0a0a'
    }}>
      <div style={{
        width: 56, height: 56,
        border: '3px solid #222',
        borderTop: '3px solid #36B1DF',
        borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 20
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#555', fontSize: 14, fontFamily: "'Barlow', sans-serif" }}>Cargando barbería...</p>
    </div>
  );
}

function SuspendedScreen() {
  const { barbershopConfig } = useApp();
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: "'Barlow', sans-serif"
    }}>
      <div style={{ maxWidth: 500, textAlign: 'center' }}>

        {/* Ícono */}
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'rgba(239,68,68,0.2)',
          border: '2px solid rgba(239,68,68,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 32px',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="4" width="4" height="16" rx="1" fill="#ef4444"/>
            <rect x="14" y="4" width="4" height="16" rx="1" fill="#ef4444"/>
          </svg>
        </div>

        {/* Nombre */}
        {barbershopConfig?.nombre && (
          <p style={{
            color: '#888', fontSize: 13, marginBottom: 10,
            textTransform: 'uppercase', letterSpacing: 3, fontWeight: 600
          }}>
            {barbershopConfig.nombre}
          </p>
        )}

        {/* Título */}
        <h1 style={{
          color: '#ffffff', fontSize: 30, fontWeight: 800,
          fontFamily: "'Barlow Condensed', sans-serif",
          textTransform: 'uppercase', letterSpacing: 1,
          marginBottom: 20, lineHeight: 1.1
        }}>
          Servicio Temporalmente<br/>Suspendido
        </h1>

        {/* Línea roja decorativa */}
        <div style={{
          width: 60, height: 3, background: '#ef4444',
          borderRadius: 2, margin: '0 auto 24px'
        }} />

        {/* Descripción */}
        <p style={{
          color: '#aaa', fontSize: 15, lineHeight: 1.8, marginBottom: 36
        }}>
          Esta barbería no está disponible en este momento.<br/>
          Si eres el administrador, comunícate con nosotros para reactivar tu cuenta.
        </p>

        {/* Card de contacto */}
        <div style={{
          background: '#141414',
          border: '1px solid #2a2a2a',
          borderRadius: 14, padding: '24px 28px'
        }}>
          <p style={{
            color: '#555', fontSize: 11, marginBottom: 14,
            textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700
          }}>
            Contacto de Soporte
          </p>
          <a
            href="mailto:soporte@barberos.app"
            style={{
              color: '#36B1DF', fontSize: 17, fontWeight: 700,
              textDecoration: 'none', display: 'block', marginBottom: 8,
              letterSpacing: 0.3
            }}
          >
            soporte@barberos.app
          </a>
          <p style={{ color: '#444', fontSize: 12, marginTop: 16 }}>
            Powered by <span style={{ color: '#36B1DF', fontWeight: 700 }}>BarberOS</span> by MBT
          </p>
        </div>

      </div>
    </div>
  );
}

function SlugGuard({ children }) {
  const { loading, notFound, suspended } = useApp();
  if (loading) return <LoadingScreen />;
  if (notFound) return <NotFound />;
  if (suspended) return <SuspendedScreen />;
  return children;
}

export default function SlugWrapper({ children }) {
  const { slug } = useParams();
  if (!slug) return <NotFound />;
  return (
    <AppProvider slug={slug}>
      <SlugGuard>{children}</SlugGuard>
    </AppProvider>
  );
}
