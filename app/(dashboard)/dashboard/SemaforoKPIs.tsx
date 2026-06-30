"use client";

import React, { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { periodoLabel } from "@/lib/date-range";
import { DateFilter } from "@/components/DateFilter";
import { useDashboard } from "@/context/DashboardContext";
import Link from "next/link";
import {
  AlertTriangle, CheckCircle2, Package, Wallet, Flame, TrendingUp,
} from "lucide-react";

const META_COMERCIAL = 500_000;

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
function diasRestantesMes() {
  const now  = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return last - now.getDate();
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
          <Icon className={`h-4 w-4 ${s.val}`} />
        </div>
      </div>
      <p className={`text-4xl font-bold tracking-tight mb-1 ${s.val}`} style={{ fontFamily: "var(--font-syne)" }}>{valor}</p>
      <p className="text-xs text-gray-400 mb-4">{detalle}</p>
      {children && <div className="mt-auto space-y-2">{children}</div>}
    </div>
  );
}

function MetaHero({ totalVentas, pctMeta, faltaMeta, numVentas }: {
  totalVentas: number; pctMeta: number; faltaMeta: number; numVentas: number;
}) {
  const dias = diasRestantesMes();
  const color =
    pctMeta >= 100 ? { bar: "from-emerald-400 to-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700" }
    : pctMeta >= 70  ? { bar: "from-indigo-400 to-indigo-600",  text: "text-indigo-600",  bg: "bg-indigo-50",  badge: "bg-indigo-100 text-indigo-700" }
    : pctMeta >= 40  ? { bar: "from-amber-400 to-amber-500",    text: "text-amber-600",   bg: "bg-amber-50",   badge: "bg-amber-100 text-amber-700" }
    :                  { bar: "from-rose-400 to-rose-500",       text: "text-rose-600",    bg: "bg-rose-50",    badge: "bg-rose-100 text-rose-700" };

  const mensaje =
    pctMeta >= 100 ? `🎉 ¡Meta superada! ${numVentas} transacciones este mes.`
    : pctMeta >= 70 ? `⚡ Buen ritmo — te faltan ${fmt(faltaMeta)} para completar la meta.`
    : pctMeta >= 40 ? `🎯 Impulsa las ventas. ${dias > 0 ? `${dias} días para cerrar el mes.` : "Último día del mes."}`
    :                 `🚨 Ritmo bajo. Faltan ${fmt(faltaMeta)} — ${dias > 0 ? `${dias} días disponibles.` : "último día."}`;

  return (
    <div className="mb-6 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
      <div className="px-6 pt-6 pb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
            Termómetro Comercial · Meta del Mes
          </p>
          <div className="flex items-end gap-3">
            <span className={`text-6xl font-black tracking-tight leading-none ${color.text}`}
              style={{ fontFamily: "var(--font-syne)" }}>
              {pctMeta}%
            </span>
            <div className="pb-1">
              <p className="text-sm font-bold text-gray-800">{fmt(totalVentas)}</p>
              <p className="text-xs text-gray-400">de {fmt(META_COMERCIAL)}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 sm:flex-col sm:items-end">
          <div className={`rounded-full px-3 py-1 text-xs font-bold ${color.badge}`}>
            {numVentas} transacciones
          </div>
          {dias > 0 && (
            <div className="rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600">
              {dias} días restantes
            </div>
          )}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="px-6 pb-2">
        <div className="h-4 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-4 rounded-full bg-gradient-to-r transition-all duration-700 ${color.bar}`}
            style={{ width: `${Math.min(pctMeta, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
          <span>$0</span>
          <span>{fmt(META_COMERCIAL / 2)}</span>
          <span>{fmt(META_COMERCIAL)}</span>
        </div>
      </div>

      {/* Mensaje de estado */}
      <div className={`mx-4 mb-4 mt-1 rounded-xl px-4 py-2.5 text-sm font-medium ${color.bg} ${color.text}`}>
        {mensaje}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const date = new Date(label + "T12:00:00");
  const dLabel = date.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="text-gray-400 mb-0.5 capitalize">{dLabel}</p>
      <p className="font-bold text-indigo-600">{fmt(payload[0].value)}</p>
    </div>
  );
}

function GraficaEvolucion({ datos }: { datos: { fecha: string; total: number }[] }) {
  if (!datos.length) return null;
  const maxVal = Math.max(...datos.map(d => d.total), 1);
  const totalMes = datos.reduce((s, d) => s + d.total, 0);

  return (
    <div className="mb-6 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Evolución de Ventas</p>
            <p className="text-[10px] text-gray-400">Por día en el período seleccionado</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-indigo-600">{fmtK(totalMes)}</p>
          <p className="text-[10px] text-gray-400">total del período</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={datos} margin={{ top: 5, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="ventasGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => {
              const d = new Date(v + "T12:00:00");
              return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
            }}
            interval={Math.floor(datos.length / 6)}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => fmtK(v)}
            domain={[0, maxVal * 1.15]}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#6366f1"
            strokeWidth={2.5}
            fill="url(#ventasGrad)"
            dot={false}
            activeDot={{ r: 5, fill: "#6366f1", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-52 rounded-2xl bg-gray-100" />
      <div className="h-64 rounded-2xl bg-gray-100" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map(i => <div key={i} className="h-48 rounded-2xl bg-gray-100" />)}
      </div>
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
  const enRiesgo35  = data?.enRiesgo35 ?? [];
  const ventasFecha = data?.ventasFecha ?? [];

  const pctMeta   = Math.min(Math.round((totalVentas / META_COMERCIAL) * 100), 999);
  const faltaMeta = Math.max(META_COMERCIAL - totalVentas, 0);

  const nivelMerma:     Nivel = totalMerma === 0 ? "verde" : totalMerma < 3_000 ? "amarillo" : "rojo";
  const nivelDesabasto: Nivel = desabasto.length === 0 ? "verde" : desabasto.length <= 2 ? "amarillo" : "rojo";
  const nivelClientes:  Nivel = enRiesgo.length === 0 ? "verde" : enRiesgo.length <= 2 ? "amarillo" : "rojo";
  const alertasActivas  = [nivelMerma, nivelDesabasto, nivelClientes].filter(n => n !== "verde").length;

  const [saludo, setSaludo] = useState("Hola");
  useEffect(() => {
    const hora = new Date().getHours();
    setSaludo(hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches");
  }, []);
  const pLabel = periodoLabel(periodo);

  return (
    <div className="px-6 py-8 lg:px-10">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-syne)" }}>
            {saludo}, Fernanda 👋
          </h1>
          <p className="text-sm text-gray-400 capitalize">Semáforo de control · {pLabel}</p>
        </div>
        {!!data && (alertasActivas > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-0.5 sm:justify-end [&::-webkit-scrollbar]:hidden">
            {nivelMerma !== "verde" && (
              <Link href="/dashboard#mermas"
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 ${
                  nivelMerma === "rojo"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}>
                <Flame className="h-3.5 w-3.5" />
                Mermas: {fmtK(totalMerma)}
              </Link>
            )}
            {nivelDesabasto !== "verde" && (
              <Link href="/dashboard#desabasto"
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 ${
                  nivelDesabasto === "rojo"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}>
                <Package className="h-3.5 w-3.5" />
                {desabasto.length} sin stock
              </Link>
            )}
            {nivelClientes !== "verde" && (
              <Link href="/retencion#churn"
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 ${
                  nivelClientes === "rojo"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}>
                <Wallet className="h-3.5 w-3.5" />
                {enRiesgo35.length} cliente{enRiesgo35.length > 1 ? "s" : ""} inactivo{enRiesgo35.length > 1 ? "s" : ""}
              </Link>
            )}
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
        {loading && !!data && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600 flex-shrink-0" />
        )}
      </div>

      {!data ? <Skeleton /> : (
        <div className={loading ? "opacity-50 pointer-events-none" : ""}>

          {/* Hero: Termómetro de Meta */}
          <MetaHero
            totalVentas={totalVentas}
            pctMeta={pctMeta}
            faltaMeta={faltaMeta}
            numVentas={numVentas}
          />

          {/* Gráfica de evolución */}
          <GraficaEvolucion datos={ventasFecha} />

          {/* KPI Cards */}
          <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SemaforoCard id="mermas" nivel={nivelMerma} titulo="Fuga por merma"
              valor={fmt(totalMerma)}
              detalle={`${mermaRows.length} registro${mermaRows.length !== 1 ? "s" : ""} · ${pLabel}`}
              icon={Flame}>
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
              detalle={desabasto.length === 0 ? "Todos tienen stock suficiente" : "Stock igual o por debajo del mínimo"}
              icon={Package}>
              {(desabasto as any[]).slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="text-xs text-gray-700 truncate max-w-[55%]">{p.nombre}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">{p.stock_actual} uds</span>
                    <span className="text-[10px] text-gray-400">mín {p.stock_minimo_critico}</span>
                  </div>
                </div>
              ))}
              {desabasto.length > 5 && (
                <p className="text-[10px] text-gray-400 pt-1">+ {desabasto.length - 5} productos más con stock bajo</p>
              )}
            </SemaforoCard>

            <SemaforoCard id="clientes" nivel={nivelClientes} titulo="Clientes sin compra +30 días"
              valor={enRiesgo.length === 0 ? "Ninguno" : `${enRiesgo.length} cliente${enRiesgo.length > 1 ? "s" : ""}`}
              detalle={enRiesgo.length === 0 ? "Todos han comprado en los últimos 30 días" : "Ordenados del más crítico al menos"}
              icon={Wallet}>
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

          {/* Mini stats row */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Total vendido",     value: fmtK(totalVentas), sub: `${numVentas} transacciones`, color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "Falta para meta",   value: fmtK(faltaMeta),   sub: pctMeta >= 100 ? "¡Meta alcanzada!" : "por alcanzar",  color: faltaMeta === 0 ? "text-emerald-600" : "text-rose-600", bg: faltaMeta === 0 ? "bg-emerald-50" : "bg-rose-50" },
              { label: "Unidades vendidas", value: String(unidades),  sub: "en total",           color: "text-violet-600", bg: "bg-violet-50" },
              { label: "Merma acumulada",   value: fmtK(totalMerma), sub: "costo de pérdidas", color: "text-amber-600",  bg: "bg-amber-50"  },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl p-4 ${item.bg}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{item.label}</p>
                <p className={`text-xl font-bold ${item.color}`} style={{ fontFamily: "var(--font-syne)" }}>{item.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>

          <footer className="mt-4 text-center text-xs text-gray-300">
            © <span suppressHydrationWarning>{new Date().getFullYear()}</span> BI-Corp · Datos en tiempo real vía Supabase
          </footer>
        </div>
      )}
    </div>
  );
}
