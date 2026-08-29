import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, onValue, push } from 'firebase/database';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import { useT } from '../utils/i18n';
import { getPlan } from '../utils/plans';
import { IconNavaja, IconBuscar, IconBloquear, IconSol, IconLuna } from './icons/BrandIcons';

const stripEmoji = (str) =>
  String(str || '').replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F]+\s*/u, '');
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/helpers';

export default function MyStamps() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { appointments, loading, barbershopConfig } = useApp();
  const { theme, toggleTheme } = useTheme();
  const t = useT(barbershopConfig?.idioma);

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
  const STAMP_IMAGE = loyaltyConfig.stamp_image || null; // base64 imagen custom

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
      alert(t('⚠ Ingresa un teléfono válido'));
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

    // 🔐 Anti-spam: máximo 1 canje pendiente por teléfono
    const cleanPhone = normalizePhone(result.phone);
    const existingPending = redemptions.filter(r =>
      r.status === 'pendiente' && normalizePhone(r.phone) === cleanPhone
    );
    if (existingPending.length > 0) {
      alert(t('⚠ Ya tienes un canje pendiente. Espera a que el administrador lo revise.'));
      return;
    }

    // 🔐 Anti-spam: máximo 3 canjes pedidos en las últimas 24 hrs
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentRequests = redemptions.filter(r =>
      normalizePhone(r.phone) === cleanPhone &&
      r.createdAt && r.createdAt > oneDayAgo
    );
    if (recentRequests.length >= 3) {
      alert(t('⚠ Demasiadas solicitudes. Intenta de nuevo mañana.'));
      return;
    }

    if (!confirm(`${barbershopConfig?.idioma === 'en' ? 'Request redemption of' : '¿Solicitar el canje de'} "${REWARD_NAME}"?\n\n${t('El administrador deberá aprobarlo antes de aplicarse.')}`)) return;
    setRequesting(true);
    try {
      await push(ref(db, `barberias/${slug}/canjes`), {
        client: result.client.slice(0, 60),
        phone: result.phone.slice(0, 15),
        reward_requested: REWARD_NAME.slice(0, 100),
        status: 'pendiente',
        stamps_at_request: result.stamps,
        createdAt: new Date().toISOString()
      });
      setRequestSent(true);
      setResult({ ...result, hasPending: true });
    } catch (err) {
      console.error(err);
      alert(t('Error al solicitar el canje. Verifica que tengas conexión.'));
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

  // Bloqueado (por preferencia del negocio o porque su plan no incluye lealtad)
  if (barbershopConfig?.lealtad_activa === false || (barbershopConfig && !getPlan(barbershopConfig).lealtad)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--bg-main)" }}>
        <div className="fade-in" style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><IconBloquear size={56} glow={false} /></div>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-primary)", marginBottom: 12 }}>
            {t("Programa no disponible")}
          </h2>
          <p style={{ color: "var(--text-tertiary)", fontSize: 14, marginBottom: 24 }}>
            {t("Esta barbería no tiene activo el programa de lealtad.")}
          </p>
          <button className="btn-gold" onClick={() => navigate(`/${slug}`)}>{t("Volver al inicio")}</button>
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
{theme === 'dark' ? <IconSol size={16} glow={false} /> : <IconLuna size={16} glow={false} />}
      </button>
      <button onClick={() => navigate(`/${slug}`)} style={{ position: "absolute", top: 20, left: 20, background: "transparent", border: "1px solid var(--border-strong)", color: "var(--text-tertiary)", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
        {t("← Volver")}
      </button>

      <div className="fade-in-up" style={{ width: "100%", maxWidth: 460 }}>
        {searched && result ? (
          <div className="card" style={{ padding: 28 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                width: 72, height: 72,
                background: canRedeem ? "linear-gradient(135deg, #f59e0b, #fbbf24)" : "linear-gradient(135deg, var(--accent), var(--accent-light))",
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", fontSize: 36,
                boxShadow: canRedeem ? "0 8px 24px rgba(245,158,11,0.4)" : "0 8px 24px rgba(var(--accent-rgb),0.3)"
              }}>
                {canRedeem ? "🎁" : "🎫"}
              </div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-primary)" }}>
                {result.stamps > 0
                  ? <>{t("Tienes")} <span className="gold">{result.stamps}</span> {t(result.stamps !== 1 ? "sellos" : "sello")}</>
                  : <><span className="gold">{t("Sin")}</span> {t("sellos")} {t("todavía")}</>
                }
              </h2>
              {result.client && (
                <p style={{ color: "var(--text-tertiary)", fontSize: 14, marginTop: 8 }}>
                  {t("Hola,")} <strong style={{ color: "var(--text-primary)" }}>{result.client}</strong> 👋
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
                  {t("⏳ Tienes un canje PENDIENTE de aprobación")}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
                  {t("El administrador lo revisará pronto")}
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
                      {t("Tarjeta de lealtad")}
                    </p>
                    <p style={{ fontSize: 11, color: canRedeem ? "#f59e0b" : "var(--accent)", fontWeight: 700 }}>
                      {stampsInCurrentRow}/{REQUIRED_STAMPS}
                    </p>
                  </div>
                  <div className="stagger" style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${Math.min(REQUIRED_STAMPS, 5)}, minmax(0, 1fr))`,
                    gap: 8
                  }}>
                    {Array.from({ length: REQUIRED_STAMPS }).map((_, idx) => {
                      const filled = idx < stampsInCurrentRow;
                      return (
                        <div key={idx} style={{
                          aspectRatio: "1",
                          borderRadius: "50%",
                          background: filled
                            ? (STAMP_IMAGE ? "transparent" : (canRedeem ? "linear-gradient(135deg, #f59e0b, #fbbf24)" : "linear-gradient(135deg, var(--accent), var(--accent-light))"))
                            : "var(--bg-track)",
                          border: `2px solid ${filled ? (canRedeem ? "#f59e0b" : "var(--accent)") : "var(--border)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 16,
                          boxShadow: filled ? "0 4px 12px rgba(var(--accent-rgb),0.3)" : "none",
                          overflow: "hidden"
                        }}>
                          {filled && STAMP_IMAGE ? (
                            <img src={STAMP_IMAGE} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : filled ? <IconNavaja size={14} glow={false} color="#fff" /> : ""}
                        </div>
                      );
                    })}
                  </div>

                  {canRedeem ? (
                    <p style={{ fontSize: 14, color: "#f59e0b", fontWeight: 800, textAlign: "center", marginTop: 14, padding: "10px 12px", background: "rgba(245,158,11,0.15)", borderRadius: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {t("🎁 ¡Puedes canjear tu")} {REWARD_NAME}!
                    </p>
                  ) : stampsForNext > 0 && (
                    <p style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700, textAlign: "center", marginTop: 14, padding: "8px 12px", background: "rgba(245,158,11,0.1)", borderRadius: 8 }}>
                      {t("Solo")} {stampsForNext} {t(stampsForNext === 1 ? 'sello' : 'sellos')} {t("más para obtener:")} <strong>{REWARD_NAME}</strong>
                    </p>
                  )}

                  {result.redeemedCount > 0 && (
                    <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 10 }}>
                      {t("🏆 Has canjeado")} {result.redeemedCount} {t(result.redeemedCount > 1 ? "premios" : "premio")} {t("antes")}
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
                    {requesting ? t('Enviando...') : `${t('🎁 Canjear mi')} ${REWARD_NAME}`}
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
                      {t("✓ Solicitud enviada")}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                      {t("El administrador revisará tu canje pronto. Muestra esta pantalla al pasar.")}
                    </p>
                  </div>
                )}

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                  <div style={{ background: "var(--bg-elevated-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>{t("Total gastado")}</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "var(--accent)", fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {formatCurrency(result.totalSpent)}
                    </p>
                  </div>
                  <div style={{ background: "var(--bg-elevated-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>{t("Visitas totales")}</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#4ade80", fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {result.stamps + (result.redeemedCount * REQUIRED_STAMPS)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ background: "var(--bg-elevated-2)", border: "1px dashed var(--border-strong)", borderRadius: 12, padding: 24, textAlign: "center", marginBottom: 20 }}>
                <p style={{ fontSize: 14, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
                  {t("Cada vez que vengas a cortarte y completes tu cita, ganarás")} <strong style={{ color: "var(--accent)" }}>{t("1 sello")}</strong>.
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>
                  {t("Junta")} {REQUIRED_STAMPS} {t("sellos")} {t("y obtén")} <strong style={{ color: "#f59e0b" }}>{REWARD_NAME}</strong> 🎁
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-ghost" onClick={handleNewSearch} style={{ flex: 1 }}>{t("Buscar otro")}</button>
              <button className="btn-gold" onClick={() => navigate(`/${slug}/cliente`)} style={{ flex: 1 }}>
                {result.stamps > 0 ? t('Agendar otra cita') : t('Agendar mi 1ra cita')}
              </button>
            </div>
          </div>
        ) : (
          /* Form */
          <div className="card" style={{ padding: 28 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, background: "linear-gradient(135deg, var(--accent), var(--accent-light))", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 32 }}>🎫</div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-primary)", marginBottom: 6 }}>
                {t("Mis")} <span className="gold">{t("sellos")}</span>
              </h2>
              <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
                {REQUIRED_STAMPS} {t("sellos")} = {REWARD_NAME}
              </p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("Tu teléfono *")}
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
                {t("El mismo que usaste al agendar tus citas")}
              </p>
            </div>

            <button className="btn-gold" onClick={handleSearch} disabled={!phone} style={{ width: "100%" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}><IconBuscar size={14} glow={false} color="#0a0a0a" />{stripEmoji(t("🔍 Ver mis sellos"))}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
