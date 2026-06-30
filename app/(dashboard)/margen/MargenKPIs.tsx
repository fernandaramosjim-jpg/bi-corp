"use client";

import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid,
} from "recharts";
import { periodoLabel } from "@/lib/date-range";
import { DateFilter } from "@/components/DateFilter";
import { useDashboard } from "@/context/DashboardContext";
import { DollarSign, TrendingUp, TrendingDown, Clock, AlertTriangle, Star, Zap } from "lucide-react";

function fmtK(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, iconColor, bg, label, value, sub, border }: {
  icon: React.ElementType; iconColor: string; bg: string; border: string;
  label: string; value: string; sub: string;
}) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${border}`}>
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-syne)" }}>{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>
    </div>
  );
}

// ─── Insight chip ─────────────────────────────────────────────────────────────

function InsightChip({ tipo, texto }: { tipo: "bueno" | "alerta" | "info"; texto: string }) {
  const s = {
    bueno:  { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: "✅" },
    alerta: { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   icon: "⚠️" },
    info:   { bg: "bg-indigo-50 border-indigo-200",   text: "text-indigo-700",  icon: "💡" },
  }[tipo];
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${s.bg}`}>
      <span className="text-sm flex-shrink-0 mt-0.5">{s.icon}</span>
      <p className={`text-xs leading-relaxed ${s.text}`} dangerouslySetInnerHTML={{ __html: texto }} />
    </div>
  );
}

// ─── Tooltip de la matriz ────────────────────────────────────────────────────

function MatrizTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-lg text-xs max-w-[180px]">
      <p className="font-bold text-gray-800 mb-1 leading-tight">{d.nombre}</p>
      <p className="text-gray-500">Margen: <strong className="text-indigo-600">{d.margenPct.toFixed(0)}%</strong></p>
      <p className="text-gray-500">Volumen: <strong>{d.unidades} uds</strong></p>
      <p className="text-gray-500">Ganancia: <strong className="text-emerald-600">{fmtK(d.gananciaNeta)}</strong></p>
    </div>
  );
}

// ─── Barras horizontales ──────────────────────────────────────────────────────

function BarraDia({ dia, total, maxVal, highlight }: { dia: string; total: number; maxVal: number; highlight: boolean }) {
  const pct = maxVal > 0 ? (total / maxVal) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className={`w-8 flex-shrink-0 text-xs font-medium ${highlight ? "text-indigo-600" : "text-gray-400"}`}>{dia}</span>
      <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-2.5 rounded-full transition-all ${highlight ? "bg-indigo-500" : "bg-indigo-200"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-[10px] text-gray-400 flex-shrink-0">{fmtK(total)}</span>
    </div>
  );
}

function BarraHora({ label, total, maxVal, highlight }: { label: string; total: number; maxVal: number; highlight: boolean }) {
  const pct = maxVal > 0 ? (total / maxVal) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className={`w-8 flex-shrink-0 text-[10px] font-medium ${highlight ? "text-sky-600" : "text-gray-400"}`}>{label}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-2 rounded-full transition-all ${highlight ? "bg-sky-500" : "bg-sky-200"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-[10px] text-gray-400 flex-shrink-0">{fmtK(total)}</span>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0,1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-100" />)}
      </div>
      <div className="space-y-3">
        {[0,1,2].map(i => <div key={i} className="h-12 rounded-xl bg-gray-100" />)}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-2xl bg-gray-100" />
        <div className="h-72 rounded-2xl bg-gray-100" />
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MargenKPIs() {
  const { periodo, setPeriodo, data, loading } = useDashboard();

  const productos  = data?.margenProductos ?? [];
  const ventasDia  = data?.ventasPorDia ?? [];
  const ventasHora = data?.ventasHora ?? [];
  const pLabel     = periodoLabel(periodo);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const conVentas    = productos.filter(p => p.unidades > 0);
  const totalGanancia = conVentas.reduce((s, p) => s + p.gananciaNeta, 0);
  const margenProm   = conVentas.length > 0
    ? conVentas.reduce((s, p) => s + p.margenPct, 0) / conVentas.length : 0;
  const estrella     = [...conVentas].sort((a, b) => b.margenPct - a.margenPct)[0];
  const maquina      = [...conVentas].sort((a, b) => b.gananciaNeta - a.gananciaNeta)[0];
  const riesgo       = [...conVentas].sort((a, b) => a.margenPct - b.margenPct)[0];

  // ── Insights automáticos ──────────────────────────────────────────────────
  const insights: { tipo: "bueno" | "alerta" | "info"; texto: string }[] = [];

  if (maquina && estrella) {
    const pctGanancia = totalGanancia > 0 ? Math.round((maquina.gananciaNeta / totalGanancia) * 100) : 0;
    if (pctGanancia >= 30) {
      insights.push({ tipo: "info", texto: `<strong>${maquina.nombre}</strong> genera el <strong>${pctGanancia}% de toda tu ganancia</strong> — prioriza su disponibilidad y promoción.` });
    }
    if (estrella.margenPct >= 60) {
      insights.push({ tipo: "bueno", texto: `<strong>${estrella.nombre}</strong> tiene el margen más alto (<strong>${estrella.margenPct.toFixed(0)}%</strong>) — es tu producto más rentable por unidad vendida.` });
    }
  }
  if (riesgo && riesgo.margenPct < 25 && riesgo.unidades > 0) {
    insights.push({ tipo: "alerta", texto: `<strong>${riesgo.nombre}</strong> tiene margen bajo (<strong>${riesgo.margenPct.toFixed(0)}%</strong>) con ${riesgo.unidades} unidades vendidas — revisa su precio de venta o negocia el costo con el proveedor.` });
  }
  const altaVentaBajoMargen = conVentas.filter(p => p.unidades > (conVentas[0]?.unidades ?? 0) * 0.4 && p.margenPct < margenProm * 0.7);
  if (altaVentaBajoMargen.length > 0) {
    insights.push({ tipo: "alerta", texto: `<strong>${altaVentaBajoMargen[0].nombre}</strong> se vende mucho pero tiene margen bajo — estás generando volumen sin ganancia real.` });
  }

  const conVentasDia  = ventasDia.filter(d => d.total > 0);
  const mejorDia      = conVentasDia.length > 0 ? conVentasDia.reduce((a, b) => a.total > b.total ? a : b) : null;
  const peorDia       = conVentasDia.length > 0 ? conVentasDia.reduce((a, b) => a.total < b.total ? a : b) : null;
  const mejorHora     = ventasHora.length > 0 ? ventasHora.reduce((a, b) => a.total > b.total ? a : b) : null;
  const maxDia        = mejorDia?.total  ?? 1;
  const maxHora       = mejorHora?.total ?? 1;

  if (mejorDia && peorDia && mejorDia.total > 0 && peorDia.total > 0) {
    const ratio = mejorDia.total / peorDia.total;
    if (ratio >= 1.5) {
      insights.push({ tipo: "info", texto: `<strong>${mejorDia.dia}</strong> vende <strong>${ratio.toFixed(1)}x más</strong> que ${peorDia.dia} — concentra tu equipo y stock en ese día.` });
    }
  }

  // ── Matriz scatter: margen vs unidades ───────────────────────────────────
  const medMargen = margenProm;
  const medUnidades = conVentas.length > 0 ? conVentas.reduce((s, p) => s + p.unidades, 0) / conVentas.length : 0;

  const scatterData = conVentas.map(p => ({
    x: p.unidades,
    y: p.margenPct,
    z: Math.max(p.gananciaNeta, 1),
    nombre: p.nombre,
    margenPct: p.margenPct,
    unidades: p.unidades,
    gananciaNeta: p.gananciaNeta,
  }));

  const dimmed = loading && !!data ? "opacity-50 pointer-events-none" : "";

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-syne)" }}>Radiografía de Margen</h1>
        <p className="text-sm text-gray-400">¿Con qué productos y cuándo ganas más de verdad? · {pLabel}</p>
      </div>
      <div className="mb-6 flex items-center gap-3">
        <DateFilter periodo={periodo} onChange={setPeriodo} />
        {loading && !!data && <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600 flex-shrink-0" />}
      </div>

      {!data ? <Skeleton /> : (
        <div className={dimmed}>

          {/* ── KPI Cards ── */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard icon={DollarSign} iconColor="text-violet-600" bg="bg-violet-50" border="border-violet-100"
              label="Ganancia total" value={fmtK(totalGanancia)} sub={`${conVentas.length} productos activos`} />
            <KPICard icon={TrendingUp} iconColor="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100"
              label="Margen promedio" value={`${margenProm.toFixed(0)}%`} sub="del catálogo completo" />
            <KPICard icon={Star} iconColor="text-amber-500" bg="bg-amber-50" border="border-amber-100"
              label="Mayor margen" value={estrella ? `${estrella.margenPct.toFixed(0)}%` : "—"}
              sub={estrella?.nombre ?? "Sin datos"} />
            <KPICard icon={TrendingDown} iconColor="text-rose-500" bg="bg-rose-50" border="border-rose-100"
              label="Menor margen" value={riesgo ? `${riesgo.margenPct.toFixed(0)}%` : "—"}
              sub={riesgo?.nombre ?? "Sin datos"} />
          </div>

          {/* ── Insights ── */}
          {insights.length > 0 && (
            <div className="mb-6 space-y-2.5">
              {insights.map((ins, i) => <InsightChip key={i} tipo={ins.tipo} texto={ins.texto} />)}
            </div>
          )}

          {/* ── Matriz + Top/Bottom ── */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>Matriz de rentabilidad</h2>
              </div>
              <p className="text-xs text-gray-400 mb-1">Volumen vendido vs margen % — cada burbuja es un producto</p>
              <div className="flex gap-4 text-[10px] text-gray-400 mb-4">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />Alto margen + volumen = estrella</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" />Bajo margen + volumen = revisar precio</span>
              </div>
              {scatterData.length === 0
                ? <p className="text-center text-sm text-gray-300 py-16">Sin ventas en este periodo.</p>
                : (
                <ResponsiveContainer width="100%" height={240}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="x" name="Unidades" type="number"
                      tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                      label={{ value: "Unidades vendidas", position: "insideBottom", offset: -5, fontSize: 10, fill: "#9ca3af" }} />
                    <YAxis dataKey="y" name="Margen" type="number" unit="%" domain={[0, 100]}
                      tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={36} />
                    <ZAxis dataKey="z" range={[40, 400]} />
                    <ReferenceLine y={medMargen} stroke="#e0e7ff" strokeDasharray="4 4" label={{ value: "Margen prom.", position: "right", fontSize: 9, fill: "#a5b4fc" }} />
                    <ReferenceLine x={medUnidades} stroke="#e0e7ff" strokeDasharray="4 4" />
                    <Tooltip content={<MatrizTooltip />} />
                    <Scatter data={scatterData}
                      fill="#6366f1" fillOpacity={0.75} stroke="#4f46e5" strokeWidth={1} />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h2 className="text-sm font-bold text-gray-800 mb-4" style={{ fontFamily: "var(--font-syne)" }}>Top 3 · Fondo 3</h2>
              <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mb-2">Más rentables</p>
              <div className="space-y-2.5 mb-5">
                {[...conVentas].sort((a, b) => b.margenPct - a.margenPct).slice(0, 3).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="text-base flex-shrink-0">{["🥇","🥈","🥉"][i]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{p.nombre}</p>
                      <p className="text-[10px] text-gray-400">{fmtK(p.gananciaNeta)} ganancia · {p.unidades} uds</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 flex-shrink-0">{p.margenPct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-50 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-rose-400 font-bold mb-2">Menor margen</p>
                <div className="space-y-2.5">
                  {[...conVentas].sort((a, b) => a.margenPct - b.margenPct).slice(0, 3).map((p, i) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <AlertTriangle className={`h-3.5 w-3.5 flex-shrink-0 ${i === 0 ? "text-rose-500" : "text-amber-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{p.nombre}</p>
                        <p className="text-[10px] text-gray-400">{p.unidades} uds vendidas</p>
                      </div>
                      <span className={`text-xs font-bold flex-shrink-0 ${i === 0 ? "text-rose-600" : "text-amber-600"}`}>{p.margenPct.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* ── Día y Hora ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>Ventas por día de semana</h2>
              </div>
              <p className="text-xs text-gray-400 mb-4">Optimiza tu equipo según cuándo más se vende.</p>
              {conVentasDia.length === 0
                ? <p className="text-sm text-gray-300 text-center py-8">Sin datos suficientes.</p>
                : <div className="space-y-2.5">
                    {ventasDia.map(d => (
                      <BarraDia key={d.dia} dia={d.dia} total={d.total} maxVal={maxDia} highlight={d.dia === mejorDia?.dia} />
                    ))}
                  </div>
              }
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-sky-500" />
                <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>Picos por hora del día</h2>
              </div>
              <p className="text-xs text-gray-400 mb-4">Detecta cuándo hay más actividad para optimizar staffing.</p>
              {!ventasHora.some(h => h.total > 0)
                ? <p className="text-sm text-gray-300 text-center py-8">Sin datos suficientes.</p>
                : <div className="space-y-2">
                    {ventasHora.filter(h => h.total > 0).map(h => (
                      <BarraHora key={h.hora} label={h.label} total={h.total} maxVal={maxHora} highlight={h.hora === mejorHora?.hora} />
                    ))}
                  </div>
              }
            </section>
          </div>

          <footer className="mt-8 text-center text-xs text-gray-300">© <span suppressHydrationWarning>{new Date().getFullYear()}</span> BI-Corp · Margen y rentabilidad en tiempo real</footer>
        </div>
      )}
    </div>
  );
}
