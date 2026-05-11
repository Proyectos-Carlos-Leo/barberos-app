import { useMemo } from 'react';
import { formatCurrency, getTodayStr } from '../utils/helpers';

export default function ReportsView({ appointments, barbers }) {
  // Solo citas completadas tienen ingresos reales
  const completed = useMemo(
    () => appointments.filter(a => a.status === 'completada'),
    [appointments]
  );

  // ========== INGRESOS ÚLTIMOS 7 DÍAS ==========
  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
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
  }, [completed]);

  const maxRevenue = Math.max(...last7Days.map(d => d.revenue), 1);
  const totalLast7 = last7Days.reduce((sum, d) => sum + d.revenue, 0);

  // ========== TOP BARBEROS ==========
  const topBarbers = useMemo(() => {
    const stats = barbers.map(b => {
      const barberAppts = completed.filter(a => String(a.barberId) === String(b.id));
      const revenue = barberAppts.reduce((sum, a) => sum + (a.service?.price || 0), 0);
      return {
        ...b,
        count: barberAppts.length,
        revenue
      };
    });
    return stats.sort((a, b) => b.revenue - a.revenue);
  }, [completed, barbers]);

  // ========== SERVICIOS MÁS VENDIDOS ==========
  const topServices = useMemo(() => {
    const map = new Map();
    completed.forEach(a => {
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
  }, [completed]);

  const maxServiceCount = Math.max(...topServices.map(s => s.count), 1);

  // ========== HORARIOS PICO ==========
  const peakHours = useMemo(() => {
    const map = new Map();
    completed.forEach(a => {
      if (!map.has(a.time)) map.set(a.time, 0);
      map.set(a.time, map.get(a.time) + 1);
    });
    return Array.from(map.entries())
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [completed]);

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
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-title" style={{ marginBottom: 4 }}>
          <span className="gold">Reportes</span> & análisis
        </h1>
        <p style={{ color: "#888", fontSize: 14 }}>Métricas del negocio en tiempo real</p>
      </div>

      {/* Resumen general */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 28 }}>
        <KPI label="Total citas completadas" value={completed.length} color="#4ade80" icon="✓" />
        <KPI label="Ingresos totales" value={formatCurrency(totalRevenue)} color="#c9a84c" icon="💰" />
        <KPI label="Ticket promedio" value={formatCurrency(Math.round(avgTicket))} color="#60a5fa" icon="🧾" />
        <KPI label="Últimos 7 días" value={formatCurrency(totalLast7)} color="#a78bfa" icon="📅" />
      </div>

      {/* HISTOGRAMA: Ingresos últimos 7 días */}
      <Card title="📊 Ingresos últimos 7 días" subtitle={`Total: ${formatCurrency(totalLast7)}`}>
        {totalLast7 === 0 ? (
          <EmptyState icon="📊" message="Aún no hay ingresos registrados" />
        ) : (
          <div style={{ padding: "16px 0 0" }}>
            {/* Área del histograma */}
            <div style={{ position: "relative", height: 200, display: "flex", alignItems: "flex-end", gap: 0 }}>
              {/* Líneas guía del eje Y */}
              {[100, 75, 50, 25].map(pct => (
                <div key={pct} style={{
                  position: "absolute",
                  left: 0, right: 0,
                  bottom: `${pct}%`,
                  borderTop: "1px dashed #1e1e1e",
                  display: "flex",
                  alignItems: "center"
                }}>
                  <span style={{
                    position: "absolute",
                    left: -8,
                    transform: "translateX(-100%)",
                    fontSize: 9,
                    color: "#444",
                    whiteSpace: "nowrap"
                  }}>
                    {formatCurrency(Math.round(maxRevenue * pct / 100))}
                  </span>
                </div>
              ))}
              {/* Barras */}
              <div style={{ display: "flex", flex: 1, alignItems: "flex-end", gap: 6, paddingLeft: 48, height: "100%" }}>
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
                      {d.revenue > 0 && (
                        <span style={{
                          fontSize: 9,
                          color: isToday ? "#c9a84c" : "#555",
                          fontWeight: 700,
                          textAlign: "center",
                          whiteSpace: "nowrap"
                        }}>
                          {formatCurrency(d.revenue)}
                        </span>
                      )}
                      {/* Barra */}
                      <div style={{
                        width: "100%",
                        height: `${Math.max(heightPct, d.revenue > 0 ? 3 : 0)}%`,
                        background: isToday
                          ? "linear-gradient(180deg, #e8c96a, #c9a84c, #8a6d2c)"
                          : d.revenue > 0
                            ? "linear-gradient(180deg, #555, #333)"
                            : "#1a1a1a",
                        borderRadius: "4px 4px 0 0",
                        border: isToday ? "1px solid #e8c96a" : d.revenue > 0 ? "1px solid #444" : "1px dashed #222",
                        minHeight: d.revenue > 0 ? 4 : 0,
                        transition: "height 0.5s ease",
                        position: "relative"
                      }} />
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Eje X */}
            <div style={{
              display: "flex",
              paddingLeft: 48,
              gap: 6,
              marginTop: 6,
              borderTop: "2px solid #2e2e2e"
            }}>
              {last7Days.map(d => {
                const isToday = d.dateStr === getTodayStr();
                return (
                  <div key={d.dateStr} style={{
                    flex: 1,
                    textAlign: "center",
                    paddingTop: 6
                  }}>
                    <p style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: isToday ? "#c9a84c" : "#555",
                      textTransform: "uppercase"
                    }}>
                      {d.label}
                    </p>
                    <p style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: isToday ? "#c9a84c" : "#888"
                    }}>
                      {d.num}
                    </p>
                    {d.count > 0 && (
                      <p style={{ fontSize: 9, color: "#555" }}>{d.count}✓</p>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Leyenda */}
            <div style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid #1e1e1e",
              display: "flex",
              gap: 16,
              flexWrap: "wrap"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: "linear-gradient(180deg, #e8c96a, #c9a84c)" }} />
                <span style={{ fontSize: 11, color: "#666" }}>Hoy</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: "#444" }} />
                <span style={{ fontSize: 11, color: "#666" }}>Días anteriores</span>
              </div>
              <span style={{ fontSize: 11, color: "#555", marginLeft: "auto" }}>✓ = citas completadas</span>
            </div>
          </div>
        )}
      </Card>

      {/* Top barberos */}
      <Card title="🏆 Top barberos" subtitle="Ranking por ingresos generados">
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
                      <span style={{ color: "#c9a84c", fontWeight: 700, fontSize: 14 }}>
                        {formatCurrency(b.revenue)}
                      </span>
                    </div>
                    <div style={{ height: 6, background: "#1a1a1a", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        width: `${widthPct}%`,
                        height: "100%",
                        background: i === 0
                          ? "linear-gradient(90deg, #c9a84c, #e8c96a)"
                          : "linear-gradient(90deg, #555, #888)",
                        transition: "width 0.5s"
                      }} />
                    </div>
                    <p style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{b.count} corte{b.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Servicios más vendidos */}
      <Card title="💈 Servicios más vendidos" subtitle="Por cantidad de cortes">
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
                      <span style={{ fontSize: 11, color: "#666" }}>{s.count} corte{s.count !== 1 ? 's' : ''}</span>
                      <span style={{ color: "#c9a84c", fontWeight: 700, fontSize: 13 }}>
                        {formatCurrency(s.revenue)}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 8, background: "#1a1a1a", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      width: `${widthPct}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #c9a84c, #e8c96a)",
                      transition: "width 0.5s"
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* HISTOGRAMA: Horarios pico con AM/PM */}
      <Card title="⏰ Horarios pico" subtitle="Distribución de citas por hora del día">
        {peakHours.length === 0 ? (
          <EmptyState icon="📊" message="Aún no hay datos suficientes" />
        ) : (() => {
          // Separar AM y PM
          const amHours = peakHours.filter(h => parseInt(h.time) < 12);
          const pmHours = peakHours.filter(h => parseInt(h.time) >= 12);
          const allHours = [...amHours, ...pmHours];

          return (
            <div style={{ padding: "16px 0 0" }}>
              {/* Histograma */}
              <div style={{ position: "relative", height: 180, display: "flex", alignItems: "flex-end" }}>
                {/* Líneas guía Y */}
                {[100, 75, 50, 25].map(pct => (
                  <div key={pct} style={{
                    position: "absolute",
                    left: 0, right: 0,
                    bottom: `${pct}%`,
                    borderTop: "1px dashed #1e1e1e"
                  }}>
                    <span style={{
                      position: "absolute",
                      left: -6,
                      transform: "translateX(-100%)",
                      fontSize: 9,
                      color: "#444"
                    }}>
                      {Math.round(maxHourCount * pct / 100)}
                    </span>
                  </div>
                ))}
                {/* Barras */}
                <div style={{
                  display: "flex",
                  flex: 1,
                  alignItems: "flex-end",
                  paddingLeft: 28,
                  height: "100%",
                  gap: 3
                }}>
                  {allHours.map((h, i) => {
                    const isAM = parseInt(h.time) < 12;
                    const heightPct = (h.count / maxHourCount) * 100;
                    const isPeak = h.count === maxHourCount;
                    // Separador visual entre AM y PM
                    const prevIsAM = i > 0 ? parseInt(allHours[i - 1].time) < 12 : true;
                    const showDivider = i > 0 && isAM !== prevIsAM;
                    return (
                      <div key={h.time} style={{
                        display: "flex",
                        alignItems: "flex-end",
                        height: "100%",
                        gap: 3
                      }}>
                        {/* Separador AM/PM */}
                        {showDivider && (
                          <div style={{
                            width: 1,
                            height: "100%",
                            background: "#3d3d3d",
                            marginRight: 4,
                            position: "relative"
                          }}>
                            <span style={{
                              position: "absolute",
                              bottom: -20,
                              left: "50%",
                              transform: "translateX(-50%)",
                              fontSize: 8,
                              color: "#555",
                              whiteSpace: "nowrap"
                            }}>
                              12PM
                            </span>
                          </div>
                        )}
                        <div style={{
                          width: 28,
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 2
                        }}>
                          {/* Valor */}
                          {h.count > 0 && (
                            <span style={{
                              fontSize: 9,
                              color: isPeak ? (isAM ? "#fbbf24" : "#818cf8") : "#555",
                              fontWeight: 700
                            }}>
                              {h.count}
                            </span>
                          )}
                          {/* Barra */}
                          <div style={{
                            width: "100%",
                            height: `${Math.max(heightPct, 3)}%`,
                            background: isAM
                              ? isPeak
                                ? "linear-gradient(180deg, #fef08a, #fbbf24, #d97706)"
                                : "linear-gradient(180deg, #d97706, #92400e)"
                              : isPeak
                                ? "linear-gradient(180deg, #c7d2fe, #818cf8, #4f46e5)"
                                : "linear-gradient(180deg, #4f46e5, #312e81)",
                            borderRadius: "3px 3px 0 0",
                            border: isPeak
                              ? `1px solid ${isAM ? "#fbbf24" : "#818cf8"}`
                              : "1px solid transparent",
                            minHeight: 3,
                            transition: "height 0.5s ease"
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Eje X con horas */}
              <div style={{
                display: "flex",
                paddingLeft: 28,
                gap: 3,
                marginTop: 4,
                borderTop: "2px solid #2e2e2e",
                paddingTop: 6
              }}>
                {allHours.map((h, i) => {
                  const isAM = parseInt(h.time) < 12;
                  const prevIsAM = i > 0 ? parseInt(allHours[i - 1].time) < 12 : true;
                  const showDivider = i > 0 && isAM !== prevIsAM;
                  return (
                    <div key={h.time} style={{ display: "flex", gap: 3 }}>
                      {showDivider && <div style={{ width: 5 }} />}
                      <div style={{ width: 28, textAlign: "center" }}>
                        <span style={{
                          fontSize: 8,
                          fontWeight: 600,
                          color: isAM ? "#d97706" : "#6366f1",
                          display: "block"
                        }}>
                          {h.time.replace(":00", "").replace(":30", "³⁰")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bloques AM/PM */}
              <div style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap"
              }}>
                {/* AM */}
                <div style={{
                  flex: 1,
                  minWidth: 140,
                  background: "#1a1200",
                  border: "1px solid #92400e",
                  borderRadius: 8,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10
                }}>
                  <div style={{ width: 10, height: 28, borderRadius: 2, background: "linear-gradient(180deg, #fbbf24, #d97706)" }} />
                  <div>
                    <p style={{ fontSize: 11, color: "#d97706", fontWeight: 700, textTransform: "uppercase" }}>
                      ☀️ AM (9:00 - 13:30)
                    </p>
                    <p style={{ fontSize: 13, color: "#fbbf24", fontWeight: 800 }}>
                      {amHours.reduce((s, h) => s + h.count, 0)} citas
                    </p>
                  </div>
                </div>
                {/* PM */}
                <div style={{
                  flex: 1,
                  minWidth: 140,
                  background: "#0f0f1a",
                  border: "1px solid #312e81",
                  borderRadius: 8,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10
                }}>
                  <div style={{ width: 10, height: 28, borderRadius: 2, background: "linear-gradient(180deg, #818cf8, #4f46e5)" }} />
                  <div>
                    <p style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, textTransform: "uppercase" }}>
                      🌙 PM (15:00 - 19:30)
                    </p>
                    <p style={{ fontSize: 13, color: "#818cf8", fontWeight: 800 }}>
                      {pmHours.reduce((s, h) => s + h.count, 0)} citas
                    </p>
                  </div>
                </div>
              </div>

              {/* Leyenda */}
              <div style={{
                marginTop: 10,
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                alignItems: "center"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: "#fbbf24" }} />
                  <span style={{ fontSize: 11, color: "#666" }}>Hora AM pico</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: "#818cf8" }} />
                  <span style={{ fontSize: 11, color: "#666" }}>Hora PM pico</span>
                </div>
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Comparativa mensual */}
      <Card title="📆 Comparativa mensual" subtitle="Este mes vs mes anterior">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{
            background: "#0f0f0f",
            border: "1px solid #1e1e1e",
            borderRadius: 10,
            padding: 18
          }}>
            <p style={{ fontSize: 11, color: "#666", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>
              Mes anterior
            </p>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#888", fontFamily: "'Barlow Condensed', sans-serif" }}>
              {formatCurrency(monthComparison.lastMonth.revenue)}
            </p>
            <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              {monthComparison.lastMonth.count} corte{monthComparison.lastMonth.count !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{
            background: "#1a150a",
            border: "1px solid #3d2e0a",
            borderRadius: 10,
            padding: 18
          }}>
            <p style={{ fontSize: 11, color: "#c9a84c", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>
              Este mes
            </p>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#c9a84c", fontFamily: "'Barlow Condensed', sans-serif" }}>
              {formatCurrency(monthComparison.thisMonth.revenue)}
            </p>
            <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
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
    </div>
  );
}

// ========== HELPERS ==========
function KPI({ label, value, color, icon }) {
  return (
    <div style={{
      background: "#141414",
      border: "1px solid #1e1e1e",
      borderRadius: 12,
      padding: "18px 20px",
      position: "relative",
      overflow: "hidden"
    }}>
      <span style={{ position: "absolute", top: 12, right: 14, fontSize: 18, opacity: 0.4 }}>{icon}</span>
      <p style={{ fontSize: 11, color: "#666", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</p>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div style={{
      background: "#141414",
      border: "1px solid #1e1e1e",
      borderRadius: 12,
      padding: 22,
      marginBottom: 20
    }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 18, fontWeight: 700,
          letterSpacing: 1, textTransform: "uppercase",
          marginBottom: 2
        }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 12, color: "#666" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div style={{ textAlign: "center", padding: 30, color: "#555" }}>
      <p style={{ fontSize: 32, marginBottom: 8 }}>{icon}</p>
      <p style={{ fontSize: 13 }}>{message}</p>
    </div>
  );
}
