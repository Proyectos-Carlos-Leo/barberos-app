import { useState, useEffect } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';

const PRESET_COLORS = [
  { name: 'Azul (default)', primary: '#36B1DF', light: '#5FC8EC', dark: '#1A7FAB', bg: '#051520', border: '#0a3d56' },
  { name: 'Dorado', primary: '#f59e0b', light: '#fbbf24', dark: '#b45309', bg: '#1a1306', border: '#451a03' },
  { name: 'Verde', primary: '#10b981', light: '#34d399', dark: '#047857', bg: '#031912', border: '#064e3b' },
  { name: 'Rojo', primary: '#ef4444', light: '#f87171', dark: '#b91c1c', bg: '#1a0606', border: '#7f1d1d' },
  { name: 'Morado', primary: '#a855f7', light: '#c084fc', dark: '#7e22ce', bg: '#1a0a26', border: '#581c87' },
  { name: 'Rosa', primary: '#ec4899', light: '#f472b6', dark: '#be185d', bg: '#1f0613', border: '#831843' },
  { name: 'Cyan', primary: '#06b6d4', light: '#22d3ee', dark: '#0e7490', bg: '#031416', border: '#155e75' },
  { name: 'Naranja', primary: '#f97316', light: '#fb923c', dark: '#c2410c', bg: '#1a0d04', border: '#7c2d12' },
];

export default function AdminSettings({ open, onClose }) {
  const { barbershopConfig, slug } = useApp();
  const [selectedColor, setSelectedColor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (barbershopConfig?.theme_color) {
      const match = PRESET_COLORS.find(c => c.primary === barbershopConfig.theme_color.primary);
      setSelectedColor(match || PRESET_COLORS[0]);
    } else {
      setSelectedColor(PRESET_COLORS[0]);
    }
  }, [barbershopConfig]);

  const handleSave = async () => {
    if (!selectedColor || !slug) return;
    setSaving(true);
    try {
      await update(ref(db, `barberias/${slug}/config/theme_color`), selectedColor);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
      alert('Error al guardar el color');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, zIndex: 3000
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="fade-in"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-strong)",
          borderRadius: 16,
          width: "100%", maxWidth: 520,
          maxHeight: "85vh",
          overflowY: "auto",
          padding: 24
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 22, fontWeight: 800, letterSpacing: 1,
            textTransform: "uppercase", color: "var(--text-primary)"
          }}>
            ⚙️ Configuración
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none",
              fontSize: 26, cursor: "pointer", color: "var(--text-tertiary)",
              padding: 0, lineHeight: 1
            }}
          >×</button>
        </div>
        <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginBottom: 22 }}>
          Personaliza la apariencia de tu barbería
        </p>

        {/* Selector de color */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            fontSize: 11, color: "var(--text-tertiary)",
            fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
            display: "block", marginBottom: 12
          }}>
            🎨 Color secundario
          </label>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 130px), 1fr))",
            gap: 10
          }}>
            {PRESET_COLORS.map(c => {
              const isSelected = selectedColor?.primary === c.primary;
              return (
                <div
                  key={c.primary}
                  onClick={() => setSelectedColor(c)}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: `2px solid ${isSelected ? c.primary : "var(--border)"}`,
                    background: isSelected ? c.bg : "var(--bg-elevated-2)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    transform: isSelected ? "translateY(-2px)" : "none",
                    boxShadow: isSelected ? `0 6px 20px ${c.primary}44` : "none"
                  }}
                >
                  <div style={{
                    width: "100%", aspectRatio: "2/1",
                    background: `linear-gradient(135deg, ${c.primary}, ${c.light})`,
                    borderRadius: 6,
                    marginBottom: 8,
                    boxShadow: `0 2px 8px ${c.primary}44`
                  }} />
                  <p style={{
                    fontSize: 12, fontWeight: 700,
                    color: isSelected ? c.primary : "var(--text-secondary)",
                    textAlign: "center",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    textTransform: "uppercase",
                    letterSpacing: 0.5
                  }}>{c.name}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vista previa */}
        {selectedColor && (
          <div style={{
            background: selectedColor.bg,
            border: `1px solid ${selectedColor.border}`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 20
          }}>
            <p style={{
              fontSize: 11, color: selectedColor.primary,
              fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
              marginBottom: 8
            }}>
              Vista previa
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button style={{
                background: `linear-gradient(135deg, ${selectedColor.primary}, ${selectedColor.light})`,
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13, fontWeight: 700,
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: 0.5,
                textTransform: "uppercase",
                cursor: "default"
              }}>Botón principal</button>
              <span style={{
                background: selectedColor.bg,
                border: `1px solid ${selectedColor.border}`,
                color: selectedColor.primary,
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 11, fontWeight: 700
              }}>Badge</span>
              <span style={{
                color: selectedColor.primary,
                fontWeight: 700,
                fontSize: 14
              }}>Texto destacado</span>
            </div>
          </div>
        )}

        {/* Botones */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
          {saved && (
            <p style={{ color: "#4ade80", fontSize: 13, fontWeight: 600, marginRight: "auto" }}>
              ✓ Color aplicado. Recarga si no ves cambios.
            </p>
          )}
          <button className="btn-ghost" onClick={onClose} disabled={saving}>
            Cerrar
          </button>
          <button className="btn-gold" onClick={handleSave} disabled={saving || !selectedColor}>
            {saving ? 'Guardando...' : '💾 Aplicar color'}
          </button>
        </div>
      </div>
    </div>
  );
}
