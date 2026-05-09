import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Header from './Header';
import Notifications from './Notifications';
import { SERVICES, HOURS, BARBERSHOP_INFO } from '../utils/data';
import { getNext7Days, getTakenTimes, formatDate, formatCurrency, validateName, validatePhone, getBlockedTimes } from '../utils/helpers';

const STEPS = [
  { num: 1, label: "Tus datos" },
  { num: 2, label: "Servicio" },
  { num: 3, label: "Fecha y hora" },
  { num: 4, label: "Confirmar" }
];

export default function ClientView() {
  const navigate = useNavigate();

  // ✅ FIX #1: TODOS los hooks primero, sin ningún return antes
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState({});
  const [completedAppointment, setCompletedAppointment] = useState(null);
  const [form, setForm] = useState({
    client: "", phone: "", barberId: "", serviceId: "", date: "", time: "", notes: ""
  });

  const { appointments, barbers, blocks, addAppointment, loading } = useApp();

  // Ahora sí el loading puede ir aquí, después de todos los hooks
  if (loading) return <LoadingScreen />;

  const activeBarbers = barbers.filter(b => b.active);

  // ✅ FIX #2: Comparar IDs como string, no con Number()
  const selectedBarber = activeBarbers.find(b => b.id === form.barberId);
  const selectedService = SERVICES.find(s => s.id === Number(form.serviceId));
  const takenTimes = getTakenTimes(appointments, form.barberId, form.date);
  const blockedTimes = getBlockedTimes(blocks, form.barberId, form.date);
  const isFullDayBlocked = blockedTimes.includes('FULL_DAY');

  const update = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: null }));
  };

  const validateStep1 = () => {
    const errs = {};
    if (!validateName(form.client)) errs.client = "Ingresa tu nombre completo (mínimo 3 caracteres)";
    if (form.phone && !validatePhone(form.phone)) errs.phone = "Teléfono inválido (mínimo 10 dígitos)";
    if (!form.barberId) errs.barberId = "Selecciona un barbero";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !form.serviceId) return;
    if (step === 3 && (!form.date || !form.time)) return;
    setStep(s => s + 1);
  };

  // ✅ FIX #3: handleSubmit es async y espera el resultado real de Firebase
  const handleSubmit = async () => {
    const newAppt = await addAppointment({
      client: form.client.trim(),
      phone: form.phone.trim(),
      barberId: form.barberId, // ✅ string, no Number()
      service: selectedService,
      date: form.date,
      time: form.time,
      notes: form.notes.trim()
    });
    if (newAppt) {
      setCompletedAppointment({ ...newAppt, barber: selectedBarber });
      setDone(true);
    }
  };

  const reset = () => {
    setForm({ client: "", phone: "", barberId: "", serviceId: "", date: "", time: "", notes: "" });
    setStep(1);
    setDone(false);
    setCompletedAppointment(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      <Header userType="client" />
      <Notifications />
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px" }}>
        {done && completedAppointment ? (
          <SuccessView
            appointment={completedAppointment}
            barbershop={BARBERSHOP_INFO}
            onReset={reset}
            onExit={() => navigate('/')}
          />
        ) : (
          <BookingFlow
            form={form}
            update={update}
            step={step}
            setStep={setStep}
            errors={errors}
            barbers={activeBarbers}
            selectedBarber={selectedBarber}
            selectedService={selectedService}
            takenTimes={takenTimes}
            blockedTimes={blockedTimes}
            isFullDayBlocked={isFullDayBlocked}
            handleNext={handleNext}
            handleSubmit={handleSubmit}
          />
        )}
      </main>
    </div>
  );
}

// ==================== BOOKING FLOW ====================
function BookingFlow({ form, update, step, setStep, errors, barbers, selectedBarber, selectedService, takenTimes, blockedTimes, isFullDayBlocked, handleNext, handleSubmit }) {
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 className="section-title" style={{ marginBottom: 6 }}>
          Agenda tu <span className="gold">cita</span>
        </h1>
        <p style={{ color: "#888", fontSize: 14 }}>Reserva en línea de forma rápida y sencilla</p>
      </div>
      <StepsIndicator currentStep={step} steps={STEPS} />
      {step === 1 && <Step1ClientInfo form={form} update={update} errors={errors} barbers={barbers} selectedBarber={selectedBarber} onNext={handleNext} />}
      {step === 2 && <Step2Service form={form} update={update} onBack={() => setStep(1)} onNext={handleNext} />}
      {step === 3 && <Step3DateTime form={form} update={update} takenTimes={takenTimes} blockedTimes={blockedTimes} isFullDayBlocked={isFullDayBlocked} onBack={() => setStep(2)} onNext={handleNext} />}
      {step === 4 && <Step4Confirm form={form} selectedBarber={selectedBarber} selectedService={selectedService} onBack={() => setStep(3)} onSubmit={handleSubmit} />}
    </div>
  );
}

// ==================== STEPS INDICATOR ====================
function StepsIndicator({ currentStep, steps }) {
  return (
    <div style={{ display: "flex", marginBottom: 36 }}>
      {steps.map((s, i) => (
        <div key={s.num} style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: currentStep >= s.num ? "#c9a84c" : "#1e1e1e", border: `2px solid ${currentStep >= s.num ? "#c9a84c" : "#2e2e2e"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: currentStep >= s.num ? "#0a0a0a" : "#555", transition: "all 0.3s" }}>
              {currentStep > s.num ? "✓" : s.num}
            </div>
            <span style={{ fontSize: 11, color: currentStep === s.num ? "#c9a84c" : "#555", marginTop: 6, fontWeight: currentStep === s.num ? 600 : 400, textAlign: "center" }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: currentStep > s.num ? "#c9a84c" : "#1e1e1e", marginBottom: 22, transition: "background 0.3s" }} />}
        </div>
      ))}
    </div>
  );
}

// ==================== STEP 1 ====================
function Step1ClientInfo({ form, update, errors, barbers, selectedBarber, onNext }) {
  return (
    <div className="fade-in card" style={{ padding: 28 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 24, color: "#aaa" }}>Ingresa tus datos</h3>
      <div style={{ display: "grid", gap: 18 }}>
        <FormField label="Nombre completo *" error={errors.client}>
          <input value={form.client} onChange={e => update("client", e.target.value)} placeholder="Ej. Juan García" />
        </FormField>
        <FormField label="Teléfono" hint="Para confirmar tu cita por WhatsApp" error={errors.phone}>
          <input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="81 1234 5678" type="tel" />
        </FormField>
        <FormField label="Barbero *" error={errors.barberId}>
          <select value={form.barberId} onChange={e => update("barberId", e.target.value)}>
            <option value="">Selecciona un barbero</option>
            {barbers.map(b => <option key={b.id} value={b.id}>{b.name} — {b.specialty}</option>)}
          </select>
        </FormField>
        {selectedBarber && (
          <div className="fade-in" style={{ background: "#0f0f0f", borderRadius: 10, padding: 16, display: "flex", alignItems: "center", gap: 14, border: "1px solid #1e1e1e" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: selectedBarber.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: selectedBarber.color, flexShrink: 0 }}>{selectedBarber.avatar}</div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{selectedBarber.name}</p>
              <p style={{ fontSize: 13, color: "#888" }}>{selectedBarber.specialty}</p>
            </div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 28, display: "flex", justifyContent: "flex-end" }}>
        <button className="btn-gold" onClick={onNext} disabled={!form.client || !form.barberId}>Siguiente →</button>
      </div>
    </div>
  );
}

// ==================== STEP 2 ====================
function Step2Service({ form, update, onBack, onNext }) {
  return (
    <div className="fade-in card" style={{ padding: 28 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 24, color: "#aaa" }}>Elige tu servicio</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {SERVICES.map(s => {
          const isSelected = form.serviceId === s.id;
          return (
            <div key={s.id} onClick={() => update("serviceId", s.id)} style={{ padding: 16, borderRadius: 10, border: `2px solid ${isSelected ? "#c9a84c" : "#1e1e1e"}`, background: isSelected ? "#1a150a" : "#0f0f0f", cursor: "pointer", transition: "all 0.2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</span>
                <span style={{ color: "#c9a84c", fontWeight: 700, fontSize: 16 }}>${s.price}</span>
              </div>
              <p style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{s.description}</p>
              <span style={{ fontSize: 11, color: "#666" }}>⏱ {s.duration} min</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between" }}>
        <button className="btn-ghost" onClick={onBack}>← Atrás</button>
        <button className="btn-gold" onClick={onNext} disabled={!form.serviceId}>Siguiente →</button>
      </div>
    </div>
  );
}

// ==================== STEP 3 ====================
function Step3DateTime({ form, update, takenTimes, blockedTimes, isFullDayBlocked, onBack, onNext }) {
  const days = getNext7Days();
  const blockedHoursOnly = (blockedTimes || []).filter(t => t !== 'FULL_DAY');

  return (
    <div className="fade-in card" style={{ padding: 28 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "#aaa" }}>Elige fecha y hora</h3>
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Fecha</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {days.map(d => {
            const isSelected = form.date === d.date;
            return (
              <div key={d.date} onClick={() => { update("date", d.date); update("time", ""); }} style={{ padding: "12px 14px", borderRadius: 10, border: `2px solid ${isSelected ? "#c9a84c" : "#1e1e1e"}`, background: isSelected ? "#1a150a" : "#0f0f0f", cursor: "pointer", textAlign: "center", minWidth: 64, transition: "all 0.2s" }}>
                <p style={{ fontSize: 11, color: isSelected ? "#c9a84c" : "#888", fontWeight: 600, textTransform: "uppercase" }}>{d.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: isSelected ? "#c9a84c" : "#f5f0eb" }}>{d.num}</p>
              </div>
            );
          })}
        </div>
      </div>
      {form.date && isFullDayBlocked && (
        <div className="fade-in" style={{
          background: "#3f1111",
          border: "1px solid #dc2626",
          borderRadius: 10,
          padding: 16,
          marginBottom: 16,
          textAlign: "center"
        }}>
          <p style={{ fontSize: 24, marginBottom: 4 }}>🚫</p>
          <p style={{ color: "#fca5a5", fontWeight: 600, fontSize: 14 }}>
            Este día no está disponible
          </p>
          <p style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
            Por favor elige otra fecha
          </p>
        </div>
      )}
      {form.date && !isFullDayBlocked && (
        <div className="fade-in" style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Hora disponible</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {HOURS.map(h => {
              const taken = takenTimes.includes(h);
              const blocked = blockedHoursOnly.includes(h);
              const unavailable = taken || blocked;
              const isSelected = form.time === h;
              return (
                <div key={h} onClick={() => !unavailable && update("time", h)} style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: `1.5px solid ${isSelected ? "#c9a84c" : unavailable ? "#1a1a1a" : "#1e1e1e"}`,
                  background: isSelected ? "#1a150a" : unavailable ? "#0d0d0d" : "#0f0f0f",
                  cursor: unavailable ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: isSelected ? "#c9a84c" : unavailable ? "#333" : "#f5f0eb",
                  textDecoration: unavailable ? "line-through" : "none",
                  transition: "all 0.2s"
                }}>{h}</div>
              );
            })}
          </div>
          {(takenTimes.length > 0 || blockedHoursOnly.length > 0) && (
            <p style={{ fontSize: 11, color: "#666", marginTop: 10 }}>
              Los horarios tachados no están disponibles
            </p>
          )}
        </div>
      )}
      <FormField label="Notas adicionales (opcional)">
        <textarea value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="Ej. Degradado bajo, barba recortada..." rows={3} style={{ resize: "none" }} />
      </FormField>
      <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between" }}>
        <button className="btn-ghost" onClick={onBack}>← Atrás</button>
        <button className="btn-gold" onClick={onNext} disabled={!form.date || !form.time || isFullDayBlocked}>Siguiente →</button>
      </div>
    </div>
  );
}

// ==================== STEP 4 ====================
function Step4Confirm({ form, selectedBarber, selectedService, onBack, onSubmit }) {
  const [submitting, setSubmitting] = useState(false);

  const handleClick = async () => {
    setSubmitting(true);
    await onSubmit();
    setSubmitting(false);
  };

  const summary = [
    ["Cliente", form.client],
    ["Teléfono", form.phone || "—"],
    ["Barbero", selectedBarber?.name || "—"],
    ["Servicio", selectedService?.name || "—"],
    ["Duración", `${selectedService?.duration || 0} min`],
    ["Fecha", formatDate(form.date)],
    ["Hora", form.time],
  ];

  return (
    <div className="fade-in card" style={{ padding: 28 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "#aaa" }}>Confirma tu cita</h3>
      <div style={{ background: "#0f0f0f", borderRadius: 12, padding: 22, marginBottom: 20, border: "1px solid #1e1e1e" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {summary.map(([label, val]) => (
            <div key={label}>
              <p style={{ fontSize: 11, color: "#666", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 14, fontWeight: 600 }}>{val}</p>
            </div>
          ))}
        </div>
        {form.notes && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #1e1e1e" }}>
            <p style={{ fontSize: 11, color: "#666", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Notas</p>
            <p style={{ fontSize: 14, fontStyle: "italic" }}>"{form.notes}"</p>
          </div>
        )}
      </div>
      <div style={{ background: "#1a150a", border: "1px solid #3d2e0a", borderRadius: 10, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <p style={{ color: "#c9a84c", fontSize: 14, fontWeight: 600 }}>Total a pagar</p>
          <p style={{ color: "#888", fontSize: 11, marginTop: 2 }}>Pago en sucursal</p>
        </div>
        <span style={{ color: "#c9a84c", fontSize: 28, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif" }}>
          {formatCurrency(selectedService?.price || 0)}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="btn-ghost" onClick={onBack} disabled={submitting}>← Editar</button>
        <button className="btn-gold" onClick={handleClick} disabled={submitting}>
          {submitting ? "Guardando..." : "Confirmar cita ✓"}
        </button>
      </div>
    </div>
  );
}

// ==================== SUCCESS VIEW ====================
function SuccessView({ appointment, barbershop, onReset, onExit }) {
  // ✅ FIX: id puede ser string de Firebase, usamos slice sin toString() forzado
  const folioId = appointment?.id ? String(appointment.id).slice(-6) : "------";

  return (
    <div className="fade-in" style={{ textAlign: "center", padding: "40px 20px" }}>
      <div style={{ width: 80, height: 80, background: "#1a2e1a", border: "2px solid #16a34a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 className="section-title" style={{ fontSize: 36, marginBottom: 12 }}>¡<span className="gold">Cita</span> agendada!</h2>
      <p style={{ color: "#888", marginBottom: 32, fontSize: 16 }}>Te esperamos, <strong style={{ color: "#f5f0eb" }}>{appointment.client}</strong></p>

      <div className="card" style={{ padding: 24, marginBottom: 24, textAlign: "left", maxWidth: 480, margin: "0 auto 24px", border: "1px solid #3d2e0a" }}>
        <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 20, borderBottom: "1px dashed #2e2e2e" }}>
          <p style={{ fontSize: 11, color: "#666", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Comprobante</p>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: "#c9a84c", letterSpacing: 1 }}>#{folioId}</p>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <ReceiptRow label="Servicio" value={appointment.service?.name || "—"} />
          <ReceiptRow label="Barbero" value={appointment.barber?.name || "—"} />
          <ReceiptRow label="Fecha" value={formatDate(appointment.date)} />
          <ReceiptRow label="Hora" value={appointment.time} />
          <ReceiptRow label="Duración" value={`${appointment.service?.duration || 0} min`} />
        </div>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed #2e2e2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Total</span>
          <span style={{ color: "#c9a84c", fontSize: 22, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif" }}>{formatCurrency(appointment.service?.price || 0)}</span>
        </div>
      </div>

      <div style={{ background: "#0f1a2e", border: "1px solid #1e3a5f", borderRadius: 10, padding: 16, maxWidth: 480, margin: "0 auto 28px", textAlign: "left" }}>
        <p style={{ fontSize: 13, color: "#60a5fa", fontWeight: 600, marginBottom: 6 }}>📍 Ubicación</p>
        <p style={{ fontSize: 13, color: "#aaa" }}>{barbershop.address}</p>
        <p style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>📞 {barbershop.phone}</p>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn-ghost" onClick={onExit}>Volver al inicio</button>
        <button className="btn-gold" onClick={onReset}>Agendar otra cita</button>
      </div>
    </div>
  );
}

// ==================== HELPERS ====================
function FormField({ label, hint, error, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
      {children}
      {hint && !error && <p style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{hint}</p>}
      {error && <p style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>⚠ {error}</p>}
    </div>
  );
}

function ReceiptRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, color: "#888" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 56, height: 56, border: "3px solid #1e1e1e", borderTop: "3px solid #c9a84c", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "#888", fontFamily: "'Barlow', sans-serif" }}>Conectando con Firebase...</p>
      </div>
    </div>
  );
}
