import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useT } from '../utils/i18n';
import Header from './Header';
import Notifications from './Notifications';
import { SERVICES as DEFAULT_SERVICES } from '../utils/data';
import { getNext7Days, getTakenTimes, formatDate, formatCurrency, validateName, validatePhone, getBlockedTimes } from '../utils/helpers';
import { getPlan, citasDelMes } from '../utils/plans';

const STEPS = [
  { num: 1, label: "Tus datos" },
  { num: 2, label: "Servicio" },
  { num: 3, label: "Fecha y hora" },
  { num: 4, label: "Confirmar" }
];

// ==================== AGENDAR DE NUEVO (1 TOQUE) ====================
const REBOOK_PHONE_KEY = 'barberos_client_phone';

const normPhoneRB = (p) => String(p || "").replace(/\D/g, "").slice(-10);

const savePhoneForRebook = (phone) => {
  try { localStorage.setItem(REBOOK_PHONE_KEY, phone); } catch (e) { /* modo privado */ }
};
const getSavedPhone = () => {
  try { return localStorage.getItem(REBOOK_PHONE_KEY) || ""; } catch (e) { return ""; }
};

// Encuentra el primer horario libre para un barbero en los próximos 14 días
const findNextAvailableSlot = (barbershopConfig, appointments, blocks, barberId) => {
  const horario = barbershopConfig?.horario || {};
  const inicio = horario.hora_inicio || '09:00';
  const fin = horario.hora_fin || '20:00';
  const dur = horario.duracion || 30;
  const DAY_KEYS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

  const slots = [];
  const [sH, sM] = inicio.split(':').map(Number);
  const [eH, eM] = fin.split(':').map(Number);
  let cur = sH * 60 + sM;
  const endMin = eH * 60 + eM;
  while (cur + dur <= endMin) {
    slots.push(`${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`);
    cur += dur;
  }
  if (slots.length === 0) return null;

  const now = new Date();
  for (let d = 0; d < 14; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() + d);
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

    // Día activo según config
    if (horario.dias_activos && horario.dias_activos[DAY_KEYS[day.getDay()]] === false) continue;

    const taken = getTakenTimes(appointments, barberId, dateStr);
    const blocked = getBlockedTimes(blocks, barberId, dateStr);
    if (blocked.includes('FULL_DAY')) continue;

    for (const time of slots) {
      // Hoy: solo horarios con al menos 30 min de anticipación
      if (d === 0) {
        const [h, m] = time.split(':').map(Number);
        if (h * 60 + m <= now.getHours() * 60 + now.getMinutes() + 30) continue;
      }
      if (taken.includes(time) || blocked.includes(time)) continue;
      return { date: dateStr, time };
    }
  }
  return null;
};

export default function ClientView() {
  const navigate = useNavigate();

  // ✅ FIX #1: TODOS los hooks primero, sin ningún return antes
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState({});
  const [completedAppointment, setCompletedAppointment] = useState(null);
  const [form, setForm] = useState({
    client: "", phone: "", email: "", barberId: "", serviceId: "", date: "", time: "", notes: ""
  });
  const [carrito, setCarrito] = useState([]); // [{...producto, qty}]

  const agregarProducto = (p) => {
    if (p.cantidad === 0) return;
    setCarrito(prev => {
      const existing = prev.find(i => i.id === p.id);
      const maxQty = p.cantidad ?? 999;
      if (existing) {
        if (existing.qty >= maxQty) return prev;
        return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...p, qty: 1 }];
    });
  };

  const quitarProducto = (id) => {
    setCarrito(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing?.qty > 1) return prev.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i);
      return prev.filter(i => i.id !== id);
    });
  };

  const totalProductos = carrito.reduce((s, i) => s + i.price * i.qty, 0);

  const { appointments, barbers, blocks, services: firebaseServices, productos, addAppointment, loading, slug, barbershopConfig } = useApp();
  const t = useT(barbershopConfig?.idioma);
  const SERVICES = firebaseServices && firebaseServices.length > 0 ? firebaseServices : DEFAULT_SERVICES;

  // ---- Cliente recurrente: "agendar de nuevo en 1 toque" ----
  const [rebookDismissed, setRebookDismissed] = useState(false);
  const savedPhone = getSavedPhone();

  const rebook = useMemo(() => {
    if (!savedPhone || rebookDismissed) return null;
    const key = normPhoneRB(savedPhone);
    const mine = appointments.filter(a => normPhoneRB(a.phone) === key && a.status !== 'cancelada');
    if (mine.length === 0) return null;

    // Identidad: la cita más reciente que creó
    const latest = [...mine].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];

    // Favoritos por frecuencia (preferir completadas)
    const pool = mine.filter(a => a.status === 'completada');
    const source = pool.length > 0 ? pool : mine;
    const freq = (arr) => {
      const f = {};
      arr.forEach(v => { if (v != null) f[v] = (f[v] || 0) + 1; });
      return Object.entries(f).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    };
    const favServiceId = freq(source.map(a => String(a.service?.id ?? "")));
    const favBarberId = freq(source.map(a => String(a.barberId)));

    const service = SERVICES.find(s => String(s.id) === favServiceId)
      || SERVICES.find(s => s.name === source[0]?.service?.name);
    const barber = barbers.filter(b => b.active).find(b => String(b.id) === favBarberId);
    if (!service || !barber) return null;

    const slot = findNextAvailableSlot(barbershopConfig, appointments, blocks, barber.id);
    if (!slot) return null;

    return {
      name: latest.client || "",
      firstName: (latest.client || "").trim().split(/\s+/)[0] || "",
      phone: latest.phone || savedPhone,
      email: latest.client_email || "",
      service, barber, slot,
    };
  }, [savedPhone, rebookDismissed, appointments, barbers, blocks, barbershopConfig, SERVICES]);

  const handleRebookOneTap = () => {
    if (!rebook) return;
    setForm(f => ({
      ...f,
      client: rebook.name,
      phone: rebook.phone,
      email: rebook.email,
      barberId: rebook.barber.id,
      serviceId: rebook.service.id,
      date: rebook.slot.date,
      time: rebook.slot.time,
    }));
    setStep(4);
  };

  const handleRebookChooseTime = () => {
    if (!rebook) return;
    setForm(f => ({
      ...f,
      client: rebook.name,
      phone: rebook.phone,
      email: rebook.email,
      barberId: rebook.barber.id,
      serviceId: rebook.service.id,
      date: "",
      time: "",
    }));
    setStep(3);
  };

  // Ahora sí el loading puede ir aquí, después de todos los hooks
  if (loading) return <LoadingScreen />;

  const activeBarbers = barbers.filter(b => b.active);

  // ✅ FIX #2: Comparar IDs como string, no con Number()
  const selectedBarber = activeBarbers.find(b => b.id === form.barberId);
  const selectedService = SERVICES.find(s => String(s.id) === String(form.serviceId));
  const takenTimes = getTakenTimes(appointments, form.barberId, form.date);
  const blockedTimes = getBlockedTimes(blocks, form.barberId, form.date);
  const isFullDayBlocked = blockedTimes.includes('FULL_DAY');

  const update = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: null }));
  };

  const validateStep1 = () => {
    const errs = {};
    if (!validateName(form.client)) errs.client = t("Ingresa tu nombre completo (mínimo 3 caracteres)");
    if (!form.phone || !validatePhone(form.phone)) errs.phone = t("Teléfono obligatorio (mínimo 10 dígitos)");
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t("Email válido obligatorio");
    if (!form.barberId) errs.barberId = t("Selecciona un barbero");
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
    // 0. Límite de citas del mes según el plan de la barbería
    const plan = getPlan(barbershopConfig);
    if (plan.maxCitasMes != null && citasDelMes(appointments) >= plan.maxCitasMes) {
      alert(t('⚠ La agenda de este mes está llena. Contacta directamente a la barbería para agendar.'));
      return;
    }

    // 1. Validar teléfono (solo dígitos, espacios, +, -, paréntesis)
    const cleanPhone = form.phone.trim();
    if (!/^[\d\s+\-()]{8,20}$/.test(cleanPhone)) {
      alert(t('⚠ Número de teléfono inválido'));
      return;
    }

    // 2. Validar nombre (sin caracteres raros)
    const cleanName = form.client.trim();
    if (cleanName.length < 2 || cleanName.length > 100) {
      alert(t('⚠ Nombre inválido'));
      return;
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s.'-]+$/.test(cleanName)) {
      alert(t('⚠ El nombre solo puede contener letras'));
      return;
    }

    // 3. Validar que la fecha sea hoy o futuro
    const todayStr = new Date().toISOString().split('T')[0];
    if (form.date < todayStr) {
      alert(t('⚠ No puedes agendar citas en fechas pasadas'));
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
        alert(t('⚠ Ya tienes 2 citas para esta fecha con este número. Si necesitas más, contacta directamente a la barbería.'));
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
      alert(t('⚠ Demasiadas citas en poco tiempo. Espera unos minutos.'));
      return;
    }

    const newAppt = await addAppointment({
      client: cleanName,
      phone: cleanPhone,
      client_email: form.email.trim().toLowerCase(),
      barberId: form.barberId,
      service: selectedService,
      date: form.date,
      time: form.time,
      notes: form.notes.trim().slice(0, 500),
      productos: carrito.length > 0 ? carrito.map(p => ({ id: p.id, name: p.name, price: p.price, qty: p.qty, image: p.image || '' })) : null,
      totalProductos: carrito.length > 0 ? totalProductos : null,
    });
    if (newAppt) {
      savePhoneForRebook(cleanPhone); // recordarlo para "agendar de nuevo en 1 toque"
      setCompletedAppointment({ ...newAppt, barber: selectedBarber });
      setDone(true);
    }
  };

  const reset = () => {
    setForm({ client: "", phone: "", email: "", barberId: "", serviceId: "", date: "", time: "", notes: "" });
    setCarrito([]);
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
            barbershop={barbershopConfig}
            carrito={carrito}
            productos={getPlan(barbershopConfig).catalogo && barbershopConfig?.productos_activos !== false ? productos : []}
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
            carrito={carrito}
            agregarProducto={agregarProducto}
            quitarProducto={quitarProducto}
            totalProductos={totalProductos}
            rebook={rebook}
            onRebookOneTap={handleRebookOneTap}
            onRebookChooseTime={handleRebookChooseTime}
            onRebookDismiss={() => setRebookDismissed(true)}
          />
        )}
      </main>
    </div>
  );
}

// ==================== BOOKING FLOW ====================
function BookingFlow({ form, update, step, setStep, errors, barbers, selectedBarber, selectedService, takenTimes, blockedTimes, isFullDayBlocked, handleNext, handleSubmit, carrito, agregarProducto, quitarProducto, totalProductos, rebook, onRebookOneTap, onRebookChooseTime, onRebookDismiss }) {
  const { barbershopConfig } = useApp();
  const t = useT(barbershopConfig?.idioma);
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 className="section-title" style={{ marginBottom: 6 }}>
          {t("Agenda tu")} <span className="gold">{t("cita")}</span>
        </h1>
        <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>{t("Reserva en línea de forma rápida y sencilla")}</p>
      </div>

      {/* Cliente recurrente: agendar de nuevo en 1 toque */}
      {step === 1 && rebook && (
        <RebookCard
          rebook={rebook}
          idioma={barbershopConfig?.idioma}
          onOneTap={onRebookOneTap}
          onChooseTime={onRebookChooseTime}
          onDismiss={onRebookDismiss}
        />
      )}

      <StepsIndicator currentStep={step} steps={STEPS} idioma={barbershopConfig?.idioma} />
      {step === 1 && <Step1ClientInfo form={form} update={update} errors={errors} barbers={barbers} selectedBarber={selectedBarber} onNext={handleNext} />}
      {step === 2 && <Step2Service form={form} update={update} carrito={carrito} agregarProducto={agregarProducto} quitarProducto={quitarProducto} onBack={() => setStep(1)} onNext={handleNext} />}
      {step === 3 && <Step3DateTime form={form} update={update} takenTimes={takenTimes} blockedTimes={blockedTimes} isFullDayBlocked={isFullDayBlocked} onBack={() => setStep(2)} onNext={handleNext} />}
      {step === 4 && <Step4Confirm form={form} selectedBarber={selectedBarber} selectedService={selectedService} carrito={carrito} quitarProducto={quitarProducto} totalProductos={totalProductos} onBack={() => setStep(3)} onSubmit={handleSubmit} />}

      {/* Resumen persistente de la reserva (pasos 2 y 3) */}
      {step >= 2 && step < 4 && selectedBarber && (
        <BookingSummaryBar
          barber={selectedBarber}
          service={selectedService}
          date={form.date}
          time={form.time}
          totalProductos={totalProductos}
          idioma={barbershopConfig?.idioma}
        />
      )}
    </div>
  );
}

// ==================== BOOKING SUMMARY BAR ====================
// Barra fija inferior: el cliente siempre ve lo que lleva elegido y el total
function BookingSummaryBar({ barber, service, date, time, totalProductos, idioma }) {
  const t = useT(idioma);
  const total = (service?.price || 0) + (totalProductos || 0);

  const Chip = ({ icon, children, muted }) => (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 12, fontWeight: 600,
      color: muted ? "var(--text-dim)" : "var(--text-secondary)",
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      maxWidth: 180
    }}>
      <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{children}</span>
    </span>
  );

  return (
    <>
      {/* Empuja el contenido para que la barra no tape los botones */}
      <div style={{ height: 74 }} aria-hidden="true" />

      <div className="fade-in booking-summary-bar">
        <div style={{
          maxWidth: 700, margin: "0 auto",
          display: "flex", alignItems: "center", gap: 12
        }}>
          <div style={{
            flex: 1, minWidth: 0,
            display: "flex", alignItems: "center", gap: 14,
            overflow: "hidden", flexWrap: "wrap", rowGap: 4
          }}>
            <Chip icon="💈">{barber.name}</Chip>
            {service
              ? <Chip icon="✂️">{service.name}</Chip>
              : <Chip icon="✂️" muted>{t("Elige servicio")}</Chip>}
            {(date && time)
              ? <Chip icon="📅">{formatDate(date, idioma)} · {time}</Chip>
              : <Chip icon="📅" muted>{t("Elige fecha y hora")}</Chip>}
          </div>

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("Total")}
            </p>
            <p style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 22, fontWeight: 800, color: "var(--accent)", lineHeight: 1
            }}>
              {formatCurrency(total)}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== REBOOK CARD ====================
// Tarjeta para clientes recurrentes: repite su corte habitual en 1 toque
function RebookCard({ rebook, idioma, onOneTap, onChooseTime, onDismiss }) {
  const t = useT(idioma);
  return (
    <div className="fade-in-up" style={{
      position: "relative",
      background: "linear-gradient(135deg, var(--accent-bg), var(--bg-elevated))",
      border: "1.5px solid var(--accent-border)",
      borderRadius: 16,
      padding: "18px 20px",
      marginBottom: 26,
      boxShadow: "0 6px 24px rgba(var(--accent-rgb), 0.12)"
    }}>
      <button
        onClick={onDismiss}
        aria-label={t("Cerrar")}
        style={{
          position: "absolute", top: 10, right: 10,
          background: "transparent", border: "none",
          color: "var(--text-muted)", fontSize: 15, cursor: "pointer",
          width: 28, height: 28, borderRadius: 8, lineHeight: 1
        }}
      >✕</button>

      <p style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 20, fontWeight: 800, color: "var(--text-primary)",
        letterSpacing: 0.3, marginBottom: 4
      }}>
        {t("Hola")} {rebook.firstName} 👋
      </p>
      <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 12 }}>
        {t("¿Repetimos tu corte de siempre?")}
      </p>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
          ✂️ {rebook.service.name} · <span style={{ color: "var(--accent)" }}>{formatCurrency(rebook.service.price)}</span>
        </span>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
          💈 {rebook.barber.name}
        </span>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
          📅 {formatDate(rebook.slot.date, idioma)} · {rebook.slot.time}
        </span>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn-gold" onClick={onOneTap} style={{ fontSize: 14, padding: "12px 22px" }}>
          ⚡ {t("Agendar en 1 toque")}
        </button>
        <button
          onClick={onChooseTime}
          style={{
            background: "transparent",
            border: "1px solid var(--border-strong)",
            color: "var(--text-secondary)",
            borderRadius: 10, padding: "12px 18px",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: "uppercase", letterSpacing: 0.5,
            transition: "border-color 0.2s, color 0.2s"
          }}
          onMouseEnter={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.color = "var(--accent)"; }}
          onMouseLeave={e => { e.target.style.borderColor = "var(--border-strong)"; e.target.style.color = "var(--text-secondary)"; }}
        >
          {t("Prefiero otro horario")}
        </button>
      </div>
    </div>
  );
}

// ==================== STEPS INDICATOR ====================
function StepsIndicator({ currentStep, steps, idioma }) {
  const t = useT(idioma);
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
                background: isDone ? "var(--accent)" : isActive ? "linear-gradient(135deg, var(--accent), var(--accent-light))" : "var(--bg-elevated-2)",
                border: `2px solid ${isDone || isActive ? "var(--accent)" : "var(--border-strong)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800,
                color: (isDone || isActive) ? "var(--bg-main)" : "var(--text-dim)",
                transition: "all 0.3s",
                boxShadow: isActive ? "0 0 16px rgba(var(--accent-rgb),0.5)" : "none",
                fontFamily: "'Barlow Condensed', sans-serif"
              }}>
                {isDone ? "✓" : s.num}
              </div>
              <span style={{
                fontSize: 11,
                color: isActive ? "var(--accent)" : isDone ? "var(--text-secondary)" : "var(--text-dim)",
                marginTop: 8,
                fontWeight: isActive ? 700 : 500,
                textAlign: "center",
                textTransform: "uppercase",
                letterSpacing: 0.5
              }}>{t(s.label)}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2,
                background: currentStep > s.num ? "var(--accent)" : "var(--border)",
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
  const { barbershopConfig } = useApp();
  const t = useT(barbershopConfig?.idioma);
  return (
    <div className="fade-in card booking-card">
      <div style={{ marginBottom: 24 }}>
        <span style={{
          display: "inline-block",
          padding: "4px 12px",
          background: "var(--accent-bg)",
          color: "var(--accent-light, var(--accent-light))",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginBottom: 8
        }}>
          {t("Paso 1: Tus datos")}
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
          {t("Datos")} <span className="gold">{t("personales")}</span>
        </h3>
        <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
          {t("Y elige a tu barbero preferido")}
        </p>
      </div>

      <div style={{ display: "grid", gap: 18, marginBottom: 24 }}>
        <FormField label={t("Nombre completo *")} error={errors.client}>
          <input value={form.client} onChange={e => update("client", e.target.value)} placeholder={t("Ej. Juan García")} />
        </FormField>
        <FormField label={t("Teléfono *")} hint={t("Para confirmar tu cita por WhatsApp")} error={errors.phone}>
          <input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="81 1234 5678" type="tel" />
        </FormField>
        <FormField label={t("Email *")} hint={t("Te enviaremos la confirmación de tu cita")} error={errors.email}>
          <input value={form.email} onChange={e => update("email", e.target.value)} placeholder={t("tu@email.com")} type="email" />
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
        {t("Elige a tu barbero *")}
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
                boxShadow: isSelected ? "0 8px 24px rgba(var(--accent-rgb),0.2)" : "none"
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
                background: b.photo ? "transparent" : b.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 20,
                color: b.color,
                marginBottom: 12,
                border: isSelected ? `2px solid ${b.color}` : "none",
                overflow: "hidden"
              }}>
                {b.photo ? (
                  <img src={b.photo} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : b.avatar}
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
          {t("Siguiente →")}
        </button>
      </div>
    </div>
  );
}

// ==================== STEP 2 ====================
function Step2Service({ form, update, carrito = [], agregarProducto, quitarProducto, onBack, onNext }) {
  const { services: firebaseServices, productos, barbershopConfig } = useApp();
  const t = useT(barbershopConfig?.idioma);
  const SERVICES = firebaseServices && firebaseServices.length > 0 ? firebaseServices : DEFAULT_SERVICES;

  // Mapa de emojis por servicio (id puede ser número o string)
  const getEmoji = (id) => {
    const emojiMap = {
      1: "✂️", 2: "💈", 3: "🔥", 4: "🧔", 5: "👦", 6: "✨"
    };
    return emojiMap[id] || "✂️";
  };

  return (
    <div className="fade-in card booking-card">
      <div style={{ marginBottom: 24 }}>
        <span style={{
          display: "inline-block",
          padding: "4px 12px",
          background: "var(--accent-bg)",
          color: "var(--accent-light, var(--accent-light))",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginBottom: 8
        }}>
          {t("Paso 2: Servicio")}
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
          {t("¿Qué te")} <span className="gold">{t("haces")}</span> {t("hoy?")}
        </h3>
        <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
          {t("Selecciona el servicio que necesitas")}
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        gap: 10
      }}>
        {SERVICES.map(s => {
          const isSelected = form.serviceId === s.id;
          const emoji = s.emoji || getEmoji(s.id);
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
                background: isSelected ? "rgba(var(--accent-rgb),0.15)" : "var(--bg-elevated-2)",
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
                  ⏱ {s.duration} {t("min")}
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

      {/* Productos disponibles */}
      {getPlan(barbershopConfig).catalogo && barbershopConfig?.productos_activos !== false && productos && productos.length > 0 && (
        <div style={{ marginTop: 32, borderTop: "1px solid var(--border)", paddingTop: 28 }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>
            {t("También disponible")}
          </p>
          <p style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", marginBottom: 16 }}>
            {t("Productos de la barbería")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
            {productos.map(p => {
              const agotado = p.cantidad === 0;
              const enCarrito = carrito.find(i => i.id === p.id);
              return (
                <div key={p.id} style={{
                  background: enCarrito ? "var(--accent-bg)" : "var(--bg-elevated)",
                  border: `1.5px solid ${enCarrito ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 10, overflow: "hidden", opacity: agotado ? 0.6 : 1,
                  transition: "all 0.2s"
                }}>
                  <div style={{ height: 110, background: "var(--bg-input)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    {p.image
                      ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 30 }}>📦</span>
                    }
                    {agotado && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#ef4444", fontWeight: 800, fontSize: 10, letterSpacing: 1 }}>{t("AGOTADO")}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <p style={{ fontWeight: 700, fontSize: 12, color: "var(--text-primary)", marginBottom: 2, lineHeight: 1.3 }}>{p.name}</p>
                    {p.description && (
                      <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {p.description}
                      </p>
                    )}
                    {p.cantidad > 0 && p.cantidad <= 5 && (
                      <p style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, marginBottom: 4 }}>{t("Últimas")} {p.cantidad}</p>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                      <p style={{ fontWeight: 800, fontSize: 15, color: "var(--accent)", fontFamily: "'Barlow Condensed', sans-serif" }}>${p.price}</p>
                      {!agotado && (
                        enCarrito ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button onClick={() => quitarProducto(p.id)} style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>−</button>
                            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--accent)", minWidth: 16, textAlign: "center" }}>{enCarrito.qty}</span>
                            <button onClick={() => agregarProducto(p)} style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent)", border: "none", color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>+</button>
                          </div>
                        ) : (
                          <button onClick={() => agregarProducto(p)} style={{ background: "var(--accent)", border: "none", color: "white", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Barlow', sans-serif" }}>
                            {t("+ Agregar")}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mini resumen del carrito */}
          {carrito.length > 0 && (
            <div style={{ marginTop: 14, background: "var(--accent-bg)", border: "1px solid var(--accent-border)", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
                {carrito.reduce((s, i) => s + i.qty, 0)} {t(carrito.reduce((s, i) => s + i.qty, 0) !== 1 ? "productos" : "producto")} {barbershopConfig?.idioma === 'en' ? 'selected' : (carrito.reduce((s, i) => s + i.qty, 0) !== 1 ? 'seleccionados' : 'seleccionado')}
              </span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)", fontFamily: "'Barlow Condensed', sans-serif" }}>
                +${carrito.reduce((s, i) => s + i.price * i.qty, 0).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between" }}>
        <button className="btn-ghost" onClick={onBack}>{t("← Atrás")}</button>
        <button className="btn-gold" onClick={onNext} disabled={!form.serviceId}>{t("Siguiente →")}</button>
      </div>
    </div>
  );
}

// ==================== STEP 3 ====================
function Step3DateTime({ form, update, takenTimes, blockedTimes, isFullDayBlocked, onBack, onNext }) {
  const { barbershopConfig } = useApp();
  const t = useT(barbershopConfig?.idioma);
  const horario = barbershopConfig?.horario || {};

  // Generar slots dinámicamente desde la config
  const generateHours = () => {
    const inicio = horario.hora_inicio || '09:00';
    const fin = horario.hora_fin || '20:00';
    const dur = horario.duracion || 30;
    const slots = [];
    const [startH, startM] = inicio.split(':').map(Number);
    const [endH, endM] = fin.split(':').map(Number);
    let cur = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    while (cur + dur <= endMin) {
      const h = String(Math.floor(cur / 60)).padStart(2, '0');
      const m = String(cur % 60).padStart(2, '0');
      slots.push(`${h}:${m}`);
      cur += dur;
    }
    return slots.length > 0 ? slots : ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30'];
  };

  const HOURS = generateHours();

  // Dias de la semana keys
  const DAY_KEYS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

  // Verificar si un día está activo
  const isDayActive = (dateStr) => {
    if (!horario.dias_activos) return true; // sin config = todos activos
    const dayIndex = new Date(dateStr + 'T12:00').getDay();
    const dayKey = DAY_KEYS[dayIndex];
    return horario.dias_activos[dayKey] !== false;
  };

  // Obtener solo días activos para los próximos 14 días
  const allDays = getNext7Days(14, barbershopConfig?.idioma); // extendemos a 14 para tener suficientes días activos
  const days = allDays.filter(d => isDayActive(d.date)).slice(0, 7);

  const blockedHoursOnly = (blockedTimes || []).filter(t => t !== 'FULL_DAY');

  return (
    <div className="fade-in card booking-card">
      <div style={{ marginBottom: 24 }}>
        <span style={{
          display: "inline-block",
          padding: "4px 12px",
          background: "var(--accent-bg)",
          color: "var(--accent-light, var(--accent-light))",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginBottom: 8
        }}>
          {t("Paso 3: Fecha y hora")}
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
          {t("¿Cuándo")} <span className="gold">{t("puedes")}</span>?
        </h3>
        <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
          {t("Elige fecha y hora disponibles")}
        </p>
      </div>

      {/* Fechas - Scroll horizontal */}
      <div style={{ marginBottom: 28 }}>
        <label style={{
          fontSize: 11, color: "var(--text-tertiary)",
          display: "block", marginBottom: 12,
          fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5
        }}>
          {t("📅 Fecha")}
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
                    ? "linear-gradient(135deg, var(--accent), var(--accent-light, var(--accent-light)))"
                    : "var(--bg-elevated)",
                  cursor: "pointer",
                  textAlign: "center",
                  minWidth: 68,
                  flexShrink: 0,
                  transition: "all 0.25s",
                  transform: isSelected ? "translateY(-2px)" : "none",
                  boxShadow: isSelected ? "0 8px 20px rgba(var(--accent-rgb),0.3)" : "none"
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
            {t("Este día no está disponible")}
          </p>
          <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginTop: 4 }}>
            {t("Por favor elige otra fecha")}
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
            {t("⏰ Hora disponible")}
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
                      ? "linear-gradient(135deg, var(--accent), var(--accent-light, var(--accent-light)))"
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
                    boxShadow: isSelected ? "0 4px 14px rgba(var(--accent-rgb),0.35)" : "none"
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
              {t("Los horarios tachados no están disponibles")}
            </p>
          )}
        </div>
      )}

      <FormField label={t("Notas adicionales (opcional)")}>
        <textarea
          value={form.notes}
          onChange={e => update("notes", e.target.value)}
          placeholder={t("Ej. Degradado bajo, barba recortada...")}
          rows={3}
          style={{ resize: "none" }}
        />
      </FormField>

      <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between" }}>
        <button className="btn-ghost" onClick={onBack}>{t("← Atrás")}</button>
        <button className="btn-gold" onClick={onNext} disabled={!form.date || !form.time || isFullDayBlocked}>{t("Siguiente →")}</button>
      </div>
    </div>
  );
}

// ==================== STEP 4 ====================
function Step4Confirm({ form, selectedBarber, selectedService, carrito = [], quitarProducto, totalProductos = 0, onBack, onSubmit }) {
  const { barbershopConfig } = useApp();
  const t = useT(barbershopConfig?.idioma);
  const [submitting, setSubmitting] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleClick = async () => {
    if (!acceptPrivacy) {
      alert(t('⚠ Debes aceptar el aviso de privacidad para continuar'));
      return;
    }
    setSubmitting(true);
    await onSubmit();
    setSubmitting(false);
  };

  const summary = [
    [t("Cliente"), form.client],
    [t("Teléfono"), form.phone || "—"],
    [t("Barbero"), selectedBarber?.name || "—"],
    [t("Servicio"), selectedService?.name || "—"],
    [t("Duración"), `${selectedService?.duration || 0} ${t("min")}`],
    [t("Fecha"), formatDate(form.date, barbershopConfig?.idioma)],
    [t("Hora"), form.time],
  ];

  return (
    <div className="fade-in card booking-card">
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "var(--text-secondary)" }}>{t("Confirma tu cita")}</h3>
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
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{t("Notas")}</p>
            <p style={{ fontSize: 14, fontStyle: "italic" }}>"{form.notes}"</p>
          </div>
        )}
      </div>
      {/* Productos seleccionados */}
      {carrito.length > 0 && (
        <div style={{ background: "var(--bg-elevated-2)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, padding: "12px 16px 0" }}>
            {t("Productos seleccionados")}
          </p>
          {carrito.map((item, i) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: i < carrito.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 6, overflow: "hidden", background: "var(--bg-input)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {item.image ? <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>📦</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{item.name}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)" }}>x{item.qty} · ${item.price} {barbershopConfig?.idioma === "en" ? "each" : "c/u"}</p>
              </div>
              <p style={{ fontWeight: 700, fontSize: 14, color: "var(--accent)", fontFamily: "'Barlow Condensed', sans-serif" }}>${(item.price * item.qty).toLocaleString()}</p>
              <button onClick={() => { for(let i = 0; i < item.qty; i++) quitarProducto(item.id); }} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, padding: "2px 4px" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div style={{ background: "var(--accent-bg)", border: "1px solid var(--accent-border)", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        {carrito.length > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t("Corte / servicio")}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{formatCurrency(selectedService?.price || 0)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, paddingBottom: 12, borderBottom: "1px dashed var(--accent-border)" }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t("Productos")} ({carrito.reduce((s,i) => s+i.qty, 0)})</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{formatCurrency(totalProductos)}</span>
            </div>
          </>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ color: "var(--accent)", fontSize: 14, fontWeight: 700 }}>{t("Total a pagar")}</p>
            <p style={{ color: "var(--text-tertiary)", fontSize: 11, marginTop: 2 }}>{t("Pago en sucursal")}</p>
          </div>
          <span style={{ color: "var(--accent)", fontSize: 30, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif" }}>
            {formatCurrency((selectedService?.price || 0) + totalProductos)}
          </span>
        </div>
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
            style={{ marginTop: 3, accentColor: "var(--accent)", width: 16, height: 16, cursor: "pointer" }}
          />
          <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {t("Acepto el")}{' '}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowPrivacyModal(true); }}
              style={{ background: "transparent", border: "none", color: "var(--accent)", padding: 0, textDecoration: "underline", cursor: "pointer", font: "inherit" }}
            >
              {t("aviso de privacidad")}
            </button>
            {' '}{t("y autorizo el uso de mis datos para gestionar mi cita.")}
          </span>
        </label>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="btn-ghost" onClick={onBack} disabled={submitting}>{t("← Editar")}</button>
        <button className="btn-gold" onClick={handleClick} disabled={submitting || !acceptPrivacy}>
          {submitting ? t("Guardando...") : t("Confirmar cita ✓")}
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
                {t("🔒 Aviso de Privacidad")}
              </h2>
              <button
                onClick={() => setShowPrivacyModal(false)}
                style={{ background: "transparent", border: "none", fontSize: 24, cursor: "pointer", color: "var(--text-tertiary)", padding: 0 }}
              >×</button>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)" }}>
              <p style={{ marginBottom: 12 }}>
                <strong>{t("Responsable del tratamiento de datos:")}</strong> {t("La barbería con la que estás agendando tu cita.")}
              </p>
              <p style={{ marginBottom: 12 }}>
                <strong>{t("Datos que recabamos:")}</strong>
              </p>
              <ul style={{ marginLeft: 20, marginBottom: 12 }}>
                <li>{t("Nombre completo")}</li>
                <li>{t("Número de teléfono")}</li>
                <li>{t("Fecha y hora de cita")}</li>
                <li>{t("Servicio solicitado")}</li>
              </ul>
              <p style={{ marginBottom: 12 }}>
                <strong>{t("Finalidad:")}</strong> {t("Tus datos son usados ÚNICAMENTE para:")}
              </p>
              <ul style={{ marginLeft: 20, marginBottom: 12 }}>
                <li>{t("Confirmar y gestionar tu cita")}</li>
                <li>{t("Contactarte si hay cambios o cancelaciones")}</li>
                <li>{t("Llevar un historial de servicios prestados")}</li>
              </ul>
              <p style={{ marginBottom: 12 }}>
                <strong>{t("No compartimos:")}</strong> {t("Tus datos NO se venden, NO se comparten con terceros ni se usan para fines publicitarios o de marketing sin tu consentimiento expreso.")}
              </p>
              <p style={{ marginBottom: 12 }}>
                <strong>{t("Tus derechos (ARCO):")}</strong> {t("Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos en cualquier momento. Solo contacta directamente a la barbería.")}
              </p>
              <p style={{ marginBottom: 12 }}>
                <strong>{t("Almacenamiento:")}</strong> {t("Los datos se almacenan de forma segura en servidores con cifrado. Solo el administrador autorizado de la barbería puede acceder a la información completa.")}
              </p>
              <p style={{ marginBottom: 16, fontSize: 12, color: "var(--text-muted)" }}>
                {t("Este aviso cumple con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) de México.")}
              </p>
              <button
                onClick={() => { setAcceptPrivacy(true); setShowPrivacyModal(false); }}
                className="btn-gold"
                style={{ width: "100%" }}
              >
                {t("Aceptar y cerrar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SUCCESS VIEW ====================
function SuccessView({ appointment, barbershop, carrito = [], productos = [], onReset, onExit }) {
  const { barbershopConfig } = useApp();
  const t = useT(barbershopConfig?.idioma);
  const idioma = barbershopConfig?.idioma;
  const folioId = appointment?.folio || (appointment?.id ? String(appointment.id).slice(-6).toUpperCase() : "------");
  const totalProductos = carrito.reduce((s, i) => s + i.price * i.qty, 0);
  const totalCorte = appointment.service?.price || 0;
  const totalFinal = totalCorte + totalProductos;

  return (
    <div className="fade-in" style={{ textAlign: "center", padding: "40px 20px" }}>
      {/* Ícono de éxito */}
      <div className="pop-in" style={{ width: 80, height: 80, background: "var(--success-bg)", border: "2px solid var(--success)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", boxShadow: "0 0 0 8px rgba(74, 222, 128, 0.09)" }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>

      <h2 className="section-title" style={{ fontSize: 36, marginBottom: 12 }}>{idioma === 'en' ? '' : '¡'}<span className="gold">{t("Cita")}</span> {t("agendada!")}</h2>
      <p style={{ color: "var(--text-tertiary)", marginBottom: 28, fontSize: 16 }}>
        {t("Te esperamos,")} <strong style={{ color: "var(--text-primary)" }}>{appointment.client}</strong>
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
              {t("Te atenderá")}
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
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{t("Comprobante")}</p>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--accent)", letterSpacing: 1 }}>#{folioId}</p>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <ReceiptRow label={t("Servicio")} value={appointment.service?.name || "—"} />
          <ReceiptRow label={t("Barbero")} value={appointment.barber?.name || "—"} />
          <ReceiptRow label={t("Fecha")} value={formatDate(appointment.date, idioma)} />
          <ReceiptRow label={t("Hora")} value={appointment.time} />
          <ReceiptRow label={t("Duración")} value={`${appointment.service?.duration || 0} ${t("min")}`} />
        </div>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed var(--border-strong)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{t("Total")}</span>
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
          <p style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, marginBottom: 6 }}>{t("📍 Ubicación")}</p>
          {barbershop.direccion && <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{barbershop.direccion}</p>}
          {barbershop.telefono && <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>📞 {barbershop.telefono}</p>}
        </div>
      )}

      {/* Resumen de carrito si trajo productos */}
      {carrito.length > 0 && (
        <div style={{ maxWidth: 480, margin: "0 auto 28px", textAlign: "left" }}>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
              {t("Productos seleccionados")}
            </p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {t("Menciona tu folio al llegar para reclamarlos")}
            </p>
          </div>

          <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            {carrito.map((item, i) => (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                borderBottom: i < carrito.length - 1 ? "1px solid var(--border)" : "none"
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", background: "var(--bg-input)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.image ? <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 20 }}>📦</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{item.name}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>x{item.qty} · ${item.price} {idioma === "en" ? "each" : "c/u"}</p>
                </div>
                <p style={{ fontWeight: 800, fontSize: 15, color: "var(--accent)", fontFamily: "'Barlow Condensed', sans-serif" }}>
                  ${(item.price * item.qty).toLocaleString()}
                </p>
              </div>
            ))}

            {/* Subtotales */}
            <div style={{ padding: "12px 16px", background: "var(--bg-input)", borderTop: "1px dashed var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("Corte / servicio")}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>${totalCorte.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("Productos")} ({carrito.reduce((s,i)=>s+i.qty,0)})</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>${totalProductos.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{t("Total a pagar en tienda")}</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)", fontFamily: "'Barlow Condensed', sans-serif" }}>
                  ${totalFinal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Productos sugeridos si NO trajo carrito */}
      {carrito.length === 0 && productos.length > 0 && (
        <div style={{ maxWidth: 480, margin: "0 auto 32px", textAlign: "left" }}>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 28, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
              {t("Mientras esperas tu cita")}
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
              {t("Productos disponibles en nuestra barbería")}
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
            {productos.slice(0, 4).map(p => (
              <div key={p.id} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ height: 100, background: "var(--bg-input)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {p.image ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 28 }}>📦</span>}
                </div>
                <div style={{ padding: "8px 10px" }}>
                  <p style={{ fontWeight: 700, fontSize: 12, color: "var(--text-primary)", marginBottom: 2 }}>{p.name}</p>
                  <p style={{ fontWeight: 800, fontSize: 14, color: "var(--accent)", fontFamily: "'Barlow Condensed', sans-serif" }}>${p.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn-ghost" onClick={onExit}>{t("Volver al inicio")}</button>
        <button className="btn-gold" onClick={onReset}>{t("Agendar otra cita")}</button>
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
        <div style={{ width: 56, height: 56, border: "3px solid var(--border)", borderTop: "3px solid var(--accent)", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "var(--text-tertiary)", fontFamily: "'Barlow', sans-serif" }}>Conectando con Firebase...</p>
      </div>
    </div>
  );
}
