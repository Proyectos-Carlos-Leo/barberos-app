import { useParams } from 'react-router-dom';
import { AppProvider, useApp } from '../context/AppContext';
import NotFound from './NotFound';

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)'
    }}>
      <div style={{
        width: 56, height: 56,
        border: '3px solid var(--border)',
        borderTop: '3px solid var(--accent)',
        borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 20
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Cargando barbería...</p>
    </div>
  );
}

function SuspendedScreen() {
  const { barbershopConfig } = useApp();
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: "'Barlow', sans-serif"
    }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        {/* Ícono */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: '#ef444415', border: '2px solid #ef444440',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px', fontSize: 36
        }}>
          ⏸
        </div>

        {/* Nombre de la barbería */}
        {barbershopConfig?.nombre && (
          <p style={{ color: '#555', fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>
            {barbershopConfig.nombre}
          </p>
        )}

        {/* Título */}
        <h1 style={{
          color: '#fff', fontSize: 28, fontWeight: 800,
          fontFamily: "'Barlow Condensed', sans-serif",
          textTransform: 'uppercase', letterSpacing: 1,
          marginBottom: 16
        }}>
          Servicio Temporalmente Suspendido
        </h1>

        {/* Descripción */}
        <p style={{
          color: '#666', fontSize: 15, lineHeight: 1.7, marginBottom: 32
        }}>
          Esta barbería no está disponible en este momento. Si eres el administrador de este negocio, comunícate con nosotros para reactivar tu cuenta.
        </p>

        {/* Contacto */}
        <div style={{
          background: '#141414', border: '1px solid #1f1f1f',
          borderRadius: 12, padding: 20
        }}>
          <p style={{ color: '#555', fontSize: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Contacto
          </p>
          <a
            href="mailto:soporte@barberos.app"
            style={{
              color: '#36B1DF', fontSize: 15, fontWeight: 600,
              textDecoration: 'none', display: 'block', marginBottom: 4
            }}
          >
            soporte@barberos.app
          </a>
          <p style={{ color: '#444', fontSize: 12 }}>
            Powered by BarberOS by MBT
          </p>
        </div>
      </div>
    </div>
  );
}

function SlugGuard({ isAdmin, children }) {
  const { loading, notFound, suspended } = useApp();
  if (loading) return <LoadingScreen />;
  if (notFound) return <NotFound />;
  // Admin puede ver aunque esté suspendida (para gestionar)
  if (suspended && !isAdmin) return <SuspendedScreen />;
  return children;
}

export default function SlugWrapper({ children, isAdmin = false }) {
  const { slug } = useParams();
  if (!slug) return <NotFound />;
  return (
    <AppProvider slug={slug}>
      <SlugGuard isAdmin={isAdmin}>{children}</SlugGuard>
    </AppProvider>
  );
}
