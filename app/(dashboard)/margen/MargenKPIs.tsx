"use client";

import { useState, useEffect } from "react";
import { getMargenProductos, getVentasPorDia, getVentasPorHora } from "@/lib/supabase";
import { getPeriodoRange, periodoLabel } from "@/lib/date-range";
import { DateFilter } from "@/components/DateFilter";
import { DollarSign, Star, TrendingUp, Clock } from "lucide-react";

function fmtK(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function BarraVertical({ label, value, maxVal, count, highlight = false }: { label: string; value: number; maxVal: number; count: number; highlight?: boolean }) {
  const pct = maxVal > 0 ? (value / maxVal) * 100 : 0;
  const color = highlight ? "bg-indigo-500" : pct >= 75 ? "bg-indigo-400" : pct >= 45 ? "bg-indigo-300" : pct >= 20 ? "bg-indigo-200" : "bg-gray-100";
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      {value > 0 && <span className="text-[9px] font-semibold text-gray-500 leading-none">{fmtK(value)}</span>}
      <div className="flex w-full flex-1 flex-col justify-end">
        <div className={`w-full rounded-t-md ${color} transition-all`} style={{ height: `${Math.max(pct, value > 0 ? 4 : 0)}%` }} title={`${label}: ${fmtK(value)} (${count} ventas)`} />
      </div>
      <span className={`text-[10px] font-medium ${highlight ? "text-indigo-600" : "text-gray-400"}`}>{label}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-64 rounded-2xl bg-gray-100" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-56 rounded-2xl bg-gray-100" />
        <div className="h-56 rounded-2xl bg-gray-100" />
      </div>
    </div>
  );
}

export default function MargenKPIs() {
  const [periodo, setPeriodo] = useState("mes_actual");
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({ productos: [] as any[], ventasDia: [] as any[], ventasHora: [] as any[] });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const rango = getPeriodoRange(periodo);
    Promise.all([
      getMargenProductos(rango).catch(() => []),
      getVentasPorDia(rango).catch(() => []),
      getVentasPorHora(rango).catch(() => []),
    ]).then(([productos, ventasDia, ventasHora]) => {
      if (cancelled) return;
      setKpi({ productos, ventasDia, ventasHora });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [periodo]);

  const { productos, ventasDia, ventasHora } = kpi;
  const conVentasDia = ventasDia.filter(d => d.total > 0);
  const mejorDia  = conVentasDia.length > 0 ? conVentasDia.reduce((a, b) => a.total > b.total ? a : b) : null;
  const mejorHora = ventasHora.length > 0 ? ventasHora.reduce((a, b) => a.total > b.total ? a : b) : null;
  const maxDia  = mejorDia?.total  ?? 1;
  const maxHora = mejorHora?.total ?? 1;
  const hayDias  = conVentasDia.length > 0;
  const hayHoras = ventasHora.some(h => h.total > 0);
  const pLabel = periodoLabel(periodo);

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-syne)" }}>Radiografía de Margen</h1>
        <p className="text-sm text-gray-400">¿Cuándo y con qué productos ganas más de verdad? · {pLabel}</p>
      </div>
      <div className="mb-6"><DateFilter periodo={periodo} onChange={setPeriodo} /></div>

      {loading ? <Skeleton /> : (
        <>
          <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-violet-500" />
              <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>Ranking de productos por margen neto real</h2>
            </div>
            <p className="text-xs text-gray-400 mb-5">Margen = (Precio − Costo) / Precio × 100 · Unidades vendidas: {pLabel}</p>
            {productos.length === 0 ? <p className="text-center text-sm text-gray-300 py-8">Sin datos en este periodo.</p> : (
              <>
                <div className="space-y-4">
                  {productos.map((p, i) => {
                    const mc = p.margenPct >= 65 ? "text-emerald-600" : p.margenPct >= 40 ? "text-indigo-600" : "text-amber-600";
                    const bc = p.margenPct >= 65 ? "bg-emerald-400" : p.margenPct >= 40 ? "bg-indigo-400" : "bg-amber-400";
                    return (
                      <div key={p.id} className="flex items-center gap-4 rounded-xl border border-gray-100 p-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                          {i === 0 ? <Star className="h-7 w-7 text-amber-400 fill-amber-400" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-500">{i+1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-sm font-semibold text-gray-800 truncate">{p.nombre}</p>
                            <span className={`text-sm font-bold flex-shrink-0 ml-2 ${mc}`}>{p.margenPct.toFixed(0)}% margen</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-100">
                            <div className={`h-2 rounded-full ${bc}`} style={{ width: `${Math.min(p.margenPct, 100)}%` }} />
                          </div>
                          <div className="mt-1.5 grid grid-cols-4 gap-2 text-[10px] text-gray-400">
                            <span>Costo: {fmtK(p.costo_proveedor)}</span>
                            <span>Precio: {fmtK(p.precio_venta)}</span>
                            <span>Vendidas: {p.unidades} uds</span>
                            <span className={`font-semibold ${mc}`}>Ganancia: {fmtK(p.gananciaNeta)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 rounded-xl bg-violet-50 border border-violet-100 px-4 py-3">
                  <p className="text-xs text-violet-700"><strong>Insight:</strong> "{productos[0]?.nombre}" tiene el margen más alto ({productos[0]?.margenPct.toFixed(0)}%).{productos[productos.length-1] && ` "${productos[productos.length-1].nombre}" es el menos rentable con ${productos[productos.length-1].margenPct.toFixed(0)}%.`}</p>
                </div>
              </>
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>Ventas por día de semana</h2>
                <span className="ml-auto text-xs text-gray-400">{pLabel}</span>
              </div>
              <p className="text-xs text-gray-400 mb-5">Optimiza tu equipo según cuándo vende más.</p>
              {!hayDias ? <p className="text-sm text-gray-300 text-center py-10">Sin datos suficientes.</p> : (
                <>
                  {mejorDia && (
                    <div className="flex items-center gap-2 mb-4 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <p className="text-xs text-emerald-700"><strong>{mejorDia.dia}</strong> es el día más fuerte — {fmtK(mejorDia.total)} ({mejorDia.count} ventas)</p>
                    </div>
                  )}
                  <div className="flex items-end gap-1 h-36">
                    {ventasDia.map(d => <BarraVertical key={d.dia} label={d.dia} value={d.total} maxVal={maxDia} count={d.count} highlight={d.dia === mejorDia?.dia} />)}
                  </div>
                </>
              )}
            </section>
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-sky-500" />
                <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>Ventas por hora del día</h2>
                <span className="ml-auto text-xs text-gray-400">{pLabel}</span>
              </div>
              <p className="text-xs text-gray-400 mb-5">Detecta picos horarios para optimizar staffing.</p>
              {!hayHoras ? <p className="text-sm text-gray-300 text-center py-10">Sin datos suficientes.</p> : (
                <>
                  {mejorHora && (
                    <div className="flex items-center gap-2 mb-4 rounded-lg bg-sky-50 border border-sky-100 px-3 py-2">
                      <Clock className="h-4 w-4 text-sky-600" />
                      <p className="text-xs text-sky-700">Pico a las <strong>{mejorHora.label}</strong> — {fmtK(mejorHora.total)} ({mejorHora.count} ventas)</p>
                    </div>
                  )}
                  <div className="flex items-end gap-0.5 h-36">
                    {ventasHora.map(h => <BarraVertical key={h.hora} label={h.label} value={h.total} maxVal={maxHora} count={h.count} highlight={h.hora === mejorHora?.hora} />)}
                  </div>
                </>
              )}
            </section>
          </div>
          <footer className="mt-8 text-center text-xs text-gray-300">© {new Date().getFullYear()} BI-Corp · Margen y rentabilidad en tiempo real</footer>
        </>
      )}
    </div>
  );
}
