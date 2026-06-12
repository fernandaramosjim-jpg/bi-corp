"use client";

import { useEffect } from "react";
import { periodoLabel, diasEnRango, getPeriodoRange } from "@/lib/date-range";
import { DateFilter } from "@/components/DateFilter";
import { useDashboard } from "@/context/DashboardContext";
import { Zap, Package, Users, TrendingUp, Star } from "lucide-react";

function fmtK(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

// ─── Velocímetro ─────────────────────────────────────────────────────────────

function Velocimetro({ pct }: { pct: number }) {
  const p = Math.min(Math.max(pct, 0), 100);
  const r = 80; const cx = 100; const cy = 100;
  const α = Math.PI * (1 - p / 100);
  const ex = +(cx + r * Math.cos(α)).toFixed(2);
  const ey = +(cy - r * Math.sin(α)).toFixed(2);
  const color = p >= 90 ? "#10b981" : p >= 65 ? "#6366f1" : p >= 40 ? "#f59e0b" : "#f43f5e";
  const marcas = [0, 25, 50, 75, 100].map((m) => {
    const a = Math.PI * (1 - m / 100);
    return { x1: +(cx+(r-9)*Math.cos(a)).toFixed(1), y1: +(cy-(r-9)*Math.sin(a)).toFixed(1), x2: +(cx+(r+5)*Math.cos(a)).toFixed(1), y2: +(cy-(r+5)*Math.sin(a)).toFixed(1), lx: +(cx+(r+16)*Math.cos(a)).toFixed(1), ly: +(cy-(r+16)*Math.sin(a)).toFixed(1), label: `${m}%` };
  });
  return (
    <svg viewBox="8 8 184 104" className="w-full max-w-[280px] mx-auto select-none">
      <path d={`M ${cx-r},${cy} A ${r},${r} 0 0,0 ${cx+r},${cy}`} fill="none" stroke="#f3f4f6" strokeWidth="14" strokeLinecap="round" />
      {p > 0.5 && p < 99.5 && <path d={`M ${cx-r},${cy} A ${r},${r} 0 0,0 ${ex},${ey}`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />}
      {p >= 99.5 && <path d={`M ${cx-r},${cy} A ${r},${r} 0 0,0 ${cx+r},${cy}`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />}
      <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <circle cx={cx} cy={cy} r="5" fill={color} />
      {marcas.map(m => <g key={m.label}><line x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke="#e5e7eb" strokeWidth="1.5" /><text x={m.lx} y={m.ly} textAnchor="middle" dominantBaseline="middle" fill="#9ca3af" fontSize="6">{m.label}</text></g>)}
    </svg>
  );
}

// ─── Leaderboard row ─────────────────────────────────────────────────────────

const MEDALS = ["🥇","🥈","🥉"];
const BAR_COLOR = ["bg-indigo-500","bg-violet-500","bg-sky-500","bg-amber-400","bg-rose-400"];
const ROW_BG = ["bg-indigo-50 ring-1 ring-indigo-100","bg-violet-50 ring-1 ring-violet-100","bg-sky-50 ring-1 ring-sky-100","bg-gray-50","bg-gray-50"];

function LeaderRow({ nombre, total, maxTotal, rank, sub }: { nombre: string; total: number; maxTotal: number; rank: number; sub?: string }) {
  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  const i = rank - 1;
  return (
    <div className={`flex items-center gap-3 rounded-xl p-3 ${ROW_BG[i] ?? "bg-gray-50"}`}>
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center">
        {i < 3 ? <span className="text-xl">{MEDALS[i]}</span> : <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${BAR_COLOR[i] ?? "bg-gray-400"}`}>{rank}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-semibold text-gray-800 truncate">{nombre}</p>
          <p className="text-sm font-bold text-gray-900 ml-2 flex-shrink-0">{fmtK(total)}</p>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/70">
          <div className={`h-1.5 rounded-full ${BAR_COLOR[i] ?? "bg-gray-300"}`} style={{ width: `${pct}%` }} />
        </div>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Gráfica de evolución (SVG area line chart) ───────────────────────────────

function GraficaEvolucion({ datos }: { datos: { fecha: string; total: number }[] }) {
  if (!datos.length) {
    return <p className="py-8 text-center text-sm text-gray-300">Sin datos en este periodo.</p>;
  }

  const W = 600, H = 170;
  const PAD = { l: 50, r: 10, t: 18, b: 30 };
  const pw = W - PAD.l - PAD.r;
  const ph = H - PAD.t - PAD.b;

  const maxVal = Math.max(...datos.map(d => d.total), 1);

  const xs = (i: number) =>
    PAD.l + (datos.length > 1 ? (i / (datos.length - 1)) : 0.5) * pw;
  const ys = (v: number) => PAD.t + ph - (v / maxVal) * ph;

  const pts = datos.map((d, i) => `${xs(i).toFixed(1)},${ys(d.total).toFixed(1)}`).join(" ");

  const areaPath = datos.length > 1
    ? `M${xs(0).toFixed(1)},${(PAD.t + ph).toFixed(1)} ` +
      datos.map((d, i) => `L${xs(i).toFixed(1)},${ys(d.total).toFixed(1)}`).join(" ") +
      ` L${xs(datos.length - 1).toFixed(1)},${(PAD.t + ph).toFixed(1)} Z`
    : "";

  const peakIdx = datos.reduce((b, d, i) => d.total > datos[b].total ? i : b, 0);

  const yTicks = [0, 0.33, 0.67, 1];

  const xCount = datos.length;
  const xIndices = xCount <= 7
    ? datos.map((_, i) => i)
    : [0, Math.floor(xCount * 0.25), Math.floor(xCount * 0.5), Math.floor(xCount * 0.75), xCount - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none">
      <defs>
        <linearGradient id="evoGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Líneas horizontales guía */}
      {yTicks.map(pct => {
        const y = PAD.t + ph * (1 - pct);
        return (
          <g key={pct}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            {pct > 0 && (
              <text x={PAD.l - 6} y={y} textAnchor="end" dominantBaseline="middle" fill="#d1d5db" fontSize="9">
                {fmtK(maxVal * pct)}
              </text>
            )}
          </g>
        );
      })}

      {/* Eje base */}
      <line x1={PAD.l} y1={PAD.t + ph} x2={W - PAD.r} y2={PAD.t + ph} stroke="#e5e7eb" strokeWidth="1" />

      {/* Área de relleno */}
      {datos.length > 1 && <path d={areaPath} fill="url(#evoGrad)" />}

      {/* Línea principal */}
      {datos.length > 1 && (
        <polyline
          points={pts}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {datos.length === 1 && (
        <circle cx={xs(0)} cy={ys(datos[0].total)} r="5" fill="#6366f1" />
      )}

      {/* Punto y etiqueta del pico */}
      {datos[peakIdx]?.total > 0 && (
        <>
          <circle
            cx={xs(peakIdx)}
            cy={ys(datos[peakIdx].total)}
            r="4.5"
            fill="white"
            stroke="#6366f1"
            strokeWidth="2.5"
          />
          <text
            x={xs(peakIdx)}
            y={ys(datos[peakIdx].total) - 10}
            textAnchor={peakIdx / datos.length > 0.8 ? "end" : "middle"}
            fill="#4f46e5"
            fontSize="9.5"
            fontWeight="700"
          >
            {fmtK(datos[peakIdx].total)}
          </text>
        </>
      )}

      {/* Etiquetas X */}
      {xIndices.map(idx => {
        if (!datos[idx]) return null;
        const parts = datos[idx].fecha.split("-");
        const label = `${parts[2]}/${parts[1]}`;
        return (
          <text key={idx} x={xs(idx)} y={H - 5} textAnchor="middle" fill="#9ca3af" fontSize="9">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Ranking de vendedores ────────────────────────────────────────────────────

type Vendedor = { nombre: string; meta: number; total: number; count: number; rank: number };

const VEND_BAR = ["bg-slate-300", "bg-amber-500", "bg-sky-400", "bg-indigo-300"];
const VEND_BG  = ["bg-slate-50 ring-1 ring-slate-100", "bg-amber-50 ring-1 ring-amber-100", "bg-sky-50 ring-1 ring-sky-100", "bg-gray-50"];

function RankingVendedores({ ranking }: { ranking: Vendedor[] }) {
  if (!ranking.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Star className="h-10 w-10 text-amber-200 mb-3" />
        <p className="text-sm font-semibold text-gray-500">Sin datos de vendedores</p>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          Corre el SQL de migración y<br />el script de seed para activar.
        </p>
      </div>
    );
  }

  const top = ranking[0];
  const topMetaPct = top.meta > 0 ? Math.min((top.total / top.meta) * 100, 150) : 0;

  return (
    <div className="space-y-2.5">
      {/* Vendedor #1 — card destacado */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-4 text-white">
        <Star className="absolute -top-3 -right-3 h-20 w-20 text-white/10 rotate-12" fill="currentColor" />
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">🏆</span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-white/70 uppercase tracking-wider">Vendedor estrella</p>
            <p className="text-base font-bold leading-tight truncate">{top.nombre}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl bg-white/20 p-2.5">
            <p className="text-[9px] text-white/70 uppercase tracking-wide">Vendido</p>
            <p className="text-base font-bold" style={{ fontFamily: "var(--font-syne)" }}>{fmtK(top.total)}</p>
          </div>
          <div className="rounded-xl bg-white/20 p-2.5">
            <p className="text-[9px] text-white/70 uppercase tracking-wide">% de meta</p>
            <p className="text-base font-bold" style={{ fontFamily: "var(--font-syne)" }}>{topMetaPct.toFixed(0)}%</p>
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/20 mb-1.5">
          <div
            className="h-1.5 rounded-full bg-white/80 transition-all duration-500"
            style={{ width: `${Math.min(topMetaPct, 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-white/60">{top.count} ventas · meta {fmtK(top.meta)}/mes</p>
      </div>

      {/* #2 en adelante */}
      {ranking.slice(1).map((v, idx) => {
        const metaPct = v.meta > 0 ? Math.min((v.total / v.meta) * 100, 100) : 0;
        const rankMedal = idx === 0 ? "🥈" : idx === 1 ? "🥉" : null;
        return (
          <div key={v.rank} className={`flex items-center gap-3 rounded-xl p-3 ${VEND_BG[idx] ?? "bg-gray-50"}`}>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-lg">
              {rankMedal ?? <span className="text-sm font-bold text-gray-400">{v.rank}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-gray-800 truncate">{v.nombre}</p>
                <p className="text-xs font-bold text-gray-700 flex-shrink-0 ml-2">{fmtK(v.total)}</p>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/60">
                <div
                  className={`h-1.5 rounded-full transition-all ${VEND_BAR[idx] ?? "bg-gray-200"}`}
                  style={{ width: `${metaPct}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">{metaPct.toFixed(0)}% de meta · {v.count} ventas</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-2xl bg-gray-100" />
        <div className="space-y-4">
          <div className="h-36 rounded-2xl bg-gray-100" />
          <div className="h-36 rounded-2xl bg-gray-100" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 h-64 rounded-2xl bg-gray-100" />
        <div className="h-64 rounded-2xl bg-gray-100" />
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ComercialKPIs() {
  const { periodo, setPeriodo, data, loading } = useDashboard();

  useEffect(() => {
    if (!data) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [data]);

  const total           = data?.ventasMes.total ?? 0;
  const count           = data?.ventasMes.count ?? 0;
  const topProductos    = data?.topProductos ?? [];
  const topClientes     = data?.topClientes ?? [];
  const ventasFecha     = data?.ventasFecha ?? [];
  const rankingVendedores = data?.rankingVendedores ?? [];

  const hoy = new Date();
  const esMes = periodo === "mes_actual";
  const diaActual  = hoy.getDate();
  const diasDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const rango = getPeriodoRange(periodo);
  const diasEfectivos = esMes ? diaActual : diasEnRango(rango);
  const diasRestantes = esMes ? diasDelMes - diaActual : 0;
  const tasaDiaria = diasEfectivos > 0 ? total / diasEfectivos : 0;
  const proyeccion = esMes ? tasaDiaria * diasDelMes : total;
  const pctVendido = proyeccion > 0 ? Math.round((total / proyeccion) * 100) : 0;
  const maxProd = topProductos[0]?.total ?? 1;
  const maxCli  = topClientes[0]?.total  ?? 1;
  const pLabel  = periodoLabel(periodo);

  const dimmed = loading && !!data ? " opacity-50 pointer-events-none" : "";

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-syne)" }}>Termómetro Comercial</h1>
        <p className="text-sm text-gray-400">Velocidad y rendimiento del negocio · {pLabel}</p>
      </div>
      <div className="mb-6 flex items-center gap-3">
        <DateFilter periodo={periodo} onChange={setPeriodo} />
        {loading && !!data && <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600 flex-shrink-0" />}
      </div>

      {!data ? <Skeleton /> : (
        <div className="space-y-6">
          {/* ── Fila 1: Velocímetro + Top productos/clientes ── */}
          <div className={`grid grid-cols-1 gap-6 lg:grid-cols-2${dimmed}`}>
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>Velocidad de venta</h2>
              </div>
              <div className="flex flex-col items-center mb-6">
                <Velocimetro pct={pctVendido} />
                <p className={`-mt-1 text-4xl font-bold ${pctVendido >= 90 ? "text-emerald-600" : pctVendido >= 65 ? "text-indigo-600" : pctVendido >= 40 ? "text-amber-600" : "text-rose-600"}`} style={{ fontFamily: "var(--font-syne)" }}>{pctVendido}%</p>
                <p className="text-sm text-gray-400 mt-1">del ritmo esperado</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: "Promedio por día",   value: fmtK(tasaDiaria) },
                  { label: esMes ? "Días restantes" : "Días analizados", value: esMes ? `${diasRestantes} días` : `${diasEfectivos} días` },
                  { label: "Total acumulado",    value: fmtK(total) },
                  { label: esMes ? "Proyección cierre" : "Total periodo", value: fmtK(proyeccion) },
                ].map(item => (
                  <div key={item.label} className="rounded-xl bg-gray-50 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">{item.label}</p>
                    <p className="text-base font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div className={`rounded-xl px-4 py-3 text-sm font-medium ${pctVendido >= 100 ? "bg-emerald-50 text-emerald-700" : pctVendido >= 70 ? "bg-indigo-50 text-indigo-700" : "bg-rose-50 text-rose-700"}`}>
                {pctVendido >= 100 ? `🎉 Vas por delante. Proyectas ${fmtK(proyeccion)} al cierre.` : pctVendido >= 70 ? `⚡ Buen ritmo. Necesitas ${fmtK(Math.max((proyeccion-total)/Math.max(diasRestantes,1),0))}/día.` : `🚨 Ritmo bajo. Acelera a ${fmtK(Math.max((proyeccion-total)/Math.max(diasRestantes,1),0))}/día.`}
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-4 w-4 text-violet-500" />
                  <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>Top productos · {pLabel}</h2>
                  <span className="ml-auto text-xs text-gray-400">{count} ventas</span>
                </div>
                {topProductos.length === 0 ? <p className="text-sm text-gray-300 text-center py-6">Sin ventas en este periodo.</p> : (
                  <div className="space-y-2">
                    {topProductos.slice(0, 4).map((p, i) => <LeaderRow key={i} rank={i+1} nombre={p.nombre} total={p.total} maxTotal={maxProd} sub={`${p.unidades} unidades`} />)}
                  </div>
                )}
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-sky-500" />
                  <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>Top clientes · {pLabel}</h2>
                  <span className="ml-auto text-xs text-gray-400">por volumen</span>
                </div>
                {topClientes.length === 0 ? <p className="text-sm text-gray-300 text-center py-6">Sin ventas en este periodo.</p> : (
                  <div className="space-y-2">
                    {topClientes.slice(0, 4).map((c, i) => <LeaderRow key={i} rank={i+1} nombre={c.nombre} total={c.total} maxTotal={maxCli} />)}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-2.5">
                  <span className="text-xs text-gray-500">Total {pLabel.toLowerCase()}</span>
                  <span className="text-sm font-bold text-indigo-700">{fmt(total)}</span>
                </div>
              </div>
            </section>
          </div>

          {/* ── Fila 2: Evolución + Vendedor estrella ── */}
          <div id="meta" className={`grid grid-cols-1 gap-6 lg:grid-cols-3 scroll-mt-8${dimmed}`}>
            <section className="lg:col-span-2 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center gap-2 border-b border-gray-50 px-6 py-4">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>Evolución de ventas</h2>
                <span className="ml-auto text-xs text-gray-400">{pLabel}</span>
              </div>
              <div className="px-4 pt-3 pb-4">
                <GraficaEvolucion datos={ventasFecha} />
              </div>
            </section>

            <section id="vendedores" className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 scroll-mt-8">
              <div className="flex items-center gap-2 border-b border-gray-50 px-6 py-4">
                <Star className="h-4 w-4 text-amber-500" fill="#f59e0b" />
                <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>Vendedor estrella</h2>
                <span className="ml-auto text-xs text-gray-400">{pLabel}</span>
              </div>
              <div className="px-4 py-4">
                <RankingVendedores ranking={rankingVendedores} />
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
