import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import LoadingScreen from './LoadingScreen';
import ConfirmModal from './ConfirmModal';

const DEFAULT_SERVICES = [
  { id: '1', name: 'Corte clásico', duration: 30, price: 150 },
  { id: '2', name: 'Corte + Barba', duration: 45, price: 220 },
  { id: '3', name: 'Barba completa', duration: 30, price: 100 },
];

export default function ClientView() {
  const [step, setStep] = useState(1); // 1: Privacy, 2: Personal, 3: Barber, 4: Service, 5: DateTime, 6: Confirm
  const [form, setForm] = useState({ client: "", phone: "", email: "", barberId: "", serviceId: "", date: "", time: "", notes: "" });
  const [citas, setCitas] = useState([]); // Array de citas agendadas en esta sesión
  const [errors, setErrors] = useState({});
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [done, setDone] = useState(false);
  const [completedAppointment, setCompletedAppointment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { appointments, barbers, blocks, services: firebaseServices, addAppointment, loading, slug, barbershopConfig } = useApp();
  const SERVICES = firebaseServices && firebaseServices.length > 0 ? firebaseServices : DEFAULT_SERVICES;

  if (loading) return <LoadingScreen />;

  const activeBarbers = barbers.filter(b => b.active);
  const selectedBarber = activeBarbers.find(b => b.id === form.barberId);
  const selectedService = SERVICES.find(s => String(s.id) === String(form.serviceId));

  const getTakenTimes = (appts, barberId, date) => {
    return appts.filter(a => a.barberId === barberId && a.date === date && a.status !== 'cancelada').map(a => a.time);
  };

  const getBlockedTimes = (blocks, barberId, date) => {
    return blocks.filter(b => b.barberId === barberId && b.date === date).flatMap(b => {
      const times = [];
      const [h1, m1] = b.horaInicio.split(':');
      const [h2, m2] = b.horaFin.split(':');
      for (let h = parseInt(h1); h <= parseInt(h2); h++) {
        times.push(`${String(h).padStart(2, '0')}:00`);
      }
      return times;
    });
  };

  const validateName = (name) => name && name.trim().length >= 3;
  const validatePhone = (phone) => /^\d{8,20}$/.test(phone.replace(/\D/g, ''));

  const handleNext = () => {
    if (step === 1) {
      if (!acceptPrivacy) {
        setErrors({ privacy: "Debes aceptar el aviso de privacidad" });
        return;
      }
      setErrors({});
      setStep(2);
    } else if (step === 2) {
      const errs = {};
      if (!validateName(form.client)) errs.client = "Nombre completo requerido (3+ caracteres)";
      if (!form.phone || !validatePhone(form.phone)) errs.phone = "Teléfono inválido";
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Email válido requerido";
      if (!form.barberId) errs.barberId = "Selecciona un barbero";
      setErrors(errs);
      if (Object.keys(errs).length === 0) setStep(3);
    } else if (step === 3) {
      if (!form.serviceId) {
        setErrors({ serviceId: "Selecciona un servicio" });
        return;
      }
      setErrors({});
      setStep(4);
    } else if (step === 4) {
      const errs = {};
      if (!form.date) errs.date = "Selecciona una fecha";
      if (!form.time) errs.time = "Selecciona una hora";
      setErrors(errs);
      if (Object.keys(errs).length === 0) setStep(5);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const cleanName = form.client.trim().replace(/\s+/g, ' ');
      const cleanPhone = form.phone.replace(/\D/g, '');

      const newAppt = await addAppointment({
        client: cleanName,
        phone: cleanPhone,
        client_email: form.email.trim().toLowerCase(),
        barberId: form.barberId,
        service: selectedService,
        date: form.date,
        time: form.time,
        notes: form.notes.trim().slice(0, 500)
      });

      if (newAppt) {
        setCitas([...citas, { ...newAppt, barber: selectedBarber }]);
        setCompletedAppointment({ ...newAppt, barber: selectedBarber });
        setDone(true);
      }
    } catch (err) {
      console.error('Error:', err);
      setErrors({ submit: 'Error al agendar cita' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAnother = () => {
    setForm({ client: form.client, phone: form.phone, email: form.email, barberId: "", serviceId: "", date: "", time: "", notes: "" });
    setDone(false);
    setCompletedAppointment(null);
    setStep(3); // Vuelve a seleccionar barbero (datos personales ya están)
  };

  const handleReset = () => {
    setForm({ client: "", phone: "", email: "", barberId: "", serviceId: "", date: "", time: "", notes: "" });
    setStep(1);
    setDone(false);
    setCitas([]);
    setAcceptPrivacy(false);
  };

  const update = (field, value) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  if (done) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-main)", padding: "40px 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 600, textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>✓</div>
          <h1 className="section-title">Cita Agendada</h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: 24, fontSize: 16 }}>Te esperamos, {completedAppointment?.client}</p>

          <div style={{
            background: "var(--accent-bg)",
            border: "1px solid var(--accent-border)",
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
            textAlign: "left"
          }}>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>FOLIO</p>
            <p style={{ color: "var(--accent)", fontSize: 32, fontWeight: 800, fontFamily: "'Courier New', monospace", marginBottom: 16 }}>
              {completedAppointment?.folio}
            </p>
            <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              <p><strong>Fecha:</strong> {new Date(completedAppointment?.date + 'T12:00:00').toLocaleDateString('es-MX')}</p>
              <p><strong>Hora:</strong> {completedAppointment?.time}</p>
              <p><strong>Barbero:</strong> {completedAppointment?.barber?.name}</p>
            </div>
          </div>

          {citas.length === 1 ? (
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-ghost" onClick={handleAddAnother} style={{ flex: 1 }}>Agregar otra cita</button>
              <button className="btn-gold" onClick={handleReset} style={{ flex: 1 }}>Terminar</button>
            </div>
          ) : (
            <div>
              <p style={{ color: "var(--text-tertiary)", marginBottom: 16 }}>Citas agendadas: {citas.length}</p>
              <button className="btn-gold" onClick={handleReset} style={{ width: "100%" }}>Listo</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const takenTimes = getTakenTimes(appointments, form.barberId, form.date);
  const blockedTimes = getBlockedTimes(blocks, form.barberId, form.date);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", padding: "20px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {/* STEP 1: PRIVACY */}
        {step === 1 && (
          <div className="fade-in" style={{ paddingTop: 20 }}>
            <h1 className="section-title" style={{ textAlign: "center", marginBottom: 32 }}>Antes de agendar</h1>

            <div style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-strong)",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20
            }}>
              <p style={{ color: "var(--text-secondary)", marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>
                Para agendar tu cita, necesitamos que aceptes nuestro aviso de privacidad. Tus datos serán utilizados únicamente para gestionar tu cita y contactarte si es necesario.
              </p>

              <div style={{
                background: "var(--bg-input)",
                border: `1px solid ${acceptPrivacy ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 8,
                padding: 16,
                marginBottom: 20,
                cursor: "pointer",
                transition: "border-color 0.2s"
              }}
                onClick={() => setAcceptPrivacy(!acceptPrivacy)}
              >
                <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={acceptPrivacy}
                    onChange={e => setAcceptPrivacy(e.target.checked)}
                    style={{ marginTop: 4, accentColor: "var(--accent)", width: 18, height: 18, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    Acepto el{' '}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowPrivacyModal(true); }}
                      style={{ background: "transparent", border: "none", color: "var(--accent)", padding: 0, textDecoration: "underline", cursor: "pointer", font: "inherit", fontWeight: 600 }}
                    >
                      aviso de privacidad
                    </button>
                    {' '}y autorizo el procesamiento de mis datos personales.
                  </span>
                </label>
              </div>

              {errors.privacy && (
                <p style={{ color: "var(--danger)", fontSize: 12, marginBottom: 16 }}>{errors.privacy}</p>
              )}

              <button className="btn-gold" onClick={handleNext} disabled={!acceptPrivacy} style={{ width: "100%" }}>
                Continuar
              </button>
            </div>

            {/* Modal Privacidad */}
            {showPrivacyModal && (
              <ConfirmModal
                open={showPrivacyModal}
                title="Aviso de Privacidad"
                message={`Tus datos personales serán utilizados para:
                
• Agendar y gestionar tu cita
• Enviarte confirmación por correo
• Contactarte si es necesario
• Mejorar nuestros servicios

No compartimos tus datos con terceros. Puedes solicitar la eliminación de tus datos en cualquier momento.`}
                confirmText="Entendido"
                onConfirm={() => setShowPrivacyModal(false)}
                cancelText=""
              />
            )}
          </div>
        )}

        {/* STEP 2: PERSONAL INFO */}
        {step === 2 && (
          <div className="fade-in" style={{ paddingTop: 20 }}>
            <h1 className="section-title" style={{ marginBottom: 8 }}>Tus datos</h1>
            <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginBottom: 24 }}>
              Información para tu cita
            </p>

            <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Nombre completo *</label>
                <input value={form.client} onChange={e => update("client", e.target.value)} placeholder="Tu nombre" />
                {errors.client && <p style={{ color: "var(--danger)", fontSize: 11, marginTop: 6 }}>{errors.client}</p>}
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Teléfono *</label>
                <input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="81 1234 5678" type="tel" />
                {errors.phone && <p style={{ color: "var(--danger)", fontSize: 11, marginTop: 6 }}>{errors.phone}</p>}
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Email *</label>
                <input value={form.email} onChange={e => update("email", e.target.value)} placeholder="tu@email.com" type="email" />
                {errors.email && <p style={{ color: "var(--danger)", fontSize: 11, marginTop: 6 }}>{errors.email}</p>}
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Barbero *</label>
                <select value={form.barberId} onChange={e => update("barberId", e.target.value)}>
                  <option value="">Selecciona un barbero</option>
                  {activeBarbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {errors.barberId && <p style={{ color: "var(--danger)", fontSize: 11, marginTop: 6 }}>{errors.barberId}</p>}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>Atrás</button>
              <button className="btn-gold" onClick={handleNext} style={{ flex: 1 }}>Siguiente</button>
            </div>
          </div>
        )}

        {/* STEP 3: SERVICE */}
        {step === 3 && (
          <div className="fade-in" style={{ paddingTop: 20 }}>
            <h1 className="section-title" style={{ marginBottom: 8 }}>Selecciona servicio</h1>
            <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginBottom: 20 }}>
              Elige el servicio para {form.client}
            </p>

            <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
              {SERVICES.map(s => (
                <div
                  key={s.id}
                  onClick={() => update("serviceId", String(s.id))}
                  style={{
                    background: String(s.id) === String(form.serviceId) ? "var(--accent-bg)" : "var(--bg-elevated)",
                    border: `1px solid ${String(s.id) === String(form.serviceId) ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 10,
                    padding: 16,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <p style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{s.name}</p>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{s.duration} min — ${s.price}</p>
                </div>
              ))}
            </div>

            {errors.serviceId && <p style={{ color: "var(--danger)", fontSize: 12, marginBottom: 16 }}>{errors.serviceId}</p>}

            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-ghost" onClick={() => setStep(2)} style={{ flex: 1 }}>Atrás</button>
              <button className="btn-gold" onClick={handleNext} style={{ flex: 1 }}>Siguiente</button>
            </div>
          </div>
        )}

        {/* STEP 4: DATE & TIME */}
        {step === 4 && (
          <div className="fade-in" style={{ paddingTop: 20 }}>
            <h1 className="section-title" style={{ marginBottom: 24 }}>Elige fecha y hora</h1>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Fecha *</label>
              <input type="date" value={form.date} onChange={e => update("date", e.target.value)} />
              {errors.date && <p style={{ color: "var(--danger)", fontSize: 11, marginTop: 6 }}>{errors.date}</p>}
            </div>

            {form.date && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Hora *</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 }}>
                  {["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"].map(time => {
                    const isTaken = takenTimes.includes(time) || blockedTimes.includes(time);
                    return (
                      <button
                        key={time}
                        onClick={() => !isTaken && update("time", time)}
                        disabled={isTaken}
                        style={{
                          background: form.time === time ? "var(--accent)" : isTaken ? "var(--border)" : "var(--bg-elevated)",
                          color: form.time === time ? "white" : "var(--text-secondary)",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          padding: "10px 8px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: isTaken ? "not-allowed" : "pointer",
                          opacity: isTaken ? 0.5 : 1
                        }}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Notas (opcional)</label>
              <textarea value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="Ej: alergia a algún producto..." style={{ minHeight: 80 }} />
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button className="btn-ghost" onClick={() => setStep(3)} style={{ flex: 1 }}>Atrás</button>
              <button className="btn-gold" onClick={handleNext} disabled={!form.date || !form.time} style={{ flex: 1 }}>Confirmar</button>
            </div>
          </div>
        )}

        {/* STEP 5: FINAL CONFIRMATION */}
        {step === 5 && (
          <div className="fade-in" style={{ paddingTop: 20 }}>
            <h1 className="section-title" style={{ marginBottom: 24, textAlign: "center" }}>Confirmación</h1>

            <div style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-strong)",
              borderRadius: 12,
              padding: 24,
              marginBottom: 24
            }}>
              <p style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 8 }}>RESUMEN</p>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                <p><strong>Cliente:</strong> {form.client}</p>
                <p><strong>Teléfono:</strong> {form.phone}</p>
                <p><strong>Email:</strong> {form.email}</p>
                <p><strong>Barbero:</strong> {selectedBarber?.name}</p>
                <p><strong>Servicio:</strong> {selectedService?.name}</p>
                <p><strong>Fecha:</strong> {new Date(form.date + 'T12:00:00').toLocaleDateString('es-MX')}</p>
                <p><strong>Hora:</strong> {form.time}</p>
                {selectedService?.price && <p style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)", marginTop: 12 }}>Total: ${selectedService.price}</p>}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-ghost" onClick={() => setStep(4)} disabled={submitting} style={{ flex: 1 }}>Editar</button>
              <button className="btn-gold" onClick={handleSubmit} disabled={submitting} style={{ flex: 1 }}>
                {submitting ? "Guardando..." : "Agendar cita"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
