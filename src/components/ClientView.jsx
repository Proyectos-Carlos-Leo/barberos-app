import { useState } from 'react';
import { useApp } from '../context/AppContext';
import ConfirmModal from './ConfirmModal';

const DEFAULT_SERVICES = [
  { id: '1', name: 'Corte clásico', duration: 30, price: 150 },
  { id: '2', name: 'Corte + Barba', duration: 45, price: 220 },
  { id: '3', name: 'Barba completa', duration: 30, price: 100 },
];

export default function ClientView() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ client: '', phone: '', email: '', barberId: '', serviceId: '', date: '', time: '', notes: '' });
  const [citas, setCitas] = useState([]);
  const [errors, setErrors] = useState({});
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [done, setDone] = useState(false);
  const [completedAppointment, setCompletedAppointment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { appointments, barbers, blocks, services: firebaseServices, addAppointment, loading, barbershopConfig } = useApp();
  const SERVICES = firebaseServices && firebaseServices.length > 0 ? firebaseServices : DEFAULT_SERVICES;

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <div style={{ width: 48, height: 48, border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const activeBarbers = barbers.filter(b => b.active);
  const selectedBarber = activeBarbers.find(b => b.id === form.barberId);
  const selectedService = SERVICES.find(s => String(s.id) === String(form.serviceId));

  const getTakenTimes = (appts, barberId, date) =>
    appts.filter(a => a.barberId === barberId && a.date === date && a.status !== 'cancelada').map(a => a.time);

  const getBlockedTimes = (blks, barberId, date) =>
    blks.filter(b => b.barberId === barberId && b.date === date).flatMap(b => {
      const times = [];
      const h1 = parseInt(b.horaInicio?.split(':')[0] || 0);
      const h2 = parseInt(b.horaFin?.split(':')[0] || 0);
      for (let h = h1; h <= h2; h++) times.push(`${String(h).padStart(2, '0')}:00`);
      return times;
    });

  const validateName = name => name && name.trim().length >= 3;
  const validatePhone = phone => /^\d{8,20}$/.test(phone.replace(/\D/g, ''));

  const handleNext = () => {
    if (step === 1) {
      if (!acceptPrivacy) { setErrors({ privacy: 'Debes aceptar el aviso de privacidad para continuar' }); return; }
      setErrors({}); setStep(2);
    } else if (step === 2) {
      const errs = {};
      if (!validateName(form.client)) errs.client = 'Ingresa tu nombre completo';
      if (!form.phone || !validatePhone(form.phone)) errs.phone = 'Ingresa un número de teléfono válido';
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Ingresa tu correo electrónico';
      setErrors(errs);
      if (Object.keys(errs).length === 0) setStep(3);
    } else if (step === 3) {
      if (!form.barberId) { setErrors({ barberId: 'Elige con quién quieres tu cita' }); return; }
      setErrors({}); setStep(4);
    } else if (step === 4) {
      if (!form.serviceId) { setErrors({ serviceId: 'Elige uno de los servicios' }); return; }
      setErrors({}); setStep(5);
    } else if (step === 5) {
      const errs = {};
      if (!form.date) errs.date = 'Selecciona el día';
      if (!form.time) errs.time = 'Elige un horario';
      setErrors(errs);
      if (Object.keys(errs).length === 0) setStep(6);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const newAppt = await addAppointment({
        client: form.client.trim().replace(/\s+/g, ' '),
        phone: form.phone.replace(/\D/g, ''),
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
      setErrors({ submit: 'Ocurrió un error, intenta de nuevo' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAnother = () => {
    setForm({ client: form.client, phone: form.phone, email: form.email, barberId: '', serviceId: '', date: '', time: '', notes: '' });
    setDone(false);
    setCompletedAppointment(null);
    setStep(3);
  };

  const handleReset = () => {
    setForm({ client: '', phone: '', email: '', barberId: '', serviceId: '', date: '', time: '', notes: '' });
    setStep(1); setDone(false); setCitas([]); setAcceptPrivacy(false);
  };

  const update = (field, value) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const takenTimes = getTakenTimes(appointments, form.barberId, form.date);
  const blockedTimes = getBlockedTimes(blocks, form.barberId, form.date);

  // ─── PANTALLA DE ÉXITO ───
  if (done) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: '40px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--accent-bg)', border: '2px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: 32, color: 'var(--accent)', fontWeight: 800
        }}>✓</div>
        <h1 className="section-title" style={{ marginBottom: 6 }}>¡Cita confirmada!</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: 16 }}>
          Nos vemos pronto, <strong>{completedAppointment?.client}</strong>
        </p>
        <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 12, padding: 24, marginBottom: 24, textAlign: 'left' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: 1.5, marginBottom: 8 }}>NÚMERO DE REFERENCIA</p>
          <p style={{ color: 'var(--accent)', fontSize: 34, fontWeight: 800, fontFamily: "'Courier New', monospace", marginBottom: 16, letterSpacing: 4 }}>
            {completedAppointment?.folio}
          </p>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 2 }}>
            <p><strong>Fecha:</strong> {new Date(completedAppointment?.date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p><strong>Hora:</strong> {completedAppointment?.time}</p>
            <p><strong>Barbero:</strong> {completedAppointment?.barber?.name}</p>
          </div>
        </div>
        {citas.length === 1 ? (
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-ghost" onClick={handleAddAnother} style={{ flex: 1 }}>Agendar otra cita</button>
            <button className="btn-gold" onClick={handleReset} style={{ flex: 1 }}>Listo</button>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-tertiary)', marginBottom: 16, fontSize: 13 }}>{citas.length} citas agendadas en esta sesión</p>
            <button className="btn-gold" onClick={handleReset} style={{ width: '100%' }}>Finalizar</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: '20px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', paddingTop: 20 }}>

        {/* Progreso */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {[1,2,3,4,5,6].map(s => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: s <= step ? 'var(--accent)' : 'var(--border)',
              transition: 'background 0.3s'
            }} />
          ))}
        </div>

        {/* ── STEP 1: PRIVACIDAD ── */}
        {step === 1 && (
          <div className="fade-in">
            <h1 className="section-title" style={{ marginBottom: 6 }}>
              {barbershopConfig?.nombre ? `Agenda en ${barbershopConfig.nombre}` : 'Agenda tu cita'}
            </h1>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 14, marginBottom: 28 }}>
              Solo te tomará un par de minutos.
            </p>

            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                Usaremos tu nombre, teléfono y correo únicamente para confirmar tu cita y avisarte si hay algún cambio. No compartimos tu información con nadie.
              </p>

              <div
                onClick={() => setAcceptPrivacy(!acceptPrivacy)}
                style={{
                  background: 'var(--bg-input)',
                  border: `1.5px solid ${acceptPrivacy ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 8, padding: '14px 16px',
                  cursor: 'pointer', transition: 'border-color 0.2s', marginBottom: 20
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox" checked={acceptPrivacy}
                    onChange={e => setAcceptPrivacy(e.target.checked)}
                    style={{ accentColor: 'var(--accent)', width: 18, height: 18, cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Acepto el{' '}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setShowPrivacyModal(true); }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent)', padding: 0, textDecoration: 'underline', cursor: 'pointer', font: 'inherit', fontWeight: 600 }}
                    >aviso de privacidad</button>
                    {' '}y el uso de mis datos para gestionar mi cita.
                  </span>
                </label>
              </div>

              {errors.privacy && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>{errors.privacy}</p>}

              <button className="btn-gold" onClick={handleNext} disabled={!acceptPrivacy} style={{ width: '100%' }}>
                Comenzar
              </button>
            </div>

            {showPrivacyModal && (
              <ConfirmModal
                open={showPrivacyModal}
                title="Aviso de Privacidad"
                message={`Tus datos personales serán usados para:\n\n• Confirmar y gestionar tu cita\n• Enviarte un correo de confirmación\n• Contactarte si hay algún cambio\n\nNo vendemos ni compartimos tu información con terceros. Puedes pedir que eliminemos tus datos en cualquier momento.`}
                confirmText="Entendido"
                onConfirm={() => setShowPrivacyModal(false)}
                cancelText=""
              />
            )}
          </div>
        )}

        {/* ── STEP 2: DATOS ── */}
        {step === 2 && (
          <div className="fade-in">
            <h1 className="section-title" style={{ marginBottom: 6 }}>¿Cómo te contactamos?</h1>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 14, marginBottom: 28 }}>
              Te enviaremos la confirmación de tu cita.
            </p>

            <div style={{ display: 'grid', gap: 18, marginBottom: 28 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>Tu nombre</label>
                <input value={form.client} onChange={e => update('client', e.target.value)} placeholder="Nombre completo" autoFocus />
                {errors.client && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{errors.client}</p>}
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>Teléfono</label>
                <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="81 1234 5678" type="tel" />
                {errors.phone && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{errors.phone}</p>}
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>Correo electrónico</label>
                <input value={form.email} onChange={e => update('email', e.target.value)} placeholder="tu@correo.com" type="email" />
                {errors.email && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{errors.email}</p>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>← Volver</button>
              <button className="btn-gold" onClick={handleNext} style={{ flex: 1 }}>Continuar →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: BARBERO (cards interactivas) ── */}
        {step === 3 && (
          <div className="fade-in">
            <h1 className="section-title" style={{ marginBottom: 6 }}>¿Con quién quieres tu cita?</h1>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 14, marginBottom: 24 }}>
              Elige tu barbero
            </p>

            <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
              {activeBarbers.map(b => {
                const isSelected = b.id === form.barberId;
                return (
                  <div
                    key={b.id}
                    onClick={() => update('barberId', b.id)}
                    style={{
                      background: isSelected ? 'var(--accent-bg)' : 'var(--bg-elevated)',
                      border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 12, padding: 16,
                      cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: 16,
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)'
                    }}
                  >
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: isSelected ? 'var(--accent)' : 'var(--bg-input)',
                      border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, fontWeight: 800,
                      color: isSelected ? 'white' : 'var(--text-secondary)',
                      flexShrink: 0,
                      backgroundImage: b.avatar ? `url(${b.avatar})` : 'none',
                      backgroundSize: 'cover', backgroundPosition: 'center'
                    }}>
                      {!b.avatar && b.name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 2 }}>{b.name}</p>
                      {b.specialty && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.specialty}</p>}
                    </div>
                    {isSelected && (
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--accent)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 16, flexShrink: 0
                      }}>✓</div>
                    )}
                  </div>
                );
              })}
            </div>

            {errors.barberId && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 16 }}>{errors.barberId}</p>}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-ghost" onClick={() => setStep(2)} style={{ flex: 1 }}>← Volver</button>
              <button className="btn-gold" onClick={handleNext} style={{ flex: 1 }}>Continuar →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: SERVICIO (cards interactivas) ── */}
        {step === 4 && (
          <div className="fade-in">
            <h1 className="section-title" style={{ marginBottom: 6 }}>¿Qué servicio necesitas?</h1>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 14, marginBottom: 24 }}>
              Con <strong style={{ color: 'var(--text-secondary)' }}>{selectedBarber?.name}</strong>
            </p>

            <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
              {SERVICES.map(s => {
                const isSelected = String(s.id) === String(form.serviceId);
                return (
                  <div
                    key={s.id}
                    onClick={() => update('serviceId', String(s.id))}
                    style={{
                      background: isSelected ? 'var(--accent-bg)' : 'var(--bg-elevated)',
                      border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 12, padding: 18,
                      cursor: 'pointer', transition: 'all 0.2s',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>{s.name}</p>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        <span style={{ marginRight: 12 }}>⏱ {s.duration} min</span>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{
                        fontWeight: 800, fontSize: 22,
                        color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                        fontFamily: "'Barlow Condensed', sans-serif"
                      }}>${s.price}</p>
                      {isSelected && (
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: 'var(--accent)', color: 'white',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 14, marginTop: 4
                        }}>✓</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {errors.serviceId && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 16 }}>{errors.serviceId}</p>}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-ghost" onClick={() => setStep(3)} style={{ flex: 1 }}>← Volver</button>
              <button className="btn-gold" onClick={handleNext} style={{ flex: 1 }}>Continuar →</button>
            </div>
          </div>
        )}

        {/* ── STEP 5: FECHA Y HORA ── */}
        {step === 5 && (
          <div className="fade-in">
            <h1 className="section-title" style={{ marginBottom: 6 }}>¿Cuándo estás disponible?</h1>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 14, marginBottom: 24 }}>
              {selectedService?.name} · {selectedService?.duration} min
            </p>

            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>
                Selecciona el día
              </label>
              <input type="date" value={form.date} onChange={e => { update('date', e.target.value); update('time', ''); }} />
              {errors.date && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{errors.date}</p>}
            </div>

            {form.date && (
              <div style={{ marginBottom: 22 }}>
                <label style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 10 }}>
                  Elige el horario
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: 8 }}>
                  {['08:00','09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'].map(time => {
                    const isTaken = takenTimes.includes(time) || blockedTimes.includes(time);
                    const isSelected = form.time === time;
                    return (
                      <button
                        key={time}
                        onClick={() => !isTaken && update('time', time)}
                        disabled={isTaken}
                        style={{
                          background: isSelected ? 'var(--accent)' : 'var(--bg-elevated)',
                          color: isSelected ? 'white' : isTaken ? 'var(--border)' : 'var(--text-secondary)',
                          border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 8, padding: '11px 6px',
                          fontSize: 13, fontWeight: 600,
                          cursor: isTaken ? 'not-allowed' : 'pointer',
                          textDecoration: isTaken ? 'line-through' : 'none',
                          transition: 'all 0.15s'
                        }}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
                {errors.time && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>{errors.time}</p>}
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 8 }}>
                ¿Alguna indicación especial? <span style={{ textTransform: 'none', fontWeight: 400 }}>(opcional)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={e => update('notes', e.target.value)}
                placeholder="Ej: quiero algo específico, tengo alergia a algún producto..."
                style={{ minHeight: 80 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-ghost" onClick={() => setStep(4)} style={{ flex: 1 }}>← Volver</button>
              <button className="btn-gold" onClick={handleNext} disabled={!form.date || !form.time} style={{ flex: 1 }}>Ver resumen →</button>
            </div>
          </div>
        )}

        {/* ── STEP 6: CONFIRMACIÓN ── */}
        {step === 6 && (
          <div className="fade-in">
            <h1 className="section-title" style={{ marginBottom: 6 }}>Todo listo</h1>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 14, marginBottom: 24 }}>
              Revisa los detalles antes de confirmar tu cita.
            </p>

            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
              {[
                ['Nombre', form.client],
                ['Teléfono', form.phone],
                ['Correo', form.email],
                ['Barbero', selectedBarber?.name],
                ['Servicio', selectedService?.name],
                ['Duración', selectedService?.duration ? `${selectedService.duration} min` : null],
                ['Día', form.date ? new Date(form.date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }) : null],
                ['Hora', form.time],
              ].filter(([,v]) => v).map(([label, value], i, arr) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '13px 20px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
                </div>
              ))}
              <div style={{ padding: '16px 20px', background: 'var(--accent-bg)', borderTop: '1px solid var(--accent-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14 }}>Total a pagar en sucursal</span>
                <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 22 }}>${selectedService?.price}</span>
              </div>
            </div>

            {errors.submit && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{errors.submit}</p>}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-ghost" onClick={() => setStep(5)} disabled={submitting} style={{ flex: 1 }}>← Editar</button>
              <button className="btn-gold" onClick={handleSubmit} disabled={submitting} style={{ flex: 1 }}>
                {submitting ? 'Agendando...' : 'Confirmar cita'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
