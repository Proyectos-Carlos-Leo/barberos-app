import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      textAlign: 'center'
    }}>
      <div className="fade-in">
        <div style={{
          width: 80, height: 80,
          background: 'var(--accent-bg)',
          border: '2px solid var(--accent-border)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 36
        }}>✂️</div>
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 48, fontWeight: 800,
          letterSpacing: 2, textTransform: 'uppercase',
          color: 'var(--accent)', marginBottom: 12
        }}>404</h1>
        <h2 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 24, fontWeight: 700,
          letterSpacing: 1, textTransform: 'uppercase',
          color: 'var(--text-primary)', marginBottom: 12
        }}>Barbería no encontrada</h2>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 15, marginBottom: 32, maxWidth: 400 }}>
          El link que usaste no existe o la barbería ya no está disponible.
        </p>
        <button className="btn-gold" onClick={() => navigate('/')} style={{ minWidth: 180 }}>
          Ir al inicio
        </button>
      </div>
    </div>
  );
}
