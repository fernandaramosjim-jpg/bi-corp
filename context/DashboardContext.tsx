"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import { PERIODOS, getPeriodoRange } from "@/lib/date-range";

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
  refresh: () => void;
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
          <div key={i} className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-bounce"
            style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </div>
  );
}

async function fetchDashboard(periodo: string): Promise<DashboardData & { productos: any[]; clientes: any[] }> {
  const rango = getPeriodoRange(periodo);
  const params = new URLSearchParams();
  if (rango?.from) params.set("from", rango.from);
  if (rango?.to)   params.set("to",   rango.to);
  const res = await fetch(`/api/dashboard?${params}`);
  if (!res.ok) throw new Error("Error cargando datos");
  return res.json();
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [periodo, setPeriodo] = useState("mes_actual");
  const [cache, setCache]     = useState<DataCache>({});
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<any[]>([]);
  const [clientes,  setClientes]  = useState<any[]>([]);

  // Carga inicial: fetch del período actual
  useEffect(() => {
    fetchDashboard(periodo)
      .then(json => {
        const { productos: prods, clientes: clis, ...data } = json;
        setCache(prev => ({ ...prev, [periodo]: data }));
        setProductos(prods);
        setClientes(clis);
        setLoading(false);

        // Pre-carga el resto de períodos en segundo plano
        const otros = PERIODOS.map(p => p.key).filter(k => k !== periodo);
        otros.forEach(key => {
          fetchDashboard(key).then(j => {
            const { productos: _, clientes: __, ...d } = j;
            setCache(prev => ({ ...prev, [key]: d }));
          }).catch(() => {});
        });
      })
      .catch(err => {
        console.error("[BI-Corp] Error cargando datos:", err);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando cambia el período y no está en caché, lo carga
  useEffect(() => {
    if (cache[periodo] || loading) return;
    fetchDashboard(periodo)
      .then(json => {
        const { productos: _, clientes: __, ...data } = json;
        setCache(prev => ({ ...prev, [periodo]: data }));
      })
      .catch(() => {});
  }, [periodo, cache, loading]);

  const data = cache[periodo] ?? null;

  function refresh() {
    fetchDashboard(periodo).then(json => {
      const { productos: prods, clientes: clis, ...d } = json;
      setCache(prev => ({ ...prev, [periodo]: d }));
      setProductos(prods);
      setClientes(clis);
    }).catch(() => {});
  }

  return (
    <DashboardContext.Provider value={{ periodo, setPeriodo, data, loading, refresh, productos, clientes }}>
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
