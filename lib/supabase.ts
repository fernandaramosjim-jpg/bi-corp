import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Tipos exactos ───────────────────────────────────────────────────────────

export type Venta = {
  id: number;
  cliente_id: number;
  producto_id: number;
  fecha_venta: string;   // "YYYY-MM-DDTHH:MM:SS"
  cantidad: number;
  monto_total: number;
};

export type Cliente = {
  id: number;
  nombre: string;
  contacto: string;
  ultima_fecha_compra: string; // "YYYY-MM-DD"
  ticket_promedio: number;
};

export type Producto = {
  id: number;
  nombre: string;
  stock_actual: number;
  stock_minimo_critico: number;
  costo_proveedor: number;
  precio_venta: number;
};

// ─── Rango de fechas opcional ────────────────────────────────────────────────

export type Rango = { from?: string; to?: string };

function rangoMes() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const ultimo = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    primer: `${y}-${m}-01T00:00:00`,
    ultimo: `${y}-${m}-${String(ultimo).padStart(2, "0")}T23:59:59`,
  };
}

function resolveRango(r?: Rango) {
  if (r?.from && r?.to) return { primer: r.from, ultimo: r.to };
  return rangoMes();
}

// ─── Queries ────────────────────────────────────────────────────────────────

/** Total de ventas + conteo + unidades en el rango dado (default: mes actual) */
export async function getVentasMes(rango?: Rango) {
  const { primer, ultimo } = resolveRango(rango);
  const { data, error } = await supabase
    .from("ventas")
    .select("monto_total, cantidad")
    .gte("fecha_venta", primer)
    .lte("fecha_venta", ultimo);
  if (error) throw error;
  const rows = data ?? [];
  return {
    total: rows.reduce((s, v) => s + (v.monto_total ?? 0), 0),
    count: rows.length,
    unidades: rows.reduce((s, v) => s + (v.cantidad ?? 0), 0),
  };
}

/** Mermas con JOIN a productos. Si se pasa rango, filtra por fecha_merma. */
export async function getMermas(rango?: Rango) {
  const from = rango?.from;
  const to   = rango?.to;
  const q = supabase
    .from("mermas")
    .select("id, producto_id, fecha_merma, cantidad_perdida, motivo, costo_perdida, productos(nombre)")
    .order("fecha_merma", { ascending: false });

  const { data, error } = await (from && to ? q.gte("fecha_merma", from).lte("fecha_merma", to) : q);
  if (error) throw error;
  const rows = data ?? [];
  return { rows, totalCosto: rows.reduce((s, r) => s + (r.costo_perdida ?? 0), 0) };
}

/**
 * Productos con desabasto crítico: stock_actual <= stock_minimo_critico.
 * No depende de fecha — siempre refleja el estado actual.
 */
export async function getDesabastoCritico() {
  const { data, error } = await supabase
    .from("productos")
    .select("id, nombre, stock_actual, stock_minimo_critico");
  if (error) throw error;

  return (data ?? [])
    .filter((p) => p.stock_actual <= p.stock_minimo_critico)
    .sort(
      (a, b) =>
        a.stock_actual / a.stock_minimo_critico -
        b.stock_actual / b.stock_minimo_critico
    );
}

/** Clientes que no han comprado en más de X días (relativo a hoy) */
export async function getClientesEnRiesgo(dias = 30) {
  const fecha = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .lt("ultima_fecha_compra", fecha)
    .order("ultima_fecha_compra", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Cliente[];
}

/** Clientes sin compra en +60 días */
export async function getCarteraVencida() {
  return getClientesEnRiesgo(60);
}

/** Top-5 clientes por volumen de ventas (default: histórico; opcional: rango) */
export async function getPareto(rango?: Rango) {
  const from = rango?.from;
  const to   = rango?.to;
  const q = supabase
    .from("ventas")
    .select("monto_total, cliente_id, clientes(nombre)");

  const { data, error } = await (from && to ? q.gte("fecha_venta", from).lte("fecha_venta", to) : q);
  if (error) throw error;

  const map = new Map<number, { nombre: string; total: number }>();
  for (const v of data ?? []) {
    const nombre =
      (v.clientes as unknown as { nombre: string } | null)?.nombre ?? "Sin nombre";
    const prev = map.get(v.cliente_id) ?? { nombre, total: 0 };
    map.set(v.cliente_id, { nombre, total: prev.total + (v.monto_total ?? 0) });
  }
  const sorted = Array.from(map.values()).sort((a, b) => b.total - a.total);
  const grand = sorted.reduce((s, x) => s + x.total, 0);
  return sorted.slice(0, 5).map((c, i) => ({
    ...c,
    pct: grand > 0 ? (c.total / grand) * 100 : 0,
    rank: i + 1,
  }));
}

/** Top productos por monto vendido en el rango dado (default: mes actual) */
export async function getTopProductosMes(rango?: Rango) {
  const { primer, ultimo } = resolveRango(rango);
  const { data, error } = await supabase
    .from("ventas")
    .select("producto_id, monto_total, cantidad, productos(nombre)")
    .gte("fecha_venta", primer)
    .lte("fecha_venta", ultimo);
  if (error) throw error;

  const map = new Map<number, { nombre: string; total: number; unidades: number }>();
  for (const v of data ?? []) {
    const nombre =
      (v.productos as unknown as { nombre: string } | null)?.nombre ?? "Desconocido";
    const prev = map.get(v.producto_id) ?? { nombre, total: 0, unidades: 0 };
    map.set(v.producto_id, {
      nombre,
      total: prev.total + (v.monto_total ?? 0),
      unidades: prev.unidades + (v.cantidad ?? 0),
    });
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

/** Top clientes por monto comprado en el rango dado (default: mes actual) */
export async function getTopClientesMes(rango?: Rango) {
  const { primer, ultimo } = resolveRango(rango);
  const { data, error } = await supabase
    .from("ventas")
    .select("cliente_id, monto_total, clientes(nombre)")
    .gte("fecha_venta", primer)
    .lte("fecha_venta", ultimo);
  if (error) throw error;

  const map = new Map<number, { nombre: string; total: number }>();
  for (const v of data ?? []) {
    const nombre =
      (v.clientes as unknown as { nombre: string } | null)?.nombre ?? "Desconocido";
    const prev = map.get(v.cliente_id) ?? { nombre, total: 0 };
    map.set(v.cliente_id, { nombre, total: prev.total + (v.monto_total ?? 0) });
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

/** Ventas agrupadas por día de semana en el rango dado (default: últimos 90 días) */
export async function getVentasPorDia(rango?: Rango) {
  const defaultFrom = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const from = rango?.from ?? defaultFrom;
  const to   = rango?.to   ?? new Date().toISOString();

  const { data, error } = await supabase
    .from("ventas")
    .select("monto_total, cantidad, fecha_venta")
    .gte("fecha_venta", from)
    .lte("fecha_venta", to);
  if (error) throw error;

  const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const map = new Map<number, { total: number; count: number; unidades: number }>();
  for (const v of data ?? []) {
    const dow = new Date(v.fecha_venta).getDay();
    const prev = map.get(dow) ?? { total: 0, count: 0, unidades: 0 };
    map.set(dow, {
      total:    prev.total    + (v.monto_total ?? 0),
      count:    prev.count    + 1,
      unidades: prev.unidades + (v.cantidad ?? 0),
    });
  }
  return DIAS.map((dia, d) => ({
    dia,
    total:    map.get(d)?.total    ?? 0,
    count:    map.get(d)?.count    ?? 0,
    unidades: map.get(d)?.unidades ?? 0,
    promedio: (map.get(d)?.count ?? 0) > 0 ? (map.get(d)!.total / map.get(d)!.count) : 0,
  }));
}

/** Ventas agrupadas por hora del día (horas 6-22) en el rango dado (default: últimos 90 días) */
export async function getVentasPorHora(rango?: Rango) {
  const defaultFrom = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const from = rango?.from ?? defaultFrom;
  const to   = rango?.to   ?? new Date().toISOString();

  const { data, error } = await supabase
    .from("ventas")
    .select("monto_total, fecha_venta")
    .gte("fecha_venta", from)
    .lte("fecha_venta", to);
  if (error) throw error;

  const map = new Map<number, { total: number; count: number }>();
  for (const v of data ?? []) {
    const h = new Date(v.fecha_venta).getHours();
    const prev = map.get(h) ?? { total: 0, count: 0 };
    map.set(h, { total: prev.total + (v.monto_total ?? 0), count: prev.count + 1 });
  }
  return Array.from({ length: 17 }, (_, i) => i + 6).map((h) => ({
    hora:  h,
    label: h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`,
    total: map.get(h)?.total ?? 0,
    count: map.get(h)?.count ?? 0,
  }));
}

/**
 * Margen neto real por producto.
 * Si se pasa rango, filtra las ventas a ese periodo para calcular ganancia y unidades reales.
 */
export async function getMargenProductos(rango?: Rango) {
  const from = rango?.from;
  const to   = rango?.to;
  const ventasQ = supabase.from("ventas").select("producto_id, monto_total, cantidad");

  const [{ data: prods, error: e1 }, { data: ventas, error: e2 }] = await Promise.all([
    supabase.from("productos").select("*"),
    from && to ? ventasQ.gte("fecha_venta", from).lte("fecha_venta", to) : ventasQ,
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const vm = new Map<number, { revenue: number; unidades: number }>();
  for (const v of ventas ?? []) {
    const prev = vm.get(v.producto_id) ?? { revenue: 0, unidades: 0 };
    vm.set(v.producto_id, {
      revenue:  prev.revenue  + (v.monto_total ?? 0),
      unidades: prev.unidades + (v.cantidad    ?? 0),
    });
  }

  return (prods ?? [])
    .map((p) => {
      const vd = vm.get(p.id) ?? { revenue: 0, unidades: 0 };
      const margenPct =
        p.precio_venta > 0
          ? ((p.precio_venta - p.costo_proveedor) / p.precio_venta) * 100
          : 0;
      const gananciaNeta = (p.precio_venta - p.costo_proveedor) * vd.unidades;
      return { ...p, ...vd, margenPct, gananciaNeta };
    })
    .sort((a, b) => b.margenPct - a.margenPct);
}

/** Listas para dropdowns del formulario de carga */
export async function getClientesBasic() {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombre")
    .order("nombre");
  if (error) throw error;
  return (data ?? []) as { id: number; nombre: string }[];
}

export async function getProductosBasic() {
  const { data, error } = await supabase
    .from("productos")
    .select("id, nombre, precio_venta, costo_proveedor")
    .order("nombre");
  if (error) throw error;
  return (data ?? []) as {
    id: number;
    nombre: string;
    precio_venta: number;
    costo_proveedor: number;
  }[];
}
