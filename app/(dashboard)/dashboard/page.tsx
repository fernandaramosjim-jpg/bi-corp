export const dynamic = 'force-dynamic';

import {
  getMermas,
  getVentasMes,
  getDesabastoCritico,
  getClientesEnRiesgo,
} from "@/lib/supabase";
import {
  AlertTriangle, CheckCircle2, Package, Wallet,
  TrendingUp, TrendingDown, Flame, Target,
} from "lucide-react";

// ─── Meta comercial fija ─────────────────────────────────────────────────────
const META_COMERCIAL = 200_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(n);
}
function fmtK(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
}
function diasDesde(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

// ─── Semáforo card ────────────────────────────────────────────────────────────

type Nivel = "rojo" | "amarillo" | "verde";

function SemaforoCard({
  nivel, titulo, valor, detalle, icon: Icon, children,
}: {
  nivel: Nivel; titulo: string; valor: string; detalle: string;
  icon: React.ElementType; children?: React.ReactNode;
}) {
  const styles: Record<Nivel, { border: string; dot: string; val: string; iconBg: string }> = {
    rojo:     { border: "border-rose-200",    dot: "bg-rose-500",    val: "text-rose-600",    iconBg: "bg-rose-50"    },
    amarillo: { border: "border-amber-200",   dot: "bg-amber-400",   val: "text-amber-600",   iconBg: "bg-amber-50"   },
    verde:    { border: "border-emerald-200", dot: "bg-emerald-500", val: "text-emerald-600", iconBg: "bg-emerald-50" },
  };
  const s = styles[nivel];
  return (
    <div className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${s.border}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${s.dot} animate-pulse`} />
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{titulo}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.iconBg}`}>
          <Icon className={`h-4.5 w-4.5 ${s.val}`} />
        </div>
      </div>
      <p className={`text-4xl font-bold tracking-tight mb-1 ${s.val}`} style={{ fontFamily: "var(--font-syne)" }}>
        {valor}
      </p>
      <p className="text-xs text-gray-400 mb-4">{detalle}</p>
      {children && <div className="mt-auto space-y-2">{children}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SemaforoPage() {
  const [mermasData, ventasMes, desabasto, enRiesgo] = await Promise.all([
    getMermas(),
    getVentasMes(),
    getDesabastoCritico(),
    getClientesEnRiesgo(30),
  ]);

  const { rows: mermaRows, totalCosto: totalMerma } = mermasData;
  const { total: totalVentas, count: numVentas, unidades } = ventasMes;

  // ── KPI 4: Meta comercial fija ───────────────────────────────────────────
  const pctMeta    = Math.min(Math.round((totalVentas / META_COMERCIAL) * 100), 100);
  const faltaMeta  = Math.max(META_COMERCIAL - totalVentas, 0);

  // ── Semáforo niveles ─────────────────────────────────────────────────────
  const nivelMerma:    Nivel = totalMerma === 0 ? "verde" : totalMerma < 3_000 ? "amarillo" : "rojo";
  const nivelDesabasto:Nivel = desabasto.length === 0 ? "verde" : desabasto.length <= 2 ? "amarillo" : "rojo";
  const nivelClientes: Nivel = enRiesgo.length === 0 ? "verde" : enRiesgo.length <= 2 ? "amarillo" : "rojo";
  const alertasActivas = [nivelMerma, nivelDesabasto, nivelClientes].filter((n) => n !== "verde").length;

  const hoy     = new Date();
  const hora    = hoy.getHours();
  const saludo  = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
  const mesLabel = hoy.toLocaleString("es-MX", { month: "long", year: "numeric" });

  return (
    <div className="px-6 py-8 lg:px-10">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-syne)" }}>
            {saludo}, Fernanda 👋
          </h1>
          <p className="text-sm text-gray-400 capitalize">{mesLabel} · Semáforo de control</p>
        </div>
        {alertasActivas > 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            <span className="text-sm font-semibold text-rose-700">
              {alertasActivas} alerta{alertasActivas > 1 ? "s" : ""} activa{alertasActivas > 1 ? "s" : ""}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700">Todo en orden hoy</span>
          </div>
        )}
      </div>

      {/* ── KPI 1, 2, 3: Semáforo ───────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

        {/* KPI 1 — Mermas: DATO REAL de tabla mermas.costo_perdida */}
        <SemaforoCard
          nivel={nivelMerma}
          titulo="Fuga por merma"
          valor={fmt(totalMerma)}
          detalle={`${mermaRows.length} registro${mermaRows.length !== 1 ? "s" : ""} de pérdida acumulados`}
          icon={Flame}
        >
          {mermaRows.slice(0, 3).map((r: any) => {
            const nombre = (r.productos as { nombre: string } | null)?.nombre ?? "Producto";
            return (
              <div key={r.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-700">{nombre}</p>
                  <p className="text-[10px] text-gray-400 truncate">{r.motivo}</p>
                </div>
                <span className="flex-shrink-0 text-xs font-bold text-rose-600">{fmt(r.costo_perdida)}</span>
              </div>
            );
          })}
        </SemaforoCard>

        {/* KPI 2 — Desabasto: DATO REAL de tabla productos */}
        <SemaforoCard
          nivel={nivelDesabasto}
          titulo="Desabasto crítico"
          valor={desabasto.length === 0 ? "Sin alertas" : `${desabasto.length} producto${desabasto.length > 1 ? "s" : ""}`}
          detalle={desabasto.length === 0
            ? "Todos los productos tienen stock suficiente"
            : "Stock igual o por debajo del mínimo crítico"}
          icon={Package}
        >
          {(desabasto as any[]).slice(0, 4).map((p) => (
            <div key={p.id} className="flex items-center justify-between">
              <span className="text-xs text-gray-700 truncate max-w-[55%]">{p.nombre}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                  {p.stock_actual} uds
                </span>
                <span className="text-[10px] text-gray-400">
                  mín {p.stock_minimo_critico}
                </span>
              </div>
            </div>
          ))}
        </SemaforoCard>

        {/* KPI 3 — Clientes en riesgo: DATO REAL de tabla clientes */}
        <SemaforoCard
          nivel={nivelClientes}
          titulo="Clientes sin compra +30 días"
          valor={enRiesgo.length === 0 ? "Ninguno" : `${enRiesgo.length} cliente${enRiesgo.length > 1 ? "s" : ""}`}
          detalle={enRiesgo.length === 0
            ? "Todos han comprado en los últimos 30 días"
            : "Ordenados del más crítico al menos crítico"}
          icon={Wallet}
        >
          {(enRiesgo as any[]).slice(0, 3).map((c) => {
            const dias = diasDesde(c.ultima_fecha_compra);
            return (
              <div key={c.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-gray-700">{c.nombre}</p>
                  <p className="text-[10px] text-gray-400">{dias} días inactivo</p>
                </div>
                <span className="ml-2 flex-shrink-0 text-xs font-bold text-amber-600">
                  {fmtK(c.ticket_promedio)}
                </span>
              </div>
            );
          })}
        </SemaforoCard>
      </div>

      {/* ── KPI 4: Meta Comercial $200,000 MXN ──────────────────────────── */}
      <div className="mb-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center gap-2 mb-5">
          <Target className="h-5 w-5 text-indigo-500" />
          <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>
            Meta Comercial del Mes
          </h2>
          <span className={`ml-auto rounded-full px-3 py-1 text-sm font-bold ${
            pctMeta >= 100 ? "bg-emerald-100 text-emerald-700"
            : pctMeta >= 70  ? "bg-indigo-100 text-indigo-700"
            : pctMeta >= 40  ? "bg-amber-100 text-amber-700"
            :                   "bg-rose-100 text-rose-700"
          }`}>
            {pctMeta}%
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="mb-3 h-5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-5 rounded-full transition-all duration-700 ${
              pctMeta >= 100 ? "bg-emerald-500" : pctMeta >= 70 ? "bg-indigo-500" : pctMeta >= 40 ? "bg-amber-400" : "bg-rose-400"
            }`}
            style={{ width: `${pctMeta}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-5">
          <span className="font-semibold text-gray-800">{fmt(totalVentas)} vendidos</span>
          <span>Meta: {fmt(META_COMERCIAL)}</span>
        </div>

        {/* 4 métricas de apoyo */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total vendido",      value: fmtK(totalVentas), sub: `${numVentas} transacciones`,   color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Falta para la meta", value: fmtK(faltaMeta),  sub: pctMeta >= 100 ? "¡Meta alcanzada!" : "por alcanzar", color: faltaMeta === 0 ? "text-emerald-600" : "text-rose-600", bg: faltaMeta === 0 ? "bg-emerald-50" : "bg-rose-50" },
            { label: "Unidades vendidas",  value: String(unidades),  sub: "en total",                      color: "text-violet-600", bg: "bg-violet-50" },
            { label: "Merma acumulada",    value: fmtK(totalMerma), sub: "costo de pérdidas",              color: "text-amber-600",  bg: "bg-amber-50"  },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl p-4 ${item.bg}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{item.label}</p>
              <p className={`text-xl font-bold ${item.color}`} style={{ fontFamily: "var(--font-syne)" }}>{item.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Mensaje motivacional */}
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
          pctMeta >= 100 ? "bg-emerald-50 text-emerald-700"
          : pctMeta >= 70  ? "bg-indigo-50 text-indigo-700"
          :                   "bg-amber-50 text-amber-700"
        }`}>
          {pctMeta >= 100
            ? `🎉 ¡Meta superada! Llevas ${fmt(totalVentas)} de ${fmt(META_COMERCIAL)}.`
            : pctMeta >= 70
              ? `⚡ Vas bien. Te faltan ${fmt(faltaMeta)} para completar la meta de ${fmt(META_COMERCIAL)}.`
              : `🎯 Impulsa las ventas. Llevas el ${pctMeta}% de la meta mensual — faltan ${fmt(faltaMeta)}.`}
        </div>
      </div>

      <footer className="mt-4 text-center text-xs text-gray-300">
        © {new Date().getFullYear()} BI-Corp · Datos en tiempo real vía Supabase
      </footer>
    </div>
  );
}
