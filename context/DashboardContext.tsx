"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import { PERIODOS, getPeriodoRange } from "@/lib/date-range";
import {
  getMermas, getVentasMes, getDesabastoCritico, getClientesEnRiesgo,
  getTopProductosMes, getTopClientesMes, getMargenProductos,
  getVentasPorDia, getVentasPorHora, getPareto,
  getProductosBasic, getClientesBasic,
  getVentasPorFecha, getRankingVendedores,
} from "@/lib/supabase";

export type DashboardData = {
  mermas: { rows: any[]; totalCosto: number };
  ventasMes: { total: number; count: number; unidades: number };
  desabasto: any[];
  enRiesgo30: any[];
  enRiesgo35: any[];
  topProductos: any[];
  topClientes: any[];
  margenProductos: any[];
  ventasPorDia: any[];
  ventasHora: any[];
  pareto: any[];
  ventasFecha: { fecha: string; total: number }[];
  rankingVendedores: { nombre: string; meta: number; total: number; count: number; rank: number }[];
};

type DataCache = Record<string, DashboardData>;

type Ctx = {
  periodo: string;
  setPeriodo: (p: string) => void;
  data: DashboardData | null;
  loading: boolean;
  productos: { id: number; nombre: string; costo_proveedor: number; precio_venta: number }[];
  clientes: { id: number; nombre: string }[];
};

const DashboardContext = createContext<Ctx | null>(null);

function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg mb-6">
        <BarChart3 className="h-8 w-8 text-white" strokeWidth={2.5} />
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily: "var(--font-syne)" }}>
        BI<span className="text-indigo-600">-Corp</span>
      </p>
      <p className="text-sm text-gray-400 mb-10">Preparando tu dashboard…</p>
      <div className="flex gap-2.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-bounce"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [periodo, setPeriodo] = useState("mes_actual");
  const [cache, setCache] = useState<DataCache>({});
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);

  useEffect(() => {
    const periodoKeys = PERIODOS.map(p => p.key);

    const sharedPromise = Promise.all([
      getDesabastoCritico().catch(() => []),
      getClientesEnRiesgo(30).catch(() => []),
      getClientesEnRiesgo(35).catch(() => []),
      getProductosBasic().catch(() => []),
      getClientesBasic().catch(() => []),
    ]);

    const periodosPromise = Promise.all(
      periodoKeys.map(key => {
        const rango = getPeriodoRange(key);
        return Promise.all([
          getMermas(rango).catch(() => ({ rows: [], totalCosto: 0 })),
          getVentasMes(rango).catch(() => ({ total: 0, count: 0, unidades: 0 })),
          getTopProductosMes(rango).catch(() => []),
          getTopClientesMes(rango).catch(() => []),
          getMargenProductos(rango).catch(() => []),
          getVentasPorDia(rango).catch(() => []),
          getVentasPorHora(rango).catch(() => []),
          getPareto(rango).catch(() => []),
          getVentasPorFecha(rango).catch(() => []),
          getRankingVendedores(rango).catch(() => []),
        ]);
      })
    );

    Promise.all([sharedPromise, periodosPromise])
      .then(([
        [desabasto, enRiesgo30, enRiesgo35, prods, clis],
        periodResults,
      ]) => {
        const newCache: DataCache = {};
        periodoKeys.forEach((key, i) => {
          const [
            mermas, ventasMes, topProductos, topClientes, margenProductos,
            ventasPorDia, ventasHora, pareto, ventasFecha, rankingVendedores,
          ] = periodResults[i];
          newCache[key] = {
            mermas, ventasMes, desabasto, enRiesgo30, enRiesgo35,
            topProductos, topClientes, margenProductos, ventasPorDia, ventasHora,
            pareto, ventasFecha, rankingVendedores,
          };
        });
        setCache(newCache);
        setProductos(prods);
        setClientes(clis);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[BI-Corp] Error cargando datos:", err);
        setLoading(false);
      });
  }, []);

  const data = cache[periodo] ?? null;

  return (
    <DashboardContext.Provider value={{ periodo, setPeriodo, data, loading, productos, clientes }}>
      {loading && <LoadingScreen />}
      <div className={loading ? "invisible" : undefined}>
        {children}
      </div>
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
