"use client";

import React, { useEffect } from "react";
import { periodoLabel } from "@/lib/date-range";
import { DateFilter } from "@/components/DateFilter";
import { useDashboard } from "@/context/DashboardContext";
import {
  AlertTriangle, CheckCircle2, Package, Wallet, Flame, Target,
} from "lucide-react";

const META_COMERCIAL = 200_000;

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
}
function fmtK(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
}
function diasDesde(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

type Nivel = "rojo" | "amarillo" | "verde";

function SemaforoCard({ nivel, titulo, valor, detalle, icon: Icon, children, id }: {
  nivel: Nivel; titulo: string; valor: string; detalle: string;
  icon: React.ElementType; children?: React.ReactNode; id?: string;
}) {
  const s = {
    rojo:     { border: "border-rose-200",    dot: "bg-rose-500",    val: "text-rose-600",    iconBg: "bg-rose-50" },
    amarillo: { border: "border-amber-200",   dot: "bg-amber-400",   val: "text-amber-600",   iconBg: "bg-amber-50" },
    verde:    { border: "border-emerald-200", dot: "bg-emerald-500", val: "text-emerald-600", iconBg: "bg-emerald-50" },
  }[nivel];
  return (
    <div id={id} className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm scroll-mt-20 ${s.border}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${s.dot} animate-pulse`} />
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{titulo}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.iconBg}`}>
          <Icon className={`h-4.5 w-4.5 ${s.val}`} />
        </div>
      </div>
      <p className={`text-4xl font-bold tracking-tight mb-1 ${s.val}`} style={{ fontFamily: "var(--font-syne)" }}>{valor}</p>
      <p className="text-xs text-gray-400 mb-4">{detalle}</p>
      {children && <div className="mt-auto space-y-2">{children}</div>}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0,1,2].map(i => <div key={i} className="h-48 rounded-2xl bg-gray-100" />)}
      </div>
      <div className="h-64 rounded-2xl bg-gray-100" />
    </div>
  );
}

export default function SemaforoKPIs() {
  const { periodo, setPeriodo, data, loading } = useDashboard();

  useEffect(() => {
    if (!data) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [data]);

  const mermaRows   = data?.mermas.rows ?? [];
  const totalMerma  = data?.mermas.totalCosto ?? 0;
  const totalVentas = data?.ventasMes.total ?? 0;
  const numVentas   = data?.ventasMes.count ?? 0;
  const unidades    = data?.ventasMes.unidades ?? 0;
  const desabasto   = data?.desabasto ?? [];
  const enRiesgo    = data?.enRiesgo30 ?? [];

  const pctMeta   = Math.min(Math.round((totalVentas / META_COMERCIAL) * 100), 100);
  const faltaMeta = Math.max(META_COMERCIAL - totalVentas, 0);
  const nivelMerma:     Nivel = totalMerma === 0 ? "verde" : totalMerma < 3_000 ? "amarillo" : "rojo";
  const nivelDesabasto: Nivel = desabasto.length === 0 ? "verde" : desabasto.length <= 2 ? "amarillo" : "rojo";
  const nivelClientes:  Nivel = enRiesgo.length === 0 ? "verde" : enRiesgo.length <= 2 ? "amarillo" : "rojo";
  const alertasActivas  = [nivelMerma, nivelDesabasto, nivelClientes].filter(n => n !== "verde").length;

  const hora   = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
  const pLabel = periodoLabel(periodo);

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-syne)" }}>
            {saludo}, Fernanda 👋
          </h1>
          <p className="text-sm text-gray-400 capitalize">Semáforo de control · {pLabel}</p>
        </div>
        {!!data && (alertasActivas > 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 flex-shrink-0">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            <span className="text-sm font-semibold text-rose-700">{alertasActivas} alerta{alertasActivas > 1 ? "s" : ""} activa{alertasActivas > 1 ? "s" : ""}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 flex-shrink-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-700">Todo en orden hoy</span>
          </div>
        ))}
      </div>

      <div className="mb-6 flex items-center gap-3">
        <DateFilter periodo={periodo} onChange={setPeriodo} />
        {loading && !!data && <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600 flex-shrink-0" />}
      </div>

      {!data ? <Skeleton /> : (
        <div className={loading ? "opacity-50 pointer-events-none" : ""}>
          <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SemaforoCard id="mermas" nivel={nivelMerma} titulo="Fuga por merma" valor={fmt(totalMerma)}
              detalle={`${mermaRows.length} registro${mermaRows.length !== 1 ? "s" : ""} · ${pLabel}`} icon={Flame}>
              {mermaRows.slice(0, 3).map((r: any) => {
                const nombre = (r.productos as { nombre: string } | null)?.nombre ?? "Producto";
                return (
                  <div key={r.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-gray-700">{nombre}</p>
                      <p className="text-[10px] text-gray-400 truncate">{r.motivo}</p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold text-rose-600">{fmt(r.costo_perdida ?? 0)}</span>
                  </div>
                );
              })}
            </SemaforoCard>

            <SemaforoCard id="desabasto" nivel={nivelDesabasto} titulo="Desabasto crítico"
              valor={desabasto.length === 0 ? "Sin alertas" : `${desabasto.length} producto${desabasto.length > 1 ? "s" : ""}`}
              detalle={desabasto.length === 0 ? "Todos tienen stock suficiente" : "Stock igual o por debajo del mínimo"} icon={Package}>
              {(desabasto as any[]).slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="text-xs text-gray-700 truncate max-w-[55%]">{p.nombre}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">{p.stock_actual} uds</span>
                    <span className="text-[10px] text-gray-400">mín {p.stock_minimo_critico}</span>
                  </div>
                </div>
              ))}
            </SemaforoCard>

            <SemaforoCard id="clientes" nivel={nivelClientes} titulo="Clientes sin compra +30 días"
              valor={enRiesgo.length === 0 ? "Ninguno" : `${enRiesgo.length} cliente${enRiesgo.length > 1 ? "s" : ""}`}
              detalle={enRiesgo.length === 0 ? "Todos han comprado en los últimos 30 días" : "Ordenados del más crítico al menos"} icon={Wallet}>
              {(enRiesgo as any[]).slice(0, 3).map((c) => {
                const dias = diasDesde(c.ultima_fecha_compra);
                return (
                  <div key={c.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-gray-700">{c.nombre}</p>
                      <p className="text-[10px] text-gray-400">{dias} días inactivo</p>
                    </div>
                    <span className="ml-2 flex-shrink-0 text-xs font-bold text-amber-600">{fmtK(c.ticket_promedio ?? 0)}</span>
                  </div>
                );
              })}
            </SemaforoCard>
          </div>

          <div id="meta" className="mb-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 scroll-mt-20">
            <div className="flex items-center gap-2 mb-5">
              <Target className="h-5 w-5 text-indigo-500" />
              <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>Meta Comercial del Mes</h2>
              <span className={`ml-auto rounded-full px-3 py-1 text-sm font-bold ${pctMeta >= 100 ? "bg-emerald-100 text-emerald-700" : pctMeta >= 70 ? "bg-indigo-100 text-indigo-700" : pctMeta >= 40 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                {pctMeta}%
              </span>
            </div>
            <div className="mb-3 h-5 w-full overflow-hidden rounded-full bg-gray-100">
              <div className={`h-5 rounded-full transition-all duration-700 ${pctMeta >= 100 ? "bg-emerald-500" : pctMeta >= 70 ? "bg-indigo-500" : pctMeta >= 40 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${pctMeta}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-5">
              <span className="font-semibold text-gray-800">{fmt(totalVentas)} vendidos</span>
              <span>Meta: {fmt(META_COMERCIAL)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "Total vendido",      value: fmtK(totalVentas), sub: `${numVentas} transacciones`, color: "text-indigo-600", bg: "bg-indigo-50" },
                { label: "Falta para la meta", value: fmtK(faltaMeta),   sub: pctMeta >= 100 ? "¡Meta alcanzada!" : "por alcanzar",   color: faltaMeta === 0 ? "text-emerald-600" : "text-rose-600", bg: faltaMeta === 0 ? "bg-emerald-50" : "bg-rose-50" },
                { label: "Unidades vendidas",  value: String(unidades),   sub: "en total",         color: "text-violet-600", bg: "bg-violet-50" },
                { label: "Merma acumulada",    value: fmtK(totalMerma),  sub: "costo de pérdidas", color: "text-amber-600",  bg: "bg-amber-50"  },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl p-4 ${item.bg}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{item.label}</p>
                  <p className={`text-xl font-bold ${item.color}`} style={{ fontFamily: "var(--font-syne)" }}>{item.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
            <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${pctMeta >= 100 ? "bg-emerald-50 text-emerald-700" : pctMeta >= 70 ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"}`}>
              {pctMeta >= 100 ? `🎉 ¡Meta superada! Llevas ${fmt(totalVentas)} de ${fmt(META_COMERCIAL)}.`
                : pctMeta >= 70 ? `⚡ Vas bien. Te faltan ${fmt(faltaMeta)} para completar la meta.`
                : `🎯 Impulsa las ventas. Llevas el ${pctMeta}% — faltan ${fmt(faltaMeta)}.`}
            </div>
          </div>

          <footer className="mt-4 text-center text-xs text-gray-300">
            © {new Date().getFullYear()} BI-Corp · Datos en tiempo real vía Supabase
          </footer>
        </div>
      )}
    </div>
  );
}
