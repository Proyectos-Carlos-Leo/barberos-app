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

  const { appointments, barbers, blocks, addAppointment, loading, slug, barbershopConfig } = useApp();

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
    if (!form.phone || !validatePhone(form.phone)) errs.phone = "Teléfono obligatorio (mínimo 10 dígitos)";
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

  // Validaciones anti-spam y seguridad
  const handleSubmit = async () => {
    // 1. Validar teléfono (solo dígitos, espacios, +, -, paréntesis)
    const cleanPhone = form.phone.trim();
    if (!/^[\d\s+\-()]{8,20}$/.test(cleanPhone)) {
      alert('⚠ Número de teléfono inválido');
      return;
    }

    // 2. Validar nombre (sin caracteres raros)
    const cleanName = form.client.trim();
    if (cleanName.length < 2 || cleanName.length > 100) {
      alert('⚠ Nombre inválido');
      return;
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s.'-]+$/.test(cleanName)) {
      alert('⚠ El nombre solo puede contener letras');
      return;
    }

    // 3. Validar que la fecha sea hoy o futuro
    const todayStr = new Date().toISOString().split('T')[0];
    if (form.date < todayStr) {
      alert('⚠ No puedes agendar citas en fechas pasadas');
      return;
    }

    // 4. Anti-spam: máximo 2 citas activas por teléfono al día
    if (cleanPhone) {
      const sameDayBookings = appointments.filter(a =>
        a.phone === cleanPhone &&
        a.date === form.date &&
        a.status !== 'cancelada'
      );
      if (sameDayBookings.length >= 2) {
        alert('⚠ Ya tienes 2 citas para esta fecha con este número. Si necesitas más, contacta directamente a la barbería.');
        return;
      }
    }

    // 5. Rate limit: máximo 5 citas en 1 hora desde el mismo teléfono
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentBookings = appointments.filter(a =>
      a.phone === cleanPhone &&
      a.createdAt &&
      a.createdAt > oneHourAgo
    );
    if (recentBookings.length >= 5) {
      alert('⚠ Demasiadas citas en poco tiempo. Espera unos minutos.');
      return;
    }

    const newAppt = await addAppointment({
      client: cleanName,
      phone: cleanPhone,
      barberId: form.barberId,
      service: selectedService,
      date: form.date,
      time: form.time,
      notes: form.notes.trim().slice(0, 500)
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
    <div style={{ minHeight: "100vh", background: "var(--bg-main)" }}>
      <Header userType="client" />
      <Notifications />
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "24px 14px" }}>
        {done && completedAppointment ? (
          <SuccessView
            appointment={completedAppointment}
            barbershop={BARBERSHOP_INFO}
            onReset={reset}
            onExit={() => navigate(`/${slug}`)}
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
        <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>Reserva en línea de forma rápida y sencilla</p>
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
    <div style={{ display: "flex", marginBottom: 36, alignItems: "center" }}>
      {steps.map((s, i) => {
        const isDone = currentStep > s.num;
        const isActive = currentStep === s.num;
        return (
          <div key={s.num} style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: isDone ? "#36B1DF" : isActive ? "linear-gradient(135deg, #36B1DF, #5FC8EC)" : "var(--bg-elevated-2)",
                border: `2px solid ${isDone || isActive ? "#36B1DF" : "var(--border-strong)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800,
                color: (isDone || isActive) ? "var(--bg-main)" : "var(--text-dim)",
                transition: "all 0.3s",
                boxShadow: isActive ? "0 0 16px rgba(54,177,223,0.5)" : "none",
                fontFamily: "'Barlow Condensed', sans-serif"
              }}>
                {isDone ? "✓" : s.num}
              </div>
              <span style={{
                fontSize: 11,
                color: isActive ? "#36B1DF" : isDone ? "var(--text-secondary)" : "var(--text-dim)",
                marginTop: 8,
                fontWeight: isActive ? 700 : 500,
                textAlign: "center",
                textTransform: "uppercase",
                letterSpacing: 0.5
              }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2,
                background: currentStep > s.num ? "#36B1DF" : "var(--border)",
                marginBottom: 22,
                transition: "background 0.4s"
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ==================== STEP 1 ====================
function Step1ClientInfo({ form, update, errors, barbers, selectedBarber, onNext }) {
  return (
    <div className="fade-in card booking-card">
      <div style={{ marginBottom: 24 }}>
        <span style={{
          display: "inline-block",
          padding: "4px 12px",
          background: "var(--accent-bg)",
          color: "var(--accent-light, #5FC8EC)",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginBottom: 8
        }}>
          Paso 1: Tus datos
        </span>
        <h3 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 26,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "var(--text-primary)",
          marginBottom: 4
        }}>
          ¿Quién <span className="gold">eres</span>?
        </h3>
        <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
          Y elige a tu barbero preferido
        </p>
      </div>

      <div style={{ display: "grid", gap: 18, marginBottom: 24 }}>
        <FormField label="Nombre completo *" error={errors.client}>
          <input value={form.client} onChange={e => update("client", e.target.value)} placeholder="Ej. Juan García" />
        </FormField>
        <FormField label="Teléfono *" hint="Para confirmar tu cita por WhatsApp" error={errors.phone}>
          <input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="81 1234 5678" type="tel" />
        </FormField>
      </div>

      <p style={{
        fontSize: 11,
        color: "var(--text-tertiary)",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 12
      }}>
        Elige a tu barbero *
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 12,
        marginBottom: 4
      }}>
        {barbers.map(b => {
          const isSelected = form.barberId === b.id;
          return (
            <div
              key={b.id}
              onClick={() => update("barberId", b.id)}
              style={{
                position: "relative",
                background: isSelected
                  ? "linear-gradient(135deg, var(--accent-bg), var(--bg-elevated))"
                  : "var(--bg-elevated)",
                border: `2px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 14,
                padding: 18,
                cursor: "pointer",
                transition: "all 0.25s",
                transform: isSelected ? "translateY(-2px)" : "none",
                boxShadow: isSelected ? "0 8px 24px rgba(54,177,223,0.2)" : "none"
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "var(--border-strong)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {isSelected && (
                <div className="fade-in" style={{
                  position: "absolute", top: 12, right: 12,
                  width: 26, height: 26, borderRadius: "50%",
                  background: "var(--accent)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: b.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 20,
                color: b.color,
                marginBottom: 12,
                border: isSelected ? `2px solid ${b.color}` : "none"
              }}>
                {b.avatar}
              </div>
              <p style={{
                fontWeight: 700, fontSize: 15,
                color: "var(--text-primary)",
                marginBottom: 4
              }}>
                {b.name}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                {b.specialty}
              </p>
            </div>
          );
        })}
      </div>

      {errors.barberId && (
        <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>⚠ {errors.barberId}</p>
      )}

      <div style={{ marginTop: 28, display: "flex", justifyContent: "flex-end" }}>
        <button className="btn-gold" onClick={onNext} disabled={!form.client || !form.phone || !form.barberId}>
          Siguiente →
        </button>
      </div>
    </div>
  );
}

// ==================== STEP 2 ====================
function Step2Service({ form, update, onBack, onNext }) {
  // Mapa de emojis por servicio
  const serviceEmojis = {
    1: "✂️",   // Corte clásico
    2: "💈",   // Corte + barba
    3: "🔥",   // Degradado
    4: "🧔",   // Barba completa
    5: "👦",   // Corte infantil
    6: "✨",   // Diseño + líneas
  };

  return (
    <div className="fade-in card booking-card">
      <div style={{ marginBottom: 24 }}>
        <span style={{
          display: "inline-block",
          padding: "4px 12px",
          background: "var(--accent-bg)",
          color: "var(--accent-light, #5FC8EC)",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginBottom: 8
        }}>
          Paso 2: Servicio
        </span>
        <h3 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 26,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "var(--text-primary)",
          marginBottom: 4
        }}>
          ¿Qué te <span className="gold">haces</span> hoy?
        </h3>
        <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
          Selecciona el servicio que necesitas
        </p>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {SERVICES.map(s => {
          const isSelected = form.serviceId === s.id;
          const emoji = serviceEmojis[s.id] || "✂️";
          return (
            <div
              key={s.id}
              onClick={() => update("serviceId", s.id)}
              style={{
                padding: "16px 18px",
                borderRadius: 12,
                border: `2px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                background: isSelected ? "var(--accent-bg)" : "var(--bg-elevated)",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 14,
                position: "relative"
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "var(--border-strong)";
                  e.currentTarget.style.background = "var(--bg-elevated-2)";
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--bg-elevated)";
                }
              }}
            >
              <div style={{
                fontSize: 32,
                width: 56, height: 56,
                background: isSelected ? "rgba(54,177,223,0.15)" : "var(--bg-elevated-2)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: `1px solid ${isSelected ? "var(--accent-border)" : "var(--border)"}`
              }}>
                {emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
                    {s.name}
                  </span>
                  <span style={{
                    color: "var(--accent)",
                    fontWeight: 800,
                    fontSize: 22,
                    fontFamily: "'Barlow Condensed', sans-serif"
                  }}>
                    ${s.price}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>
                  {s.description}
                </p>
                <span style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4
                }}>
                  ⏱ {s.duration} min
                </span>
              </div>
              {isSelected && (
                <div className="fade-in" style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: "var(--accent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
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
    <div className="fade-in card booking-card">
      <div style={{ marginBottom: 24 }}>
        <span style={{
          display: "inline-block",
          padding: "4px 12px",
          background: "var(--accent-bg)",
          color: "var(--accent-light, #5FC8EC)",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginBottom: 8
        }}>
          Paso 3: Fecha y hora
        </span>
        <h3 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 26,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "var(--text-primary)",
          marginBottom: 4
        }}>
          ¿Cuándo te <span className="gold">conviene</span>?
        </h3>
        <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
          Elige fecha y hora disponibles
        </p>
      </div>

      {/* Fechas - Scroll horizontal */}
      <div style={{ marginBottom: 28 }}>
        <label style={{
          fontSize: 11, color: "var(--text-tertiary)",
          display: "block", marginBottom: 12,
          fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5
        }}>
          📅 Fecha
        </label>
        <div style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 4,
          scrollbarWidth: "thin"
        }}>
          {days.map(d => {
            const isSelected = form.date === d.date;
            return (
              <div
                key={d.date}
                onClick={() => { update("date", d.date); update("time", ""); }}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `2px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                  background: isSelected
                    ? "linear-gradient(135deg, var(--accent), var(--accent-light, #5FC8EC))"
                    : "var(--bg-elevated)",
                  cursor: "pointer",
                  textAlign: "center",
                  minWidth: 68,
                  flexShrink: 0,
                  transition: "all 0.25s",
                  transform: isSelected ? "translateY(-2px)" : "none",
                  boxShadow: isSelected ? "0 8px 20px rgba(54,177,223,0.3)" : "none"
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "var(--border-strong)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                <p style={{
                  fontSize: 11,
                  color: isSelected ? "rgba(255,255,255,0.9)" : "var(--text-tertiary)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  marginBottom: 4
                }}>{d.label}</p>
                <p style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: isSelected ? "white" : "var(--text-primary)",
                  fontFamily: "'Barlow Condensed', sans-serif"
                }}>{d.num}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Día bloqueado */}
      {form.date && isFullDayBlocked && (
        <div className="fade-in" style={{
          background: "var(--danger-bg)",
          border: "1px solid var(--danger-border, #dc2626)",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          textAlign: "center"
        }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🚫</p>
          <p style={{ color: "var(--danger)", fontWeight: 700, fontSize: 15 }}>
            Este día no está disponible
          </p>
          <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginTop: 4 }}>
            Por favor elige otra fecha
          </p>
        </div>
      )}

      {/* Horas */}
      {form.date && !isFullDayBlocked && (
        <div className="fade-in" style={{ marginBottom: 24 }}>
          <label style={{
            fontSize: 11, color: "var(--text-tertiary)",
            display: "block", marginBottom: 12,
            fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5
          }}>
            ⏰ Hora disponible
          </label>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
            gap: 8
          }}>
            {HOURS.map(h => {
              const taken = takenTimes.includes(h);
              const blocked = blockedHoursOnly.includes(h);
              const today = new Date().toISOString().split('T')[0];
              const isToday = form.date === today;
              const now = new Date();
              const [hh, mm] = h.split(':').map(Number);
              const hourPassed = isToday && (hh < now.getHours() || (hh === now.getHours() && mm <= now.getMinutes()));
              const unavailable = taken || blocked || hourPassed;
              const isSelected = form.time === h;
              return (
                <div
                  key={h}
                  onClick={() => !unavailable && update("time", h)}
                  style={{
                    padding: "12px 4px",
                    borderRadius: 10,
                    border: `1.5px solid ${isSelected ? "var(--accent)" : unavailable ? "var(--border)" : "var(--border)"}`,
                    background: isSelected
                      ? "linear-gradient(135deg, var(--accent), var(--accent-light, #5FC8EC))"
                      : unavailable
                        ? "transparent"
                        : "var(--bg-elevated)",
                    cursor: unavailable ? "not-allowed" : "pointer",
                    fontSize: 13,
                    fontWeight: 700,
                    color: isSelected
                      ? "white"
                      : unavailable
                        ? "var(--text-faint)"
                        : "var(--text-primary)",
                    textDecoration: unavailable ? "line-through" : "none",
                    transition: "all 0.2s",
                    textAlign: "center",
                    borderStyle: unavailable ? "dashed" : "solid",
                    boxShadow: isSelected ? "0 4px 14px rgba(54,177,223,0.35)" : "none"
                  }}
                  onMouseEnter={e => {
                    if (!unavailable && !isSelected) {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.background = "var(--accent-bg)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!unavailable && !isSelected) {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "var(--bg-elevated)";
                    }
                  }}
                >
                  {h}
                </div>
              );
            })}
          </div>
          {(takenTimes.length > 0 || blockedHoursOnly.length > 0) && (
            <p style={{
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 6
            }}>
              <span style={{
                display: "inline-block",
                width: 12, height: 12,
                border: "1.5px dashed var(--border)",
                borderRadius: 3
              }}></span>
              Los horarios tachados no están disponibles
            </p>
          )}
        </div>
      )}

      <FormField label="Notas adicionales (opcional)">
        <textarea
          value={form.notes}
          onChange={e => update("notes", e.target.value)}
          placeholder="Ej. Degradado bajo, barba recortada..."
          rows={3}
          style={{ resize: "none" }}
        />
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
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleClick = async () => {
    if (!acceptPrivacy) {
      alert('⚠ Debes aceptar el aviso de privacidad para continuar');
      return;
    }
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
    <div className="fade-in card booking-card">
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "var(--text-secondary)" }}>Confirma tu cita</h3>
      <div style={{ background: "var(--bg-elevated-2)", borderRadius: 12, padding: 22, marginBottom: 20, border: "1px solid var(--border)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
          {summary.map(([label, val]) => (
            <div key={label}>
              <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 14, fontWeight: 600 }}>{val}</p>
            </div>
          ))}
        </div>
        {form.notes && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Notas</p>
            <p style={{ fontSize: 14, fontStyle: "italic" }}>"{form.notes}"</p>
          </div>
        )}
      </div>
      <div style={{ background: "var(--accent-bg)", border: "1px solid #0a3d56", borderRadius: 10, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <p style={{ color: "#36B1DF", fontSize: 14, fontWeight: 600 }}>Total a pagar</p>
          <p style={{ color: "var(--text-tertiary)", fontSize: 11, marginTop: 2 }}>Pago en sucursal</p>
        </div>
        <span style={{ color: "#36B1DF", fontSize: 28, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif" }}>
          {formatCurrency(selectedService?.price || 0)}
        </span>
      </div>

      {/* Aviso de privacidad */}
      <div style={{
        background: "var(--bg-elevated)",
        border: `1px solid ${acceptPrivacy ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 10,
        padding: 14,
        marginBottom: 20,
        cursor: "pointer",
        transition: "border-color 0.2s"
      }}
        onClick={() => setAcceptPrivacy(!acceptPrivacy)}
      >
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={acceptPrivacy}
            onChange={e => setAcceptPrivacy(e.target.checked)}
            style={{ marginTop: 3, accentColor: "#36B1DF", width: 16, height: 16, cursor: "pointer" }}
          />
          <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Acepto el{' '}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowPrivacyModal(true); }}
              style={{ background: "transparent", border: "none", color: "#36B1DF", padding: 0, textDecoration: "underline", cursor: "pointer", font: "inherit" }}
            >
              aviso de privacidad
            </button>
            {' '}y autorizo el uso de mis datos para gestionar mi cita.
          </span>
        </label>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="btn-ghost" onClick={onBack} disabled={submitting}>← Editar</button>
        <button className="btn-gold" onClick={handleClick} disabled={submitting || !acceptPrivacy}>
          {submitting ? "Guardando..." : "Confirmar cita ✓"}
        </button>
      </div>

      {/* Modal de aviso de privacidad */}
      {showPrivacyModal && (
        <div
          onClick={() => setShowPrivacyModal(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, zIndex: 2000
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-strong)",
              borderRadius: 14,
              maxWidth: 600,
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 28
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 22, fontWeight: 800, letterSpacing: 1,
                textTransform: "uppercase", color: "var(--text-primary)"
              }}>
                🔒 Aviso de Privacidad
              </h2>
              <button
                onClick={() => setShowPrivacyModal(false)}
                style={{ background: "transparent", border: "none", fontSize: 24, cursor: "pointer", color: "var(--text-tertiary)", padding: 0 }}
              >×</button>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)" }}>
              <p style={{ marginBottom: 12 }}>
                <strong>Responsable del tratamiento de datos:</strong> La barbería con la que estás agendando tu cita.
              </p>
              <p style={{ marginBottom: 12 }}>
                <strong>Datos que recabamos:</strong>
              </p>
              <ul style={{ marginLeft: 20, marginBottom: 12 }}>
                <li>Nombre completo</li>
                <li>Número de teléfono</li>
                <li>Fecha y hora de cita</li>
                <li>Servicio solicitado</li>
              </ul>
              <p style={{ marginBottom: 12 }}>
                <strong>Finalidad:</strong> Tus datos son usados ÚNICAMENTE para:
              </p>
              <ul style={{ marginLeft: 20, marginBottom: 12 }}>
                <li>Confirmar y gestionar tu cita</li>
                <li>Contactarte si hay cambios o cancelaciones</li>
                <li>Llevar un historial de servicios prestados</li>
              </ul>
              <p style={{ marginBottom: 12 }}>
                <strong>No compartimos:</strong> Tus datos NO se venden, NO se comparten con terceros ni se usan para fines publicitarios o de marketing sin tu consentimiento expreso.
              </p>
              <p style={{ marginBottom: 12 }}>
                <strong>Tus derechos (ARCO):</strong> Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos en cualquier momento. Solo contacta directamente a la barbería.
              </p>
              <p style={{ marginBottom: 12 }}>
                <strong>Almacenamiento:</strong> Los datos se almacenan de forma segura en servidores con cifrado. Solo el administrador autorizado de la barbería puede acceder a la información completa.
              </p>
              <p style={{ marginBottom: 16, fontSize: 12, color: "var(--text-muted)" }}>
                Este aviso cumple con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) de México.
              </p>
              <button
                onClick={() => { setAcceptPrivacy(true); setShowPrivacyModal(false); }}
                className="btn-gold"
                style={{ width: "100%" }}
              >
                Aceptar y cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SUCCESS VIEW ====================
function SuccessView({ appointment, barbershop, onReset, onExit }) {
  const folioId = appointment?.id ? String(appointment.id).slice(-6) : "------";

  return (
    <div className="fade-in" style={{ textAlign: "center", padding: "40px 20px" }}>
      {/* Ícono de éxito */}
      <div style={{ width: 80, height: 80, background: "var(--success-bg)", border: "2px solid var(--success)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>

      <h2 className="section-title" style={{ fontSize: 36, marginBottom: 12 }}>¡<span className="gold">Cita</span> agendada!</h2>
      <p style={{ color: "var(--text-tertiary)", marginBottom: 28, fontSize: 16 }}>
        Te esperamos, <strong style={{ color: "var(--text-primary)" }}>{appointment.client}</strong>
      </p>

      {/* Tarjeta del barbero */}
      {appointment.barber && (
        <div style={{
          background: "var(--accent-bg)",
          border: "1px solid var(--accent-border)",
          borderRadius: 12,
          padding: "16px 20px",
          maxWidth: 480,
          margin: "0 auto 24px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          textAlign: "left"
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: appointment.barber.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 17,
            color: appointment.barber.color,
            flexShrink: 0,
            border: "2px solid var(--accent)"
          }}>
            {appointment.barber.avatar}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
              Te atenderá
            </p>
            <p style={{ fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
              {appointment.barber.name}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {appointment.barber.specialty}
            </p>
          </div>
        </div>
      )}

      {/* Comprobante */}
      <div className="card" style={{ padding: 24, marginBottom: 24, textAlign: "left", maxWidth: 480, margin: "0 auto 24px", border: "1px solid var(--accent-border)" }}>
        <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 20, borderBottom: "1px dashed var(--border-strong)" }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Comprobante</p>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--accent)", letterSpacing: 1 }}>#{folioId}</p>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <ReceiptRow label="Servicio" value={appointment.service?.name || "—"} />
          <ReceiptRow label="Barbero" value={appointment.barber?.name || "—"} />
          <ReceiptRow label="Fecha" value={formatDate(appointment.date)} />
          <ReceiptRow label="Hora" value={appointment.time} />
          <ReceiptRow label="Duración" value={`${appointment.service?.duration || 0} min`} />
        </div>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed var(--border-strong)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Total</span>
          <span style={{ color: "var(--accent)", fontSize: 22, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif" }}>{formatCurrency(appointment.service?.price || 0)}</span>
        </div>
      </div>

      {/* Ubicación */}
      {(barbershop?.direccion || barbershop?.telefono) && (
        <div style={{
          background: "var(--accent-bg)",
          border: "1px solid var(--accent-border)",
          borderRadius: 10, padding: 16,
          maxWidth: 480, margin: "0 auto 28px",
          textAlign: "left"
        }}>
          <p style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, marginBottom: 6 }}>📍 Ubicación</p>
          {barbershop.direccion && <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{barbershop.direccion}</p>}
          {barbershop.telefono && <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>📞 {barbershop.telefono}</p>}
        </div>
      )}

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
      <label style={{ fontSize: 12, color: "var(--text-tertiary)", display: "block", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
      {children}
      {hint && !error && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{hint}</p>}
      {error && <p style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>⚠ {error}</p>}
    </div>
  );
}

function ReceiptRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 56, height: 56, border: "3px solid #1e1e1e", borderTop: "3px solid #36B1DF", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "var(--text-tertiary)", fontFamily: "'Barlow', sans-serif" }}>Conectando con Firebase...</p>
      </div>
    </div>
  );
}
