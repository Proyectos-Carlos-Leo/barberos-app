import { useState } from 'react';
import { ref, push, remove } from 'firebase/database';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import { formatDate, getTodayStr } from '../utils/helpers';
import { useT } from '../utils/i18n';
import { IconBloquear, IconCalendar, IconDescanso, IconTiempo } from './icons/BrandIcons';

const stripEmoji = (str) =>
  String(str || '').replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F]+\s*/u, '');

// Generar horas desde config
function generateHours(horario) {
  const inicio = horario?.hora_inicio || '09:00';
  const fin = horario?.hora_fin || '20:00';
  const dur = horario?.duracion || 30;
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
  return slots.length > 0 ? slots : [
    '09:00','09:30','10:00','10:30','11:00','11:30',
    '12:00','12:30','13:00','13:30','15:00','15:30',
    '16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30'
  ];
}

export default function BlockSchedule({ barbers, blocks }) {
  const { basePath, barbershopConfig } = useApp();
  const t = useT(barbershopConfig?.idioma);
  const idioma = barbershopConfig?.idioma;
  const HOURS = generateHours(barbershopConfig?.horario);

  const [type, setType] = useState('hours');
  const [barberId, setBarberId] = useState('all');
  const [date, setDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState('');
  const [selectedHours, setSelectedHours] = useState([]);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const toggleHour = (h) =>
    setSelectedHours(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]);

  const handleSave = async () => {
    setError('');
    if (type === 'hours' && selectedHours.length === 0) { setError(t('Selecciona al menos un horario')); return; }
    if (type === 'range' && !endDate) { setError(t('Selecciona la fecha de fin')); return; }
    if (type === 'range' && endDate < date) { setError(t('La fecha de fin debe ser posterior a la de inicio')); return; }
    setSaving(true);
    try {
      const blockData = {
        barberId, type, date,
        reason: reason.trim() || null,
        createdAt: new Date().toISOString()
      };
      if (type === 'hours') blockData.hours = selectedHours;
      if (type === 'range') blockData.endDate = endDate;
      await push(ref(db, `${basePath}/bloqueos`), blockData);
      // Reset
      setSelectedHours([]);
      setReason('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      console.error(err);
      setError(t('Error al guardar el bloqueo'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('¿Eliminar este bloqueo?'))) return;
    try { await remove(ref(db, `${basePath}/bloqueos/${id}`)); }
    catch (err) { console.error(err); }
  };

  const getBarberName = (id) => {
    if (id === 'all') return t('Toda la barbería');
    return barbers.find(x => x.id === id)?.name || t('Desconocido');
  };

  const sortedBlocks = [...(blocks || [])].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
      <h3 style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 18, fontWeight: 700, letterSpacing: 1,
        textTransform: "uppercase", marginBottom: 4, color: "var(--text-primary)"
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><IconBloquear size={18} glow={false} />{stripEmoji(t("🚫 Bloqueo de horarios"))}</span>
      </h3>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
        {t("Bloquea horas, días completos o vacaciones")}
      </p>

      {/* Tipo de bloqueo */}
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {t("Tipo de bloqueo")}
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
          {[
            { val: 'hours', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconTiempo size={13} glow={false} />{stripEmoji(t('⏰ Horas sueltas'))}</span>, desc: t('Comida, descanso') },
            { val: 'fullDay', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconCalendar size={13} glow={false} />{stripEmoji(t('📅 Día completo'))}</span>, desc: t('Día libre') },
            { val: 'range', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconDescanso size={13} glow={false} />{stripEmoji(t('🏖 Vacaciones'))}</span>, desc: t('Varios días') }
          ].map(opt => (
            <div key={opt.val} onClick={() => setType(opt.val)} style={{
              padding: 12, borderRadius: 10,
              border: `2px solid ${type === opt.val ? 'var(--accent)' : 'var(--border)'}`,
              background: type === opt.val ? 'var(--accent-bg)' : 'var(--bg-elevated-2)',
              cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
            }}>
              <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{opt.label}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{opt.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Barbero */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>{t("Barbero")}</label>
        <select value={barberId} onChange={e => setBarberId(e.target.value)}>
          <option value="all">{t("🏪 Toda la barbería")}</option>
          {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Fecha */}
      <div style={{ display: 'grid', gridTemplateColumns: type === 'range' ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>
            {type === 'range' ? t('Desde') : t('Fecha')}
          </label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        {type === 'range' && (
          <div>
            <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>{t("Hasta")}</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={date} />
          </div>
        )}
      </div>

      {/* Horarios */}
      {type === 'hours' && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase" }}>
              {t("Horarios a bloquear")} ({selectedHours.length})
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setSelectedHours(HOURS)} style={{ background: 'transparent', border: '1px solid var(--border-strong)', color: 'var(--accent)', fontSize: 11, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>{t("Todos")}</button>
              <button onClick={() => setSelectedHours([])} style={{ background: 'transparent', border: '1px solid var(--border-strong)', color: 'var(--text-tertiary)', fontSize: 11, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>{t("Limpiar")}</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {HOURS.map(h => {
              const sel = selectedHours.includes(h);
              return (
                <div key={h} onClick={() => toggleHour(h)} style={{
                  padding: '8px 12px', borderRadius: 6,
                  border: `1.5px solid ${sel ? '#dc2626' : 'var(--border)'}`,
                  background: sel ? 'var(--danger-bg)' : 'var(--bg-elevated-2)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  color: sel ? 'var(--danger)' : 'var(--text-tertiary)',
                  transition: 'all 0.15s'
                }}>
                  {h}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Razón */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>{t("Razón (opcional)")}</label>
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder={t("Ej. Vacaciones, comida, cita médica...")} />
      </div>

      {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10 }}>⚠ {error}</p>}
      {success && <p style={{ color: 'var(--success)', fontSize: 12, marginBottom: 10 }}>{t("✓ Bloqueo guardado")}</p>}

      <button className="btn-gold" onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
        {saving ? t('Guardando...') : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconBloquear size={13} glow={false} color="#0a0a0a" />{stripEmoji(t('🚫 Aplicar bloqueo'))}</span>}
      </button>

      {/* Lista de bloqueos activos */}
      {sortedBlocks.length > 0 && (
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <h4 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 15, fontWeight: 700, letterSpacing: 1,
            textTransform: 'uppercase', marginBottom: 12, color: 'var(--text-secondary)'
          }}>
            {t("Bloqueos activos")} ({sortedBlocks.length})
          </h4>
          <div style={{ display: 'grid', gap: 8 }}>
            {sortedBlocks.map(block => {
              const typeIcon = { hours: <IconTiempo size={12} glow={false} />, fullDay: <IconCalendar size={12} glow={false} />, range: <IconDescanso size={12} glow={false} /> }[block.type] || <IconBloquear size={12} glow={false} />;
              const typeLabel = { hours: stripEmoji(t('⏰ Horas')), fullDay: stripEmoji(t('📅 Día completo')), range: stripEmoji(t('🏖 Vacaciones')) }[block.type] || '';
              return (
                <div key={block.id} style={{
                  background: 'var(--bg-elevated-2)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>{typeIcon}{typeLabel}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>
                    <strong>{getBarberName(block.barberId)}</strong>
                    <span style={{ color: 'var(--text-tertiary)', marginLeft: 8 }}>
                      {block.type === 'range'
                        ? `${formatDate(block.date, idioma)} → ${formatDate(block.endDate, idioma)}`
                        : formatDate(block.date, idioma)}
                    </span>
                    {block.type === 'hours' && block.hours && (
                      <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 11 }}>
                        ({block.hours.length} {t("horarios")})
                      </span>
                    )}
                    {block.reason && (
                      <span style={{ color: 'var(--accent)', marginLeft: 8, fontSize: 11, fontStyle: 'italic' }}>
                        · {block.reason}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => handleDelete(block.id)}
                    style={{
                      background: 'transparent', border: '1px solid var(--danger-bg)',
                      color: 'var(--danger)', borderRadius: 6,
                      padding: '4px 10px', fontSize: 11, cursor: 'pointer'
                    }}
                  >
                    {t("Eliminar")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
