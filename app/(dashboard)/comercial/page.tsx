export const dynamic = 'force-dynamic';

import { getVentasMes, getTopProductosMes, getTopClientesMes } from "@/lib/supabase";
import { getPeriodoRange, periodoLabel, diasEnRango } from "@/lib/date-range";
import { DateFilter } from "@/components/DateFilter";
import { Zap, Trophy, Package, Users, TrendingUp } from "lucide-react";

function fmtK(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}

// ─── Velocímetro SVG ──────────────────────────────────────────────────────────

function Velocimetro({ pct }: { pct: number }) {
  const p = Math.min(Math.max(pct, 0), 100);
  const r = 80; const cx = 100; const cy = 100;
  const α = Math.PI * (1 - p / 100);
  const ex = +(cx + r * Math.cos(α)).toFixed(2);
  const ey = +(cy - r * Math.sin(α)).toFixed(2);
  const color = p >= 90 ? "#10b981" : p >= 65 ? "#6366f1" : p >= 40 ? "#f59e0b" : "#f43f5e";

  const marcas = [0, 25, 50, 75, 100].map((m) => {
    const a = Math.PI * (1 - m / 100);
    return {
      x1: +(cx + (r - 9) * Math.cos(a)).toFixed(1), y1: +(cy - (r - 9) * Math.sin(a)).toFixed(1),
      x2: +(cx + (r + 5) * Math.cos(a)).toFixed(1), y2: +(cy - (r + 5) * Math.sin(a)).toFixed(1),
      lx: +(cx + (r + 16) * Math.cos(a)).toFixed(1), ly: +(cy - (r + 16) * Math.sin(a)).toFixed(1),
      label: `${m}%`,
    };
  });

  return (
    <svg viewBox="8 8 184 104" className="w-full max-w-[280px] mx-auto select-none">
      <path d={`M ${cx-r},${cy} A ${r},${r} 0 0,0 ${cx+r},${cy}`}
        fill="none" stroke="#f3f4f6" strokeWidth="14" strokeLinecap="round" />
      {p > 0.5 && p < 99.5 && (
        <path d={`M ${cx-r},${cy} A ${r},${r} 0 0,0 ${ex},${ey}`}
          fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
      )}
      {p >= 99.5 && (
        <path d={`M ${cx-r},${cy} A ${r},${r} 0 0,0 ${cx+r},${cy}`}
          fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
      )}
      <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <circle cx={cx} cy={cy} r="5" fill={color} />
      {marcas.map((m) => (
        <g key={m.label}>
          <line x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke="#e5e7eb" strokeWidth="1.5" />
          <text x={m.lx} y={m.ly} textAnchor="middle" dominantBaseline="middle" fill="#9ca3af" fontSize="6">{m.label}</text>
        </g>
      ))}
    </svg>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];
const BAR_COLOR = ["bg-indigo-500","bg-violet-500","bg-sky-500","bg-amber-400","bg-rose-400"];
const ROW_BG    = ["bg-indigo-50 ring-1 ring-indigo-100","bg-violet-50 ring-1 ring-violet-100","bg-sky-50 ring-1 ring-sky-100","bg-gray-50","bg-gray-50","bg-gray-50"];

function LeaderRow({ nombre, total, maxTotal, rank, sub }: { nombre: string; total: number; maxTotal: number; rank: number; sub?: string }) {
  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  const i = rank - 1;
  return (
    <div className={`flex items-center gap-3 rounded-xl p-3 ${ROW_BG[i] ?? "bg-gray-50"}`}>
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center">
        {i < 3
          ? <span className="text-xl">{MEDALS[i]}</span>
          : <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${BAR_COLOR[i] ?? "bg-gray-400"}`}>{rank}</span>}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ComercialPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const periodo = typeof sp.periodo === "string" ? sp.periodo : "mes_actual";
  const rango = getPeriodoRange(periodo);
  const pLabel = periodoLabel(periodo);

  const [ventasMes, topProductos, topClientes] = await Promise.all([
    getVentasMes(rango).catch(() => ({ total: 0, count: 0, unidades: 0 })),
    getTopProductosMes(rango).catch(() => []),
    getTopClientesMes(rango).catch(() => []),
  ]);

  const { total, count } = ventasMes;

  // ── Cálculos de velocidad ─────────────────────────────────────────────────
  const hoy = new Date();
  // Días efectivos transcurridos en el periodo seleccionado
  const esDiaActual = periodo === "mes_actual";
  const diaActual   = hoy.getDate();
  const diasDelMes  = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const diasEfectivos = esDiaActual ? diaActual : diasEnRango(rango);
  const diasRestantes = esDiaActual ? diasDelMes - diaActual : 0;
  const tasaDiaria    = diasEfectivos > 0 ? total / diasEfectivos : 0;
  const proyeccion    = esDiaActual ? tasaDiaria * diasDelMes : total;

  // Para el velocímetro: % vendido vs proyección esperada al cierre
  const pctVendido     = proyeccion > 0 ? Math.round((total / proyeccion) * 100) : 0;

  const maxProd = topProductos[0]?.total ?? 1;
  const maxCli  = topClientes[0]?.total  ?? 1;

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-syne)" }}>
            Termómetro Comercial
          </h1>
          <p className="text-sm text-gray-400">Velocidad y rendimiento del negocio · {pLabel}</p>
        </div>
      </div>

      {/* ── Filtro de periodo ────────────────────────────────────────────── */}
      <div className="mb-6">
        <DateFilter periodo={periodo} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* KPI 6: Velocímetro */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>
              Velocidad de venta
            </h2>
          </div>

          <div className="flex flex-col items-center mb-6">
            <Velocimetro pct={pctVendido} />
            <p className={`-mt-1 text-4xl font-bold ${
              pctVendido >= 90 ? "text-emerald-600" : pctVendido >= 65 ? "text-indigo-600" : pctVendido >= 40 ? "text-amber-600" : "text-rose-600"
            }`} style={{ fontFamily: "var(--font-syne)" }}>
              {pctVendido}%
            </p>
            <p className="text-sm text-gray-400 mt-1">del ritmo esperado</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "Promedio por día",   value: fmtK(tasaDiaria) },
              { label: esDiaActual ? "Días restantes" : "Días analizados", value: esDiaActual ? `${diasRestantes} días` : `${diasEfectivos} días` },
              { label: "Total acumulado",    value: fmtK(total) },
              { label: esDiaActual ? "Proyección cierre" : "Total periodo", value: fmtK(proyeccion) },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-gray-50 p-3">
                <p className="text-[10px] uppercase tracking-wide text-gray-400">{item.label}</p>
                <p className="text-base font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
            pctVendido >= 100 ? "bg-emerald-50 text-emerald-700"
            : pctVendido >= 70 ? "bg-indigo-50 text-indigo-700"
            : "bg-rose-50 text-rose-700"
          }`}>
            {pctVendido >= 100
              ? `🎉 Vas por delante del ritmo esperado. Proyectas ${fmtK(proyeccion)} al cierre.`
              : pctVendido >= 70
                ? `⚡ Buen ritmo. Necesitas ${fmtK(Math.max((proyeccion - total) / Math.max(diasRestantes, 1), 0))}/día para mantener la proyección.`
                : `🚨 Ritmo bajo. Acelera a ${fmtK(Math.max((proyeccion - total) / Math.max(diasRestantes, 1), 0))}/día para alcanzar la proyección.`}
          </div>
        </section>

        {/* KPI 7: Rankings */}
        <section className="flex flex-col gap-4">
          {/* Top Productos */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-violet-500" />
              <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>
                Top productos · {pLabel}
              </h2>
              <span className="ml-auto text-xs text-gray-400">{count} ventas</span>
            </div>
            {topProductos.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-6">Sin ventas en este periodo.</p>
            ) : (
              <div className="space-y-2">
                {topProductos.slice(0, 4).map((p, i) => (
                  <LeaderRow
                    key={i} rank={i + 1}
                    nombre={p.nombre} total={p.total} maxTotal={maxProd}
                    sub={`${p.unidades} unidades`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Top Clientes */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-sky-500" />
              <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>
                Top clientes · {pLabel}
              </h2>
              <span className="ml-auto text-xs text-gray-400">por volumen</span>
            </div>
            {topClientes.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-6">Sin ventas en este periodo.</p>
            ) : (
              <div className="space-y-2">
                {topClientes.slice(0, 4).map((c, i) => (
                  <LeaderRow key={i} rank={i + 1} nombre={c.nombre} total={c.total} maxTotal={maxCli} />
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-2.5">
              <span className="text-xs text-gray-500">Total {pLabel.toLowerCase()}</span>
              <span className="text-sm font-bold text-indigo-700">{fmt(total)}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
