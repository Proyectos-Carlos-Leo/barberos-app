import { useState } from 'react';
import { ref, push, remove } from 'firebase/database';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import { formatDate, getTodayStr } from '../utils/helpers';

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
    if (type === 'hours' && selectedHours.length === 0) { setError('Selecciona al menos un horario'); return; }
    if (type === 'range' && !endDate) { setError('Selecciona la fecha de fin'); return; }
    if (type === 'range' && endDate < date) { setError('La fecha de fin debe ser posterior a la de inicio'); return; }
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
      setError('Error al guardar el bloqueo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este bloqueo?')) return;
    try { await remove(ref(db, `${basePath}/bloqueos/${id}`)); }
    catch (err) { console.error(err); }
  };

  const getBarberName = (id) => {
    if (id === 'all') return 'Toda la barbería';
    return barbers.find(x => x.id === id)?.name || 'Desconocido';
  };

  const sortedBlocks = [...(blocks || [])].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
      <h3 style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 18, fontWeight: 700, letterSpacing: 1,
        textTransform: "uppercase", marginBottom: 4, color: "var(--text-primary)"
      }}>
        🚫 Bloqueo de horarios
      </h3>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
        Bloquea horas, días completos o vacaciones
      </p>

      {/* Tipo de bloqueo */}
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Tipo de bloqueo
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
          {[
            { val: 'hours', label: '⏰ Horas sueltas', desc: 'Comida, descanso' },
            { val: 'fullDay', label: '📅 Día completo', desc: 'Día libre' },
            { val: 'range', label: '🏖 Vacaciones', desc: 'Varios días' }
          ].map(t => (
            <div key={t.val} onClick={() => setType(t.val)} style={{
              padding: 12, borderRadius: 10,
              border: `2px solid ${type === t.val ? 'var(--accent)' : 'var(--border)'}`,
              background: type === t.val ? 'var(--accent-bg)' : 'var(--bg-elevated-2)',
              cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
            }}>
              <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{t.label}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Barbero */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>Barbero</label>
        <select value={barberId} onChange={e => setBarberId(e.target.value)}>
          <option value="all">🏪 Toda la barbería</option>
          {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Fecha */}
      <div style={{ display: 'grid', gridTemplateColumns: type === 'range' ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>
            {type === 'range' ? 'Desde' : 'Fecha'}
          </label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        {type === 'range' && (
          <div>
            <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>Hasta</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={date} />
          </div>
        )}
      </div>

      {/* Horarios */}
      {type === 'hours' && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase" }}>
              Horarios a bloquear ({selectedHours.length})
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setSelectedHours(HOURS)} style={{ background: 'transparent', border: '1px solid var(--border-strong)', color: 'var(--accent)', fontSize: 11, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>Todos</button>
              <button onClick={() => setSelectedHours([])} style={{ background: 'transparent', border: '1px solid var(--border-strong)', color: 'var(--text-tertiary)', fontSize: 11, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>Limpiar</button>
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
        <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>Razón (opcional)</label>
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Ej. Vacaciones, comida, cita médica..." />
      </div>

      {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10 }}>⚠ {error}</p>}
      {success && <p style={{ color: 'var(--success)', fontSize: 12, marginBottom: 10 }}>✓ Bloqueo guardado</p>}

      <button className="btn-gold" onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
        {saving ? 'Guardando...' : '🚫 Aplicar bloqueo'}
      </button>

      {/* Lista de bloqueos activos */}
      {sortedBlocks.length > 0 && (
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <h4 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 15, fontWeight: 700, letterSpacing: 1,
            textTransform: 'uppercase', marginBottom: 12, color: 'var(--text-secondary)'
          }}>
            Bloqueos activos ({sortedBlocks.length})
          </h4>
          <div style={{ display: 'grid', gap: 8 }}>
            {sortedBlocks.map(block => {
              const typeLabel = { hours: '⏰ Horas', fullDay: '📅 Día completo', range: '🏖 Vacaciones' }[block.type] || '🚫';
              return (
                <div key={block.id} style={{
                  background: 'var(--bg-elevated-2)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{typeLabel}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>
                    <strong>{getBarberName(block.barberId)}</strong>
                    <span style={{ color: 'var(--text-tertiary)', marginLeft: 8 }}>
                      {block.type === 'range'
                        ? `${formatDate(block.date)} → ${formatDate(block.endDate)}`
                        : formatDate(block.date)}
                    </span>
                    {block.type === 'hours' && block.hours && (
                      <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 11 }}>
                        ({block.hours.length} horarios)
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
                    Eliminar
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
