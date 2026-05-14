import { useParams } from 'react-router-dom';
import { AppProvider, useApp } from '../context/AppContext';
import NotFound from './NotFound';

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-main)'
    }}>
      <div style={{
        width: 56, height: 56,
        border: '3px solid var(--border)',
        borderTop: '3px solid var(--accent)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: 20
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Cargando barbería...</p>
    </div>
  );
}

function SlugGuard({ children }) {
  const { loading, notFound } = useApp();
  if (loading) return <LoadingScreen />;
  if (notFound) return <NotFound />;
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
