import { useMemo, useState } from 'react';
import { formatCurrency, getTodayStr } from '../utils/helpers';

// ==================== EXPORTAR CSV ====================
const downloadCSV = (filename, rows) => {
  const csvContent = rows.map(row =>
    row.map(cell => {
      const str = String(cell ?? '');
      // Escapar comillas y comas
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  ).join('\n');

  // BOM para que Excel abra UTF-8 bien (acentos)
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const exportBarberStats = (topBarbers, completed) => {
  const headers = ['Barbero', 'Especialidad', 'Total cortes', 'Ingresos totales', 'Ticket promedio'];
  const rows = [headers];

  topBarbers.forEach(b => {
    const ticketAvg = b.count > 0 ? Math.round(b.revenue / b.count) : 0;
    rows.push([
      b.name,
      b.specialty || '',
      b.count,
      b.revenue,
      ticketAvg
    ]);
  });

  // Totales
  const totalCount = topBarbers.reduce((s, b) => s + b.count, 0);
  const totalRev = topBarbers.reduce((s, b) => s + b.revenue, 0);
  rows.push([]);
  rows.push(['TOTAL', '', totalCount, totalRev, totalCount > 0 ? Math.round(totalRev / totalCount) : 0]);

  const today = new Date().toISOString().split('T')[0];
  downloadCSV(`estadisticas_barberos_${today}.csv`, rows);
};

const exportFullReport = (appointments, barbers) => {
  const completed = appointments.filter(a => a.status === 'completada');
  const today = new Date().toISOString().split('T')[0];
  const rows = [];

  // ========== ENCABEZADO DEL REPORTE ==========
  rows.push(['REPORTE COMPLETO - BarberOS']);
  rows.push([`Generado el: ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`]);
  rows.push([`Total de citas completadas: ${completed.length}`]);
  rows.push([]);

  // ========== SECCIÓN 1: INGRESOS ÚLTIMOS 7 DÍAS ==========
  rows.push(['══════════════════════════════════════']);
  rows.push(['INGRESOS ÚLTIMOS 7 DÍAS']);
  rows.push(['══════════════════════════════════════']);
  rows.push(['Fecha', 'Día', 'Citas completadas', 'Ingresos']);

  let totalLast7 = 0;
  let citasLast7 = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = i === 0 ? 'Hoy' : dayNames[d.getDay()];
    const dayAppts = completed.filter(a => a.date === dateStr);
    const revenue = dayAppts.reduce((s, a) => s + (a.service?.price || 0), 0);
    totalLast7 += revenue;
    citasLast7 += dayAppts.length;
    rows.push([dateStr, dayName, dayAppts.length, `$${revenue}`]);
  }

  rows.push(['', 'TOTAL', citasLast7, `$${totalLast7}`]);
  rows.push([]);

  // ========== SECCIÓN 2: TOP BARBEROS ==========
  rows.push(['══════════════════════════════════════']);
  rows.push(['TOP BARBEROS']);
  rows.push(['══════════════════════════════════════']);
  rows.push(['Posición', 'Barbero', 'Especialidad', 'Total cortes', 'Ingresos totales', 'Ticket promedio']);

  const barberStats = barbers.map(b => {
    const appts = completed.filter(a => String(a.barberId) === String(b.id));
    const revenue = appts.reduce((s, a) => s + (a.service?.price || 0), 0);
    return { name: b.name, specialty: b.specialty || '', count: appts.length, revenue };
  }).sort((a, b) => b.revenue - a.revenue);

  barberStats.forEach((b, i) => {
    const avg = b.count > 0 ? Math.round(b.revenue / b.count) : 0;
    const medal = ['🥇', '🥈', '🥉'][i] || `#${i + 1}`;
    rows.push([medal, b.name, b.specialty, b.count, `$${b.revenue}`, `$${avg}`]);
  });

  const totalBarberRevenue = barberStats.reduce((s, b) => s + b.revenue, 0);
  const totalBarberCount = barberStats.reduce((s, b) => s + b.count, 0);
  rows.push(['', 'TOTAL', '', totalBarberCount, `$${totalBarberRevenue}`, '']);
  rows.push([]);

  // ========== SECCIÓN 3: SERVICIOS MÁS VENDIDOS ==========
  rows.push(['══════════════════════════════════════']);
  rows.push(['SERVICIOS MÁS VENDIDOS']);
  rows.push(['══════════════════════════════════════']);
  rows.push(['Posición', 'Servicio', 'Veces vendido', 'Ingresos generados', '% del total']);

  const serviceMap = new Map();
  completed.forEach(a => {
    const name = a.service?.name || 'Sin servicio';
    const price = a.service?.price || 0;
    if (!serviceMap.has(name)) serviceMap.set(name, { count: 0, revenue: 0 });
    const s = serviceMap.get(name);
    s.count++;
    s.revenue += price;
  });

  const serviceStats = Array.from(serviceMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);

  const totalRevenue = serviceStats.reduce((s, x) => s + x.revenue, 0);

  serviceStats.forEach((s, i) => {
    const pct = totalRevenue > 0 ? ((s.revenue / totalRevenue) * 100).toFixed(1) : '0';
    rows.push([`#${i + 1}`, s.name, s.count, `$${s.revenue}`, `${pct}%`]);
  });

  rows.push([]);

  // ========== SECCIÓN 4: HORARIOS PICO ==========
  rows.push(['══════════════════════════════════════']);
  rows.push(['HORARIOS PICO']);
  rows.push(['══════════════════════════════════════']);
  rows.push(['Hora', 'Período', 'Citas', 'Popularidad']);

  const hourMap = new Map();
  completed.forEach(a => {
    if (!a.time) return;
    if (!hourMap.has(a.time)) hourMap.set(a.time, 0);
    hourMap.set(a.time, hourMap.get(a.time) + 1);
  });

  const hourStats = Array.from(hourMap.entries())
    .map(([time, count]) => ({ time, count }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const maxCount = Math.max(...hourStats.map(h => h.count), 1);
  const amTotal = hourStats.filter(h => parseInt(h.time) < 12).reduce((s, h) => s + h.count, 0);
  const pmTotal = hourStats.filter(h => parseInt(h.time) >= 12).reduce((s, h) => s + h.count, 0);

  hourStats.forEach(h => {
    const isAM = parseInt(h.time) < 12;
    const isPeak = h.count === maxCount;
    const bars = '█'.repeat(Math.round((h.count / maxCount) * 10));
    rows.push([h.time, isAM ? '☀️ AM' : '🌙 PM', h.count, isPeak ? `${bars} 🔥 HORA PICO` : bars]);
  });

  rows.push(['', 'Total AM', amTotal, '']);
  rows.push(['', 'Total PM', pmTotal, '']);
  rows.push([]);

  // ========== SECCIÓN 5: COMPARATIVA MENSUAL ==========
  rows.push(['══════════════════════════════════════']);
  rows.push(['COMPARATIVA MENSUAL']);
  rows.push(['══════════════════════════════════════']);
  rows.push(['Período', 'Citas completadas', 'Ingresos', 'Ticket promedio']);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const thisMonth = completed.filter(a => {
    const d = new Date(a.date + 'T00:00:00');
    return d >= thisMonthStart && d <= now;
  });
  const lastMonth = completed.filter(a => {
    const d = new Date(a.date + 'T00:00:00');
    return d >= lastMonthStart && d <= lastMonthEnd;
  });

  const thisRev = thisMonth.reduce((s, a) => s + (a.service?.price || 0), 0);
  const lastRev = lastMonth.reduce((s, a) => s + (a.service?.price || 0), 0);
  const thisAvg = thisMonth.length > 0 ? Math.round(thisRev / thisMonth.length) : 0;
  const lastAvg = lastMonth.length > 0 ? Math.round(lastRev / lastMonth.length) : 0;
  const change = lastRev > 0 ? (((thisRev - lastRev) / lastRev) * 100).toFixed(1) : 'N/A';
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  rows.push([`${monthNames[now.getMonth() - 1] || 'Mes anterior'}`, lastMonth.length, `$${lastRev}`, `$${lastAvg}`]);
  rows.push([`${monthNames[now.getMonth()]} (actual)`, thisMonth.length, `$${thisRev}`, `$${thisAvg}`]);
  rows.push(['Variación', '', lastRev > 0 ? `${change > 0 ? '+' : ''}${change}%` : 'N/A', '']);
  rows.push([]);

  // ========== RESUMEN EJECUTIVO ==========
  rows.push(['══════════════════════════════════════']);
  rows.push(['RESUMEN EJECUTIVO']);
  rows.push(['══════════════════════════════════════']);
  rows.push(['Indicador', 'Valor']);
  rows.push(['Ingresos totales históricos', `$${totalRevenue}`]);
  rows.push(['Total citas completadas', completed.length]);
  rows.push(['Ticket promedio general', `$${completed.length > 0 ? Math.round(totalRevenue / completed.length) : 0}`]);
  rows.push(['Mejor barbero', barberStats[0]?.name || 'N/A']);
  rows.push(['Servicio más vendido', serviceStats[0]?.name || 'N/A']);
  rows.push(['Hora más popular', hourStats.sort((a, b) => b.count - a.count)[0]?.time || 'N/A']);
  rows.push(['Ingresos últimos 7 días', `$${totalLast7}`]);

  downloadCSV(`reporte_completo_${today}.csv`, rows);
};

export default function ReportsView({ appointments, barbers }) {
  // Solo citas completadas tienen ingresos reales
  const completed = useMemo(
    () => appointments.filter(a => a.status === 'completada'),
    [appointments]
  );

  // ========== INGRESOS ÚLTIMOS N DÍAS ==========
  const [daysRange, setDaysRange] = useState(7);

  const lastNDays = useMemo(() => {
    const days = [];
    for (let i = daysRange - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()];
      const revenue = completed
        .filter(a => a.date === dateStr)
        .reduce((sum, a) => sum + (a.service?.price || 0), 0);
      const count = completed.filter(a => a.date === dateStr).length;
      days.push({ dateStr, dayName, num: d.getDate(), revenue, count });
    }
    return days;
  }, [completed, daysRange]);

  const maxRevenue = Math.max(...lastNDays.map(d => d.revenue), 1);
  const totalLastN = lastNDays.reduce((sum, d) => sum + d.revenue, 0);
  // Aliases para compatibilidad
  const last7Days = lastNDays;
  const totalLast7 = totalLastN;

  // ========== TOP BARBEROS ==========
  // ========== FILTROS POR RANGO PARA CADA GRÁFICA ==========
  const [barbersRange, setBarbersRange] = useState('all'); // 'today' | '7' | '30' | '90' | 'all'
  const [servicesRange, setServicesRange] = useState('all');
  const [hoursRange, setHoursRange] = useState('all');

  // Helper: filtra completed por rango
  const filterByRange = (data, range) => {
    if (range === 'all') return data;
    const today = getTodayStr();
    if (range === 'today') return data.filter(a => a.date === today);
    const days = parseInt(range);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return data.filter(a => a.date >= cutoffStr);
  };

  const topBarbers = useMemo(() => {
    const filtered = filterByRange(completed, barbersRange);
    const stats = barbers.map(b => {
      const barberAppts = filtered.filter(a => String(a.barberId) === String(b.id));
      const revenue = barberAppts.reduce((sum, a) => sum + (a.service?.price || 0), 0);
      return {
        ...b,
        count: barberAppts.length,
        revenue
      };
    });
    return stats.sort((a, b) => b.revenue - a.revenue);
  }, [completed, barbers, barbersRange]);

  // ========== SERVICIOS MÁS VENDIDOS ==========
  const topServices = useMemo(() => {
    const filtered = filterByRange(completed, servicesRange);
    const map = new Map();
    filtered.forEach(a => {
      const name = a.service?.name || 'Sin servicio';
      const price = a.service?.price || 0;
      if (!map.has(name)) {
        map.set(name, { name, count: 0, revenue: 0 });
      }
      const item = map.get(name);
      item.count += 1;
      item.revenue += price;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [completed, servicesRange]);

  const maxServiceCount = Math.max(...topServices.map(s => s.count), 1);

  // ========== HORARIOS PICO ==========
  const peakHours = useMemo(() => {
    const filtered = filterByRange(completed, hoursRange);
    const map = new Map();
    filtered.forEach(a => {
      if (!map.has(a.time)) map.set(a.time, 0);
      map.set(a.time, map.get(a.time) + 1);
    });
    return Array.from(map.entries())
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [completed, hoursRange]);

  const maxHourCount = Math.max(...peakHours.map(h => h.count), 1);

  // ========== COMPARATIVA MENSUAL ==========
  const monthComparison = useMemo(() => {
    const today = new Date();
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const thisMonth = completed.filter(a => {
      const d = new Date(a.date + 'T00:00:00');
      return d >= thisMonthStart && d <= today;
    });
    const lastMonth = completed.filter(a => {
      const d = new Date(a.date + 'T00:00:00');
      return d >= lastMonthStart && d <= lastMonthEnd;
    });

    const thisRevenue = thisMonth.reduce((s, a) => s + (a.service?.price || 0), 0);
    const lastRevenue = lastMonth.reduce((s, a) => s + (a.service?.price || 0), 0);
    const change = lastRevenue === 0 ? 0 : ((thisRevenue - lastRevenue) / lastRevenue) * 100;

    return {
      thisMonth: { count: thisMonth.length, revenue: thisRevenue },
      lastMonth: { count: lastMonth.length, revenue: lastRevenue },
      change
    };
  }, [completed]);

  const totalRevenue = completed.reduce((s, a) => s + (a.service?.price || 0), 0);
  const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: 4 }}>
            <span className="gold">Reportes</span> & análisis
          </h1>
          <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>Métricas del negocio en tiempo real</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => exportBarberStats(topBarbers, completed)}
            disabled={completed.length === 0}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "1px solid var(--accent)",
              color: "var(--accent)",
              borderRadius: 8,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              cursor: completed.length === 0 ? "not-allowed" : "pointer",
              opacity: completed.length === 0 ? 0.4 : 1
            }}
          >
            📊 Exportar barberos
          </button>
          <button
            onClick={() => exportFullReport(appointments, barbers)}
            disabled={appointments.length === 0}
            style={{
              padding: "10px 16px",
              background: "linear-gradient(135deg, var(--accent), var(--accent-light))",
              border: "none",
              color: "var(--bg-main)",
              borderRadius: 8,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              cursor: appointments.length === 0 ? "not-allowed" : "pointer",
              opacity: appointments.length === 0 ? 0.4 : 1
            }}
          >
            📥 Exportar todo
          </button>
        </div>
      </div>

      {/* Resumen general */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 28 }}>
        <KPI label="Total citas completadas" value={completed.length} color="#4ade80" icon="✓" />
        <KPI label="Ingresos totales" value={formatCurrency(totalRevenue)} color="var(--accent)" icon="💰" />
        <KPI label="Ticket promedio" value={formatCurrency(Math.round(avgTicket))} color="#60a5fa" icon="🧾" />
        <KPI label="Últimos 7 días" value={formatCurrency(totalLast7)} color="#a78bfa" icon="📅" />
      </div>

      {/* HISTOGRAMA: Ingresos últimos 7 días */}
      <Card
        title={`📊 Ingresos últimos ${daysRange} días`}
        subtitle={`Total: ${formatCurrency(totalLastN)}`}
        action={
          <div style={{ display: "flex", gap: 6, background: "var(--bg-track)", padding: 4, borderRadius: 8 }}>
            {[7, 15, 30].map(n => (
              <button
                key={n}
                onClick={() => setDaysRange(n)}
                style={{
                  background: daysRange === n ? "linear-gradient(135deg, var(--accent), var(--accent-light))" : "transparent",
                  color: daysRange === n ? "#fff" : "var(--text-tertiary)",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  letterSpacing: 0.5
                }}
              >
                {n}d
              </button>
            ))}
          </div>
        }
      >
        {totalLast7 === 0 ? (
          <EmptyState icon="📊" message="Aún no hay ingresos registrados" />
        ) : (
          <div style={{ padding: "24px 0 0" }}>
            {/* Área del histograma */}
            <div style={{ position: "relative", height: 220, display: "flex", alignItems: "flex-end", gap: 0, paddingTop: 16, paddingLeft: 56 }}>
              {/* Líneas guía del eje Y */}
              {[100, 75, 50, 25].map(pct => (
                <div key={pct} style={{
                  position: "absolute",
                  left: 56, right: 0,
                  bottom: `${pct}%`,
                  borderTop: "1.5px dashed var(--text-faint)",
                  display: "flex",
                  alignItems: "center"
                }}>
                  <span style={{
                    position: "absolute",
                    right: "100%",
                    paddingRight: 8,
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    whiteSpace: "nowrap"
                  }}>
                    {formatCurrency(Math.round(maxRevenue * pct / 100))}
                  </span>
                </div>
              ))}
              {/* Barras */}
              <div style={{ display: "flex", flex: 1, alignItems: "flex-end", gap: 6, height: "100%" }}>
                {last7Days.map(d => {
                  const heightPct = (d.revenue / maxRevenue) * 100;
                  const isToday = d.dateStr === getTodayStr();
                  return (
                    <div key={d.dateStr} style={{
                      flex: 1,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 4
                    }}>
                      {/* Valor encima */}
                      {d.revenue > 0 && daysRange <= 15 && (
                        <span style={{
                          fontSize: daysRange > 7 ? 8 : 9,
                          color: isToday ? "var(--accent)" : "var(--text-dim)",
                          fontWeight: 700,
                          textAlign: "center",
                          whiteSpace: "nowrap"
                        }}>
                          {formatCurrency(d.revenue)}
                        </span>
                      )}
                      {/* Barra con hover */}
                      <div
                        title={`${d.dayName} ${d.num}: ${formatCurrency(d.revenue)}${isToday ? ' (Hoy)' : ''}`}
                        style={{
                          width: "100%",
                          height: `${Math.max(heightPct, d.revenue > 0 ? 3 : 0)}%`,
                          background: isToday
                            ? "linear-gradient(180deg, var(--accent-light), var(--accent), var(--accent-dark))"
                            : d.revenue > 0
                              ? "linear-gradient(180deg, #555, #333)"
                              : "var(--bg-track)",
                          borderRadius: "4px 4px 0 0",
                          border: isToday ? "1px solid var(--accent-light)" : d.revenue > 0 ? "1px solid #444" : "1px dashed #222",
                          minHeight: d.revenue > 0 ? 4 : 0,
                          transition: "all 0.2s ease",
                          position: "relative",
                          cursor: d.revenue > 0 ? "pointer" : "default"
                        }}
                        onMouseEnter={e => {
                          if (d.revenue > 0) {
                            e.currentTarget.style.background = "linear-gradient(180deg, var(--accent-light), var(--accent), var(--accent-dark))";
                            e.currentTarget.style.boxShadow = "0 0 16px rgba(var(--accent-rgb),0.7)";
                            e.currentTarget.style.filter = "brightness(1.15)";
                          }
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = isToday
                            ? "linear-gradient(180deg, var(--accent-light), var(--accent), var(--accent-dark))"
                            : d.revenue > 0
                              ? "linear-gradient(180deg, #555, #333)"
                              : "var(--bg-track)";
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.filter = "brightness(1)";
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Eje X */}
            <div style={{
              display: "flex",
              paddingLeft: 56,
              gap: 6,
              marginTop: 6,
              borderTop: "2px solid var(--border-strong)"
            }}>
              {last7Days.map(d => {
                const isToday = d.dateStr === getTodayStr();
                const showDayName = daysRange <= 15;
                const showCount = daysRange <= 15 && d.count > 0;
                return (
                  <div key={d.dateStr} style={{
                    flex: 1,
                    textAlign: "center",
                    paddingTop: 6,
                    minWidth: 0
                  }}>
                    {showDayName && (
                      <p style={{
                        fontSize: daysRange > 7 ? 9 : 10,
                        fontWeight: 700,
                        color: isToday ? "var(--accent)" : "var(--text-dim)",
                        textTransform: "uppercase",
                        overflow: "hidden",
                        whiteSpace: "nowrap"
                      }}>
                        {d.dayName}
                      </p>
                    )}
                    <p style={{
                      fontSize: daysRange > 15 ? 10 : 12,
                      fontWeight: 800,
                      color: isToday ? "var(--accent)" : "var(--text-tertiary)"
                    }}>
                      {d.num}
                    </p>
                    {showCount && (
                      <p style={{ fontSize: 9, color: "var(--text-dim)" }}>{d.count}✓</p>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Leyenda */}
            <div style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: 16,
              flexWrap: "wrap"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: "linear-gradient(180deg, var(--accent-light), var(--accent))" }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Hoy</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: "var(--text-faint)" }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Días anteriores</span>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: "auto" }}>✓ = citas completadas</span>
            </div>
          </div>
        )}
      </Card>

      {/* Grid 2x2 de reportes compactos */}
      <div className="reports-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
        gap: 16,
        marginBottom: 16
      }}>
      {/* Top barberos */}
      <Card
        title="🏆 Top barberos"
        subtitle="Ranking por ingresos generados"
        action={<RangePill value={barbersRange} onChange={setBarbersRange} />}
      >
        {topBarbers.length === 0 || topBarbers.every(b => b.count === 0) ? (
          <EmptyState icon="📊" message="Aún no hay datos suficientes" />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {topBarbers.map((b, i) => {
              const maxRev = Math.max(...topBarbers.map(x => x.revenue), 1);
              const widthPct = (b.revenue / maxRev) * 100;
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>
                    {medals[i] || `${i + 1}.`}
                  </span>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: b.bg, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 12, color: b.color, flexShrink: 0
                  }}>{b.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{b.name}</span>
                      <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14 }}>
                        {formatCurrency(b.revenue)}
                      </span>
                    </div>
                    <div
                      title={`${b.name}: ${b.count} corte${b.count !== 1 ? 's' : ''} · ${formatCurrency(b.revenue)}`}
                      style={{
                        height: 8, background: "var(--bg-track)",
                        borderRadius: 3, overflow: "hidden",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.height = "12px";
                        e.currentTarget.style.boxShadow = i === 0
                          ? "0 0 8px rgba(var(--accent-rgb),0.5)"
                          : "0 0 8px rgba(136,136,136,0.4)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.height = "8px";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{
                        width: `${widthPct}%`,
                        height: "100%",
                        background: i === 0
                          ? "linear-gradient(90deg, var(--accent), var(--accent-light))"
                          : "linear-gradient(90deg, #555, #888)",
                        transition: "width 0.5s"
                      }} />
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{b.count} corte{b.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Servicios más vendidos */}
      <Card
        title="💈 Servicios más vendidos"
        subtitle="Por cantidad de cortes"
        action={<RangePill value={servicesRange} onChange={setServicesRange} />}
      >
        {topServices.length === 0 ? (
          <EmptyState icon="📊" message="Aún no hay datos suficientes" />
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {topServices.map(s => {
              const widthPct = (s.count / maxServiceCount) * 100;
              return (
                <div key={s.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                    <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.count} corte{s.count !== 1 ? 's' : ''}</span>
                      <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 13 }}>
                        {formatCurrency(s.revenue)}
                      </span>
                    </div>
                  </div>
                  <div
                    title={`${s.name}: ${s.count} corte${s.count !== 1 ? 's' : ''} · ${formatCurrency(s.revenue)}`}
                    style={{
                      height: 10, background: "var(--bg-track)",
                      borderRadius: 4, overflow: "hidden",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.height = "14px";
                      e.currentTarget.style.boxShadow = "0 0 8px rgba(var(--accent-rgb),0.5)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.height = "10px";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{
                      width: `${widthPct}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, var(--accent), var(--accent-light))",
                      transition: "width 0.5s"
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      </div>
      {/* Fin grid 2x2 superior */}

      {/* Grid inferior: Comparativa + Productos mini */}
      <div className="reports-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
        gap: 16,
        marginBottom: 16
      }}>

      {/* Comparativa mensual */}
      <Card title="📆 Comparativa mensual" subtitle="Este mes vs mes anterior">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{
            background: "var(--bg-elevated-2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 18
          }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>
              Mes anterior
            </p>
            <p style={{ fontSize: 22, fontWeight: 800, color: "var(--text-tertiary)", fontFamily: "'Barlow Condensed', sans-serif" }}>
              {formatCurrency(monthComparison.lastMonth.revenue)}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {monthComparison.lastMonth.count} corte{monthComparison.lastMonth.count !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{
            background: "var(--accent-bg)",
            border: "1px solid #0a3d56",
            borderRadius: 10,
            padding: 18
          }}>
            <p style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>
              Este mes
            </p>
            <p style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)", fontFamily: "'Barlow Condensed', sans-serif" }}>
              {formatCurrency(monthComparison.thisMonth.revenue)}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
              {monthComparison.thisMonth.count} corte{monthComparison.thisMonth.count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {monthComparison.lastMonth.revenue > 0 && (
          <div style={{
            marginTop: 14,
            padding: 12,
            background: monthComparison.change >= 0 ? "#0f1f0f" : "#1f0f0f",
            border: `1px solid ${monthComparison.change >= 0 ? "#16a34a" : "#dc2626"}`,
            borderRadius: 8,
            textAlign: "center"
          }}>
            <p style={{
              fontSize: 13,
              color: monthComparison.change >= 0 ? "#4ade80" : "#f87171",
              fontWeight: 700
            }}>
              {monthComparison.change >= 0 ? '📈 +' : '📉 '}
              {monthComparison.change.toFixed(1)}% respecto al mes anterior
            </p>
          </div>
        )}
      </Card>

      {/* Productos mini — dentro del grid */}
      <ProductosStats appointments={appointments} compact={true} />

      </div>
      {/* Fin grid 2x2 inferior */}

      {/* ===== HORARIOS PICO — Full width grande ===== */}
      <HorariosPicoFullWidth peakHours={peakHours} maxHourCount={maxHourCount} hoursRange={hoursRange} setHoursRange={setHoursRange} />

    </div>
  );
}

// ========== HORARIOS PICO FULL WIDTH ==========
function HorariosPicoFullWidth({ peakHours, maxHourCount, hoursRange, setHoursRange }) {
  if (!peakHours || peakHours.length === 0) return null;

  const amHours = peakHours.filter(h => parseInt(h.time) < 12);
  const pmHours = peakHours.filter(h => parseInt(h.time) >= 12);
  const allHours = [...amHours, ...pmHours];
  const amPeak = [...amHours].sort((a,b) => b.count - a.count).slice(0, 3);
  const pmPeak = [...pmHours].sort((a,b) => b.count - a.count).slice(0, 3);

  return (
    <div style={{
      marginTop: 16,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: 24,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>⏰</span>
            <h3 style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-primary)' }}>
              Horarios Pico
            </h3>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Distribución de citas por hora del día</p>
        </div>
        <RangePill value={hoursRange} onChange={setHoursRange} />
      </div>

      {/* Chart grande */}
      <div style={{ position: 'relative', height: 260, display: 'flex', alignItems: 'flex-end', paddingTop: 24, overflow: 'visible' }}>
        {/* Líneas guía */}
        {[100, 75, 50, 25].map(pct => (
          <div key={pct} style={{ position: 'absolute', left: 32, right: 0, bottom: `${pct * 260/260}%`, borderTop: '1px dashed var(--border)' }}>
            <span style={{ position: 'absolute', left: -32, fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
              {Math.round(maxHourCount * pct / 100)}
            </span>
          </div>
        ))}

        {/* Barras */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'flex-end', paddingLeft: 32, height: '100%', gap: 4 }}>
          {allHours.map((h, i) => {
            const isAM = parseInt(h.time) < 12;
            const heightPct = (h.count / maxHourCount) * 100;
            const isPeak = h.count === maxHourCount;
            const prevIsAM = i > 0 ? parseInt(allHours[i-1].time) < 12 : true;
            const showDivider = i > 0 && isAM !== prevIsAM;
            return (
              <div key={h.time} style={{ display: 'flex', alignItems: 'flex-end', height: '100%', gap: 4 }}>
                {showDivider && (
                  <div style={{ width: 1, height: '100%', background: 'var(--border-strong)', position: 'relative' }}>
                    <span style={{ position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>12PM</span>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 3, flex: 1, minWidth: 32 }}>
                  {h.count > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: isPeak ? (isAM ? 'var(--accent-light)' : '#818cf8') : 'var(--text-muted)' }}>
                      {h.count}
                    </span>
                  )}
                  <div
                    title={`${h.time}: ${h.count} cita${h.count !== 1 ? 's' : ''}`}
                    style={{
                      width: '100%',
                      height: `${Math.max(heightPct, h.count > 0 ? 2 : 0)}%`,
                      background: isAM
                        ? isPeak ? 'linear-gradient(180deg, #e0f4fc, var(--accent-light), var(--accent-dark))' : 'linear-gradient(180deg, var(--accent-dark), #0a3d56)'
                        : isPeak ? 'linear-gradient(180deg, #c7d2fe, #818cf8, #4f46e5)' : 'linear-gradient(180deg, #4f46e5, #312e81)',
                      borderRadius: '4px 4px 0 0',
                      border: isPeak ? `1px solid ${isAM ? 'var(--accent-light)' : '#818cf8'}` : '1px solid transparent',
                      minHeight: h.count > 0 ? 4 : 0,
                      transition: 'all 0.2s',
                      cursor: h.count > 0 ? 'pointer' : 'default'
                    }}
                    onMouseEnter={e => { if (h.count > 0) { e.currentTarget.style.filter = 'brightness(1.3)'; e.currentTarget.style.boxShadow = `0 0 14px ${isAM ? 'rgba(95,200,236,0.7)' : 'rgba(129,140,248,0.7)'}`; }}}
                    onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Eje X */}
      <div style={{ display: 'flex', paddingLeft: 32, gap: 4, marginTop: 6, borderTop: '2px solid var(--border-strong)', paddingTop: 8 }}>
        {allHours.map((h, i) => {
          const isAM = parseInt(h.time) < 12;
          const prevIsAM = i > 0 ? parseInt(allHours[i-1].time) < 12 : true;
          const showDivider = i > 0 && isAM !== prevIsAM;
          return (
            <div key={h.time} style={{ display: 'flex', gap: 4 }}>
              {showDivider && <div style={{ width: 5 }} />}
              <div style={{ minWidth: 32, textAlign: 'center' }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: isAM ? 'var(--accent-dark)' : '#6366f1' }}>
                  {h.time.replace(':00', '').replace(':30', '³⁰')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen AM/PM */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
        {[
          { label: '☀️ AM (9:00 - 13:30)', peaks: amPeak, color: 'var(--accent)', bg: 'var(--accent-bg)', border: 'var(--accent-border)', count: amHours.reduce((s,h)=>s+h.count,0) },
          { label: '🌙 PM (15:00 - 19:30)', peaks: pmPeak, color: '#818cf8', bg: '#4f46e510', border: '#4f46e540', count: pmHours.reduce((s,h)=>s+h.count,0) },
        ].map(({ label, peaks, color, bg, border, count }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 6 }}>{label}</p>
            <p style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 4 }}>{count} citas</p>
            {peaks.length > 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Picos: {peaks.map(p => p.time).join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--accent-dark)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hora AM pico</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: '#4f46e5' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hora PM pico</span>
        </div>
      </div>
    </div>
  );
}

// ========== PRODUCTOS STATS ==========
function ProductosStats({ appointments, compact = false }) {
  const [range, setRange] = useState(30);

  const data = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - range);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    // Citas con productos en el rango
    const withProducts = appointments.filter(a =>
      a.productos && a.productos.length > 0 &&
      a.date >= cutoffStr &&
      a.status !== 'cancelada'
    );

    // Agrupar por producto
    const byProduct = {};
    withProducts.forEach(a => {
      (a.productos || []).forEach(p => {
        if (!byProduct[p.id]) byProduct[p.id] = { name: p.name, qty: 0, revenue: 0, image: p.image || '' };
        byProduct[p.id].qty += p.qty || 1;
        byProduct[p.id].revenue += (p.price || 0) * (p.qty || 1);
      });
    });

    const products = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
    const totalQty = products.reduce((s, p) => s + p.qty, 0);
    const maxQty = Math.max(...products.map(p => p.qty), 1);

    return { products, totalRevenue, totalQty, maxQty, withProducts };
  }, [appointments, range]);

  if (data.products.length === 0 && data.withProducts.length === 0) return compact ? null : null;

  const sectionStyle = compact ? {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden'
  } : {
    marginTop: 28,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 24,
    overflow: 'hidden'
  };

  return (
    <div style={sectionStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>🛍</span>
            <h3 style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-primary)' }}>
              Ventas de Productos
            </h3>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            Productos vendidos junto a citas
          </p>
        </div>
        {/* Selector de rango */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setRange(d)} style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: range === d ? 'var(--accent)' : 'var(--bg-input)',
              color: range === d ? 'white' : 'var(--text-tertiary)',
              border: `1px solid ${range === d ? 'var(--accent)' : 'var(--border)'}`,
              fontFamily: "'Barlow', sans-serif"
            }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: compact ? 8 : 12, marginBottom: compact ? 16 : 24 }}>
        {[
          { label: 'Ingresos productos', value: `$${data.totalRevenue.toLocaleString()}`, color: 'var(--accent)' },
          { label: 'Unidades vendidas', value: data.totalQty, color: 'var(--text-primary)' },
          { label: 'Citas con productos', value: data.withProducts.length, color: 'var(--text-primary)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Lista de productos */}
      {data.products.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
          Sin ventas de productos en este período
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {(compact ? data.products.slice(0, 4) : data.products).map((p, i) => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Rank */}
              <span style={{ fontSize: 12, fontWeight: 800, color: i === 0 ? 'var(--accent)' : 'var(--text-muted)', width: 18, flexShrink: 0, textAlign: 'right' }}>
                {i + 1}
              </span>
              {/* Foto */}
              <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-input)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.image ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 18 }}>📦</span>}
              </div>
              {/* Barra + info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', fontFamily: "'Barlow Condensed', sans-serif", flexShrink: 0, marginLeft: 8 }}>${p.revenue.toLocaleString()}</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${(p.qty / data.maxQty) * 100}%`,
                    background: i === 0 ? 'var(--accent)' : 'var(--text-muted)',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.qty} unidad{p.qty !== 1 ? 'es' : ''} vendida{p.qty !== 1 ? 's' : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== HELPERS ==========
function RangePill({ value, onChange }) {
  const options = [
    { val: 'today', label: 'Hoy' },
    { val: '7', label: '7d' },
    { val: '30', label: '30d' },
    { val: '90', label: '90d' },
    { val: 'all', label: 'Todo' }
  ];
  return (
    <div style={{ display: "flex", gap: 4, background: "var(--bg-track)", padding: 3, borderRadius: 7 }}>
      {options.map(opt => (
        <button
          key={opt.val}
          onClick={() => onChange(opt.val)}
          style={{
            background: value === opt.val ? "linear-gradient(135deg, var(--accent), var(--accent-light))" : "transparent",
            color: value === opt.val ? "#fff" : "var(--text-tertiary)",
            border: "none",
            borderRadius: 5,
            padding: "5px 10px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: 0.5,
            whiteSpace: "nowrap"
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function KPI({ label, value, color, icon }) {
  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "18px 20px",
      position: "relative",
      overflow: "hidden"
    }}>
      <span style={{ position: "absolute", top: 12, right: 14, fontSize: 18, opacity: 0.4 }}>{icon}</span>
      <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</p>
    </div>
  );
}

function Card({ title, subtitle, children, action }) {
  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: 22,
      marginBottom: 20
    }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 18, fontWeight: 700,
            letterSpacing: 1, textTransform: "uppercase",
            marginBottom: 2
          }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div style={{ textAlign: "center", padding: 30, color: "var(--text-dim)" }}>
      <p style={{ fontSize: 32, marginBottom: 8 }}>{icon}</p>
      <p style={{ fontSize: 13 }}>{message}</p>
    </div>
  );
}
