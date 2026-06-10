"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { getPeriodoRange } from "@/lib/date-range";
import {
  getMermas, getVentasMes, getDesabastoCritico, getClientesEnRiesgo,
  getTopProductosMes, getTopClientesMes, getMargenProductos,
  getVentasPorDia, getVentasPorHora, getPareto,
  getProductosBasic, getClientesBasic,
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
};

type Ctx = {
  periodo: string;
  setPeriodo: (p: string) => void;
  data: DashboardData | null;
  loading: boolean;
  productos: { id: number; nombre: string; costo_proveedor: number; precio_venta: number }[];
  clientes: { id: number; nombre: string }[];
};

const DashboardContext = createContext<Ctx | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [periodo, setPeriodo] = useState("mes_actual");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);

  // Catálogos: se cargan una sola vez al montar (no dependen de rango)
  useEffect(() => {
    Promise.all([
      getProductosBasic().catch(() => []),
      getClientesBasic().catch(() => []),
    ]).then(([prods, clis]) => {
      setProductos(prods);
      setClientes(clis);
    });
  }, []);

  // KPIs: se recargan al cambiar de periodo
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const rango = getPeriodoRange(periodo);
    Promise.all([
      getMermas(rango).catch(() => ({ rows: [], totalCosto: 0 })),
      getVentasMes(rango).catch(() => ({ total: 0, count: 0, unidades: 0 })),
      getDesabastoCritico().catch(() => []),
      getClientesEnRiesgo(30).catch(() => []),
      getClientesEnRiesgo(35).catch(() => []),
      getTopProductosMes(rango).catch(() => []),
      getTopClientesMes(rango).catch(() => []),
      getMargenProductos(rango).catch(() => []),
      getVentasPorDia(rango).catch(() => []),
      getVentasPorHora(rango).catch(() => []),
      getPareto(rango).catch(() => []),
    ]).then(([mermas, ventasMes, desabasto, enRiesgo30, enRiesgo35, topProductos, topClientes, margenProductos, ventasPorDia, ventasHora, pareto]) => {
      if (cancelled) return;
      setData({ mermas, ventasMes, desabasto, enRiesgo30, enRiesgo35, topProductos, topClientes, margenProductos, ventasPorDia, ventasHora, pareto });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [periodo]);

  return (
    <DashboardContext.Provider value={{ periodo, setPeriodo, data, loading, productos, clientes }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
