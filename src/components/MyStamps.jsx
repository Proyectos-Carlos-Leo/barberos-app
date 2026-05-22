import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, onValue, push } from 'firebase/database';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/helpers';

export default function MyStamps() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { appointments, loading, barbershopConfig } = useApp();
  const { theme, toggleTheme } = useTheme();

  const [phone, setPhone] = useState('');
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState(null);
  const [redemptions, setRedemptions] = useState([]);
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Config de lealtad
  const loyaltyConfig = barbershopConfig?.loyalty_config || {};
  const REQUIRED_STAMPS = loyaltyConfig.required_stamps || 10;
  const REWARD_NAME = loyaltyConfig.reward_name || 'Corte gratis';

  const normalizePhone = (p) => (p || '').replace(/[\s\-().]/g, '');

  // Cargar canjes desde Firebase
  useEffect(() => {
    if (!slug) return;
    const unsub = onValue(ref(db, `barberias/${slug}/canjes`), (snap) => {
      const data = snap.val();
      setRedemptions(data ? Object.entries(data).map(([id, v]) => ({ ...v, id })) : []);
    });
    return () => unsub();
  }, [slug]);

  const handleSearch = () => {
    const cleanPhone = phone.trim();
    if (cleanPhone.length < 8) {
      alert('⚠ Ingresa un teléfono válido');
      return;
    }

    const inputPhone = normalizePhone(cleanPhone);

    // Citas completadas
    const completedAppts = appointments.filter(a => {
      const status = (a.status || '').toString().trim().toLowerCase();
      return status === 'completada' && normalizePhone(a.phone) === inputPhone;
    });

    // Canjes aprobados (restan sellos)
    const approvedRedemptions = redemptions.filter(r =>
      r.status === 'aprobado' && normalizePhone(r.phone) === inputPhone
    );

    // Canjes pendientes (informativo)
    const pendingRedemptions = redemptions.filter(r =>
      r.status === 'pendiente' && normalizePhone(r.phone) === inputPhone
    );

    const totalCompleted = completedAppts.length;
    const totalRedeemed = approvedRedemptions.reduce((s, r) => s + (r.stamps_used || REQUIRED_STAMPS), 0);
    const currentStamps = Math.max(0, totalCompleted - totalRedeemed);

    if (totalCompleted === 0) {
      setResult({ stamps: 0, client: null, totalSpent: 0, phone: cleanPhone, hasPending: false, redeemedCount: 0 });
    } else {
      const sorted = [...completedAppts].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setResult({
        stamps: currentStamps,
        client: sorted[0].client,
        totalSpent: completedAppts.reduce((s, a) => s + (a.service?.price || 0), 0),
        phone: sorted[0].phone,
        hasPending: pendingRedemptions.length > 0,
        redeemedCount: approvedRedemptions.length
      });
    }
    setSearched(true);
  };

  const handleNewSearch = () => {
    setPhone('');
    setSearched(false);
    setResult(null);
    setRequestSent(false);
  };

  const handleRequestRedemption = async () => {
    if (!result || result.stamps < REQUIRED_STAMPS) return;
    if (!confirm(`¿Solicitar el canje de "${REWARD_NAME}"?\n\nEl administrador deberá aprobarlo antes de aplicarse.`)) return;
    setRequesting(true);
    try {
      await push(ref(db, `barberias/${slug}/canjes`), {
        client: result.client,
        phone: result.phone,
        reward_requested: REWARD_NAME,
        status: 'pendiente',
        stamps_at_request: result.stamps,
        createdAt: new Date().toISOString()
      });
      setRequestSent(true);
      setResult({ ...result, hasPending: true });
    } catch (err) {
      console.error(err);
      alert('Error al solicitar el canje. Intenta de nuevo.');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)" }}>
        <div style={{ width: 56, height: 56, border: "3px solid var(--border)", borderTop: "3px solid var(--accent)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Bloqueado
  if (barbershopConfig?.lealtad_activa === false) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--bg-main)" }}>
        <div className="fade-in" style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🚫</div>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-primary)", marginBottom: 12 }}>
            Programa no disponible
          </h2>
          <p style={{ color: "var(--text-tertiary)", fontSize: 14, marginBottom: 24 }}>
            Esta barbería no tiene activo el programa de lealtad.
          </p>
          <button className="btn-gold" onClick={() => navigate(`/${slug}`)}>Volver al inicio</button>
        </div>
      </div>
    );
  }

  // Variables visuales
  const stampsInCurrentRow = result?.stamps ? Math.min(result.stamps, REQUIRED_STAMPS) : 0;
  const stampsForNext = result ? Math.max(0, REQUIRED_STAMPS - result.stamps) : REQUIRED_STAMPS;
  const canRedeem = result && result.stamps >= REQUIRED_STAMPS && !result.hasPending;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      position: "relative",
      background: theme === 'dark'
        ? "radial-gradient(ellipse at center, var(--accent-bg) 0%, var(--bg-main) 70%)"
        : "radial-gradient(ellipse at center, #e0f4fc 0%, #f4f6f8 70%)"
    }}>
      <button className="theme-toggle" onClick={toggleTheme} style={{ position: "absolute", top: 20, right: 20 }}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <button onClick={() => navigate(`/${slug}`)} style={{ position: "absolute", top: 20, left: 20, background: "transparent", border: "1px solid var(--border-strong)", color: "var(--text-tertiary)", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
        ← Volver
      </button>

      <div className="fade-in-up" style={{ width: "100%", maxWidth: 460 }}>
        {searched && result ? (
          <div className="card" style={{ padding: 28 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                width: 72, height: 72,
                background: canRedeem ? "linear-gradient(135deg, #f59e0b, #fbbf24)" : "linear-gradient(135deg, #36B1DF, #5FC8EC)",
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", fontSize: 36,
                boxShadow: canRedeem ? "0 8px 24px rgba(245,158,11,0.4)" : "0 8px 24px rgba(54,177,223,0.3)"
              }}>
                {canRedeem ? "🎁" : "🎫"}
              </div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-primary)" }}>
                {result.stamps > 0
                  ? <>Tienes <span className="gold">{result.stamps}</span> sello{result.stamps !== 1 ? 's' : ''}</>
                  : <><span className="gold">Sin</span> sellos todavía</>
                }
              </h2>
              {result.client && (
                <p style={{ color: "var(--text-tertiary)", fontSize: 14, marginTop: 8 }}>
                  Hola, <strong style={{ color: "var(--text-primary)" }}>{result.client}</strong> 👋
                </p>
              )}
            </div>

            {/* Si tiene canje pendiente */}
            {result.hasPending && (
              <div style={{
                background: "rgba(245,158,11,0.1)",
                border: "1px solid #f59e0b",
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
                textAlign: "center"
              }}>
                <p style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>
                  ⏳ Tienes un canje PENDIENTE de aprobación
                </p>
                <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
                  El administrador lo revisará pronto
                </p>
              </div>
            )}

            {result.stamps > 0 ? (
              <>
                {/* Tarjeta de sellos visual */}
                <div style={{
                  background: "var(--bg-elevated-2)",
                  border: `2px dashed ${canRedeem ? "#f59e0b" : "var(--accent-border)"}`,
                  borderRadius: 14,
                  padding: 18,
                  marginBottom: 20
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                      Tarjeta de lealtad
                    </p>
                    <p style={{ fontSize: 11, color: canRedeem ? "#f59e0b" : "var(--accent)", fontWeight: 700 }}>
                      {stampsInCurrentRow}/{REQUIRED_STAMPS}
                    </p>
                  </div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${Math.min(REQUIRED_STAMPS, 10)}, 1fr)`,
                    gap: 8
                  }}>
                    {Array.from({ length: REQUIRED_STAMPS }).map((_, idx) => {
                      const filled = idx < stampsInCurrentRow;
                      return (
                        <div key={idx} style={{
                          aspectRatio: "1",
                          borderRadius: "50%",
                          background: filled
                            ? (canRedeem ? "linear-gradient(135deg, #f59e0b, #fbbf24)" : "linear-gradient(135deg, #36B1DF, #5FC8EC)")
                            : "var(--bg-track)",
                          border: `2px solid ${filled ? (canRedeem ? "#f59e0b" : "#36B1DF") : "var(--border)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 16,
                          boxShadow: filled ? "0 4px 12px rgba(54,177,223,0.3)" : "none"
                        }}>
                          {filled ? "✂️" : ""}
                        </div>
                      );
                    })}
                  </div>

                  {canRedeem ? (
                    <p style={{ fontSize: 14, color: "#f59e0b", fontWeight: 800, textAlign: "center", marginTop: 14, padding: "10px 12px", background: "rgba(245,158,11,0.15)", borderRadius: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      🎁 ¡Puedes canjear tu {REWARD_NAME}!
                    </p>
                  ) : stampsForNext > 0 && (
                    <p style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700, textAlign: "center", marginTop: 14, padding: "8px 12px", background: "rgba(245,158,11,0.1)", borderRadius: 8 }}>
                      Solo {stampsForNext} {stampsForNext === 1 ? 'sello' : 'sellos'} más para obtener: <strong>{REWARD_NAME}</strong>
                    </p>
                  )}

                  {result.redeemedCount > 0 && (
                    <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 10 }}>
                      🏆 Has canjeado {result.redeemedCount} premio{result.redeemedCount > 1 ? 's' : ''} antes
                    </p>
                  )}
                </div>

                {/* Botón canjear */}
                {canRedeem && !requestSent && (
                  <button
                    onClick={handleRequestRedemption}
                    disabled={requesting}
                    style={{
                      width: "100%",
                      background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                      color: "#0a0a0a",
                      border: "none",
                      borderRadius: 10,
                      padding: "16px 24px",
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: requesting ? "not-allowed" : "pointer",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      letterSpacing: 1.5,
                      textTransform: "uppercase",
                      marginBottom: 16,
                      boxShadow: "0 6px 20px rgba(245,158,11,0.4)",
                      transition: "all 0.2s"
                    }}
                  >
                    {requesting ? 'Enviando...' : `🎁 Canjear mi ${REWARD_NAME}`}
                  </button>
                )}

                {requestSent && (
                  <div style={{
                    background: "var(--success-bg)",
                    border: "1px solid var(--success)",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                    textAlign: "center"
                  }}>
                    <p style={{ fontSize: 14, color: "var(--success)", fontWeight: 700, marginBottom: 4 }}>
                      ✓ Solicitud enviada
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                      El administrador revisará tu canje pronto. Muestra esta pantalla al pasar.
                    </p>
                  </div>
                )}

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                  <div style={{ background: "var(--bg-elevated-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Total gastado</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "var(--accent)", fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {formatCurrency(result.totalSpent)}
                    </p>
                  </div>
                  <div style={{ background: "var(--bg-elevated-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Visitas totales</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#4ade80", fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {result.stamps + (result.redeemedCount * REQUIRED_STAMPS)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ background: "var(--bg-elevated-2)", border: "1px dashed var(--border-strong)", borderRadius: 12, padding: 24, textAlign: "center", marginBottom: 20 }}>
                <p style={{ fontSize: 14, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
                  Cada vez que vengas a cortarte y completes tu cita, ganarás <strong style={{ color: "var(--accent)" }}>1 sello</strong>.
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>
                  Junta {REQUIRED_STAMPS} sellos y obtén <strong style={{ color: "#f59e0b" }}>{REWARD_NAME}</strong> 🎁
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-ghost" onClick={handleNewSearch} style={{ flex: 1 }}>Buscar otro</button>
              <button className="btn-gold" onClick={() => navigate(`/${slug}/cliente`)} style={{ flex: 1 }}>
                {result.stamps > 0 ? 'Agendar otra cita' : 'Agendar mi 1ra cita'}
              </button>
            </div>
          </div>
        ) : (
          /* Form */
          <div className="card" style={{ padding: 28 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, background: "linear-gradient(135deg, var(--accent), var(--accent-light))", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 32 }}>🎫</div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-primary)", marginBottom: 6 }}>
                Mis <span className="gold">sellos</span>
              </h2>
              <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
                {REQUIRED_STAMPS} sellos = {REWARD_NAME}
              </p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Tu teléfono *
              </label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="81 1234 5678"
                type="tel"
                autoFocus
              />
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                El mismo que usaste al agendar tus citas
              </p>
            </div>

            <button className="btn-gold" onClick={handleSearch} disabled={!phone} style={{ width: "100%" }}>
              🔍 Ver mis sellos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
