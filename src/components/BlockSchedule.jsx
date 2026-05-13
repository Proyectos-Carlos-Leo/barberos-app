import { useState } from 'react';
import { ref, push, remove } from 'firebase/database';
import { db } from '../firebase';
import { HOURS } from '../utils/data';
import { formatDate, getTodayStr } from '../utils/helpers';

export default function BlockSchedule({ barbers, blocks, onClose }) {
  const [type, setType] = useState('hours'); // 'hours' | 'fullDay' | 'range'
  const [barberId, setBarberId] = useState('all');
  const [date, setDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState('');
  const [selectedHours, setSelectedHours] = useState([]);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleHour = (h) => {
    setSelectedHours(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]);
  };

  const selectAllHours = () => setSelectedHours(HOURS);
  const clearHours = () => setSelectedHours([]);

  const handleSave = async () => {
    setError('');
    if (type === 'hours' && selectedHours.length === 0) {
      setError('Selecciona al menos un horario');
      return;
    }
    if (type === 'range' && !endDate) {
      setError('Selecciona la fecha de fin');
      return;
    }
    if (type === 'range' && endDate < date) {
      setError('La fecha de fin debe ser posterior a la de inicio');
      return;
    }

    setSaving(true);
    try {
      const blockData = {
        barberId,
        type,
        date,
        reason: reason.trim() || null,
        createdAt: new Date().toISOString()
      };

      if (type === 'hours') blockData.hours = selectedHours;
      if (type === 'range') blockData.endDate = endDate;

      await push(ref(db, 'bloqueos'), blockData);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Error al guardar el bloqueo');
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este bloqueo?')) return;
    try {
      await remove(ref(db, `bloqueos/${id}`));
    } catch (err) {
      console.error(err);
    }
  };

  const getBarberName = (id) => {
    if (id === 'all') return 'Toda la barbería';
    const b = barbers.find(x => x.id === id);
    return b ? b.name : 'Desconocido';
  };

  const sortedBlocks = [...(blocks || [])].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, zIndex: 1000
    }}>
      <div className="fade-in" style={{
        background: 'var(--bg-elevated-2)', border: '1px solid var(--border-strong)',
        borderRadius: 16, width: '100%', maxWidth: 700,
        maxHeight: '92vh', overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: 'var(--bg-elevated-2)', zIndex: 1
        }}>
          <div>
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 22, fontWeight: 800,
              letterSpacing: 1, textTransform: 'uppercase'
            }}>
              🚫 <span style={{ color: '#36B1DF' }}>Bloqueo</span> de Horarios
            </h2>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 4 }}>
              Bloquea horas, días completos o vacaciones
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid var(--border-strong)',
            color: 'var(--text-tertiary)', borderRadius: 6, padding: '6px 12px',
            cursor: 'pointer', fontSize: 18, lineHeight: 1
          }}>×</button>
        </div>

        <div className="modal-body">
          {/* Tipo de bloqueo */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              fontSize: 11, color: 'var(--text-tertiary)', display: 'block',
              marginBottom: 8, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 0.5
            }}>
              Tipo de bloqueo
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
              {[
                { val: 'hours', label: '⏰ Horas sueltas', desc: 'Comida, descanso' },
                { val: 'fullDay', label: '📅 Día completo', desc: 'Día libre' },
                { val: 'range', label: '🏖 Vacaciones', desc: 'Varios días' }
              ].map(t => (
                <div
                  key={t.val}
                  onClick={() => setType(t.val)}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    border: `2px solid ${type === t.val ? '#36B1DF' : 'var(--border)'}`,
                    background: type === t.val ? 'var(--accent-bg)' : 'var(--bg-elevated)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{t.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Barbero */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              fontSize: 11, color: 'var(--text-tertiary)', display: 'block',
              marginBottom: 6, fontWeight: 600, textTransform: 'uppercase'
            }}>
              Barbero
            </label>
            <select value={barberId} onChange={e => setBarberId(e.target.value)}>
              <option value="all">🏪 Toda la barbería</option>
              {barbers.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div style={{ display: 'grid', gridTemplateColumns: type === 'range' ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{
                fontSize: 11, color: 'var(--text-tertiary)', display: 'block',
                marginBottom: 6, fontWeight: 600, textTransform: 'uppercase'
              }}>
                {type === 'range' ? 'Desde' : 'Fecha'}
              </label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            {type === 'range' && (
              <div>
                <label style={{
                  fontSize: 11, color: 'var(--text-tertiary)', display: 'block',
                  marginBottom: 6, fontWeight: 600, textTransform: 'uppercase'
                }}>
                  Hasta
                </label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={date} />
              </div>
            )}
          </div>

          {/* Horarios (solo si tipo === hours) */}
          {type === 'hours' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Horarios a bloquear ({selectedHours.length})
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={selectAllHours} style={{
                    background: 'transparent', border: '1px solid var(--border-strong)',
                    color: '#36B1DF', fontSize: 11, padding: '4px 10px',
                    borderRadius: 4, cursor: 'pointer'
                  }}>Todos</button>
                  <button onClick={clearHours} style={{
                    background: 'transparent', border: '1px solid var(--border-strong)',
                    color: 'var(--text-tertiary)', fontSize: 11, padding: '4px 10px',
                    borderRadius: 4, cursor: 'pointer'
                  }}>Limpiar</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {HOURS.map(h => {
                  const sel = selectedHours.includes(h);
                  return (
                    <div
                      key={h}
                      onClick={() => toggleHour(h)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: `1.5px solid ${sel ? '#dc2626' : 'var(--border)'}`,
                        background: sel ? '#3f1111' : 'var(--bg-elevated)',
                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        color: sel ? '#fca5a5' : 'var(--text-tertiary)',
                        transition: 'all 0.15s'
                      }}
                    >
                      {h}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Razón */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              fontSize: 11, color: 'var(--text-tertiary)', display: 'block',
              marginBottom: 6, fontWeight: 600, textTransform: 'uppercase'
            }}>
              Razón (opcional)
            </label>
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ej. Vacaciones, comida, cita médica..."
            />
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: 12, marginBottom: 12 }}>⚠ {error}</p>
          )}

          {/* Botones */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 28 }}>
            <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            <button className="btn-gold" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : '🚫 Bloquear'}
            </button>
          </div>

          {/* Lista de bloqueos activos */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <h3 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 16, fontWeight: 700,
              letterSpacing: 1, textTransform: 'uppercase',
              marginBottom: 12, color: 'var(--text-secondary)'
            }}>
              Bloqueos activos ({sortedBlocks.length})
            </h3>

            {sortedBlocks.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                No hay bloqueos activos
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {sortedBlocks.map(block => {
                  const typeLabel = {
                    hours: '⏰ Horas',
                    fullDay: '📅 Día completo',
                    range: '🏖 Vacaciones'
                  }[block.type] || '🚫';

                  return (
                    <div key={block.id} style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      flexWrap: 'wrap'
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
                          <span style={{ color: '#36B1DF', marginLeft: 8, fontSize: 11, fontStyle: 'italic' }}>
                            · {block.reason}
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => handleDelete(block.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #3f1111',
                          color: '#f87171',
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: 11,
                          cursor: 'pointer'
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
