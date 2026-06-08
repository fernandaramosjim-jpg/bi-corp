export const dynamic = 'force-dynamic';

import { getClientesEnRiesgo, getPareto } from "@/lib/supabase";
import { Users, PhoneCall, MessageCircle, AlertTriangle, ShieldAlert, TrendingUp } from "lucide-react";

function fmtK(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
function diasDesde(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function urgencia(dias: number) {
  if (dias > 60) return { label: "Crítico",     cls: "border-l-rose-400   bg-rose-50   text-rose-700   badge:bg-rose-100" };
  if (dias > 45) return { label: "Alto riesgo", cls: "border-l-amber-400  bg-amber-50  text-amber-700  badge:bg-amber-100" };
  return            { label: "En riesgo",    cls: "border-l-yellow-400 bg-yellow-50 text-yellow-700 badge:bg-yellow-100" };
}

const BAR = ["bg-indigo-500","bg-violet-500","bg-sky-500","bg-amber-400","bg-rose-400"];
const BAR_BG = ["bg-indigo-50","bg-violet-50","bg-sky-50","bg-amber-50","bg-rose-50"];
const TEXT = ["text-indigo-700","text-violet-700","text-sky-700","text-amber-700","text-rose-700"];

export default async function RetencionPage() {
  const [enRiesgo, pareto] = await Promise.all([
    getClientesEnRiesgo(35).catch(() => []),
    getPareto().catch(() => []),
  ]);

  const top3pct = pareto.slice(0, 3).reduce((s, c) => s + c.pct, 0);
  const riesgo = top3pct > 70 ? "alto" : top3pct > 50 ? "medio" : "bajo";
  const mesLabel = new Date().toLocaleString("es-MX", { month: "long", year: "numeric" });

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-syne)" }}>
          Retención & Churn
        </h1>
        <p className="text-sm text-gray-400">Detecta clientes que se están enfriando · {mesLabel}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* KPI 4: Antichurn */}
        <section className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>
                Clientes en riesgo de abandono
              </h2>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              +35 días sin compra
            </span>
          </div>

          {enRiesgo.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center px-6">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-gray-700">¡Sin clientes en riesgo!</p>
              <p className="text-xs text-gray-400 mt-1">Todos han comprado en los últimos 35 días.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {enRiesgo.map((c) => {
                const dias = c.ultima_fecha_compra ? diasDesde(c.ultima_fecha_compra) : 0;
                const u = urgencia(dias);
                const borderColor = dias > 60 ? "border-l-rose-400" : dias > 45 ? "border-l-amber-400" : "border-l-yellow-400";
                const textColor   = dias > 60 ? "text-rose-700"   : dias > 45 ? "text-amber-700"   : "text-yellow-700";
                const badgeColor  = dias > 60 ? "bg-rose-100 text-rose-700" : dias > 45 ? "bg-amber-100 text-amber-700" : "bg-yellow-100 text-yellow-700";
                const rowBg       = dias > 60 ? "bg-rose-50/40"   : dias > 45 ? "bg-amber-50/40"   : "bg-yellow-50/30";
                return (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between gap-3 border-l-4 px-5 py-4 ${borderColor} ${rowBg}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{c.nombre}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}>
                          {u.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {c.contacto ?? "—"} · Ticket prom. {fmtK(c.ticket_promedio ?? 0)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`text-lg font-bold ${textColor}`} style={{ fontFamily: "var(--font-syne)" }}>
                        {dias}d
                      </span>
                      <div className="flex gap-1">
                        <button
                          title="Llamar"
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title="WhatsApp"
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* KPI 5: Pareto */}
        <section className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-gray-800" style={{ fontFamily: "var(--font-syne)" }}>
                Concentración de ingresos
              </h2>
            </div>
            <span className="text-xs text-gray-400">Regla de Pareto</span>
          </div>

          <div className="flex-1 px-6 py-5 flex flex-col gap-5">
            {/* Alerta de concentración */}
            <div className={`flex items-start gap-3 rounded-xl border p-4 ${
              riesgo === "alto"   ? "bg-rose-50 border-rose-100"
              : riesgo === "medio" ? "bg-amber-50 border-amber-100"
              :                      "bg-emerald-50 border-emerald-100"
            }`}>
              <ShieldAlert className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                riesgo === "alto" ? "text-rose-500" : riesgo === "medio" ? "text-amber-500" : "text-emerald-500"
              }`} />
              <div>
                <p className={`text-sm font-semibold ${
                  riesgo === "alto" ? "text-rose-700" : riesgo === "medio" ? "text-amber-700" : "text-emerald-700"
                }`}>
                  {riesgo === "alto"
                    ? `⚠️ Riesgo alto — top 3 clientes representan el ${top3pct.toFixed(0)}% de tus ventas`
                    : riesgo === "medio"
                      ? `Riesgo moderado — ${top3pct.toFixed(0)}% concentrado en 3 clientes`
                      : `Cartera bien diversificada — top 3 representa ${top3pct.toFixed(0)}%`}
                </p>
                <p className={`text-xs mt-0.5 ${
                  riesgo === "alto" ? "text-rose-500" : riesgo === "medio" ? "text-amber-500" : "text-emerald-600"
                }`}>
                  {riesgo === "alto" ? "Perder un cliente clave golpearía fuertemente el negocio." : "Sigue diversificando tu base de clientes."}
                </p>
              </div>
            </div>

            {pareto.length === 0 ? (
              <p className="text-center text-sm text-gray-300 py-8">Sin datos de ventas históricos.</p>
            ) : (
              <div className="space-y-4">
                {pareto.map((c) => {
                  const i = c.rank - 1;
                  return (
                    <div key={c.rank} className="flex items-center gap-4">
                      <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${BAR[i] ?? "bg-gray-400"}`}>
                        {c.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-gray-800 truncate pr-2">{c.nombre}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs font-bold ${TEXT[i] ?? "text-gray-600"}`}>{c.pct.toFixed(1)}%</span>
                            <span className="text-xs text-gray-400">{fmtK(c.total)}</span>
                          </div>
                        </div>
                        <div className={`h-2.5 w-full rounded-full ${BAR_BG[i] ?? "bg-gray-100"}`}>
                          <div className={`h-2.5 rounded-full ${BAR[i] ?? "bg-gray-400"}`} style={{ width: `${Math.min(c.pct, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {pareto.length > 0 && (
              <div className="mt-auto rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">
                  Top 3 clientes → <strong className={riesgo === "alto" ? "text-rose-600" : "text-indigo-600"}>{top3pct.toFixed(1)}%</strong> del total histórico de ventas.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
