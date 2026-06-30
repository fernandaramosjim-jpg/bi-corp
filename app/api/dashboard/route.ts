import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const META_MES = 500_000;

function resolveRango(from?: string | null, to?: string | null) {
  if (from && to) return { primer: from, ultimo: to };
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const ultimo = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    primer: `${y}-${m}-01T00:00:00`,
    ultimo: `${y}-${m}-${String(ultimo).padStart(2, "0")}T23:59:59`,
  };
}

export async function GET(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to   = searchParams.get("to");
  const { primer, ultimo } = resolveRango(from, to);

  const defaultFrom90 = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const hace30 = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const hace35 = new Date(Date.now() - 35 * 86_400_000).toISOString().slice(0, 10);

  const [
    { data: mermasRows },
    { data: ventasRows },
    { data: productosAll },
    { data: clientesRiesgo30 },
    { data: clientesRiesgo35 },
    { data: ventasHist },
    { data: vendedoresRows },
    { data: productosBasic },
    { data: clientesBasic },
    { data: vendedoresBasic },
  ] = await Promise.all([
    sb.from("mermas").select("id,producto_id,fecha_merma,cantidad_perdida,motivo,costo_perdida,productos(nombre)").order("fecha_merma", { ascending: false }),
    sb.from("ventas").select("monto_total,cantidad,cliente_id,producto_id,fecha_venta,vendedor_id,clientes(nombre),productos(nombre)").gte("fecha_venta", primer).lte("fecha_venta", ultimo),
    sb.from("productos").select("*"),
    sb.from("clientes").select("*").lt("ultima_fecha_compra", hace30).order("ultima_fecha_compra", { ascending: true }),
    sb.from("clientes").select("*").lt("ultima_fecha_compra", hace35).order("ultima_fecha_compra", { ascending: true }),
    sb.from("ventas").select("monto_total,cantidad,cliente_id,producto_id,fecha_venta").gte("fecha_venta", defaultFrom90),
    sb.from("ventas").select("monto_total,vendedor_id,vendedores(nombre,meta_mensual)").gte("fecha_venta", primer).lte("fecha_venta", ultimo).not("vendedor_id", "is", null),
    sb.from("productos").select("id,nombre,precio_venta,costo_proveedor").order("nombre"),
    sb.from("clientes").select("id,nombre").order("nombre"),
    sb.from("vendedores").select("id,nombre").order("nombre"),
  ]);

  // Mermas
  const mermasData = mermasRows ?? [];
  const mermasFiltradas = from && to
    ? mermasData.filter(m => m.fecha_merma >= from && m.fecha_merma <= to)
    : mermasData;
  const totalMerma = mermasFiltradas.reduce((s: number, m: any) => s + (m.costo_perdida ?? 0), 0);

  // Ventas mes
  const ventasList = ventasRows ?? [];
  const ventasMes = {
    total: ventasList.reduce((s: number, v: any) => s + (v.monto_total ?? 0), 0),
    count: ventasList.length,
    unidades: ventasList.reduce((s: number, v: any) => s + (v.cantidad ?? 0), 0),
  };

  // Desabasto
  const desabasto = (productosAll ?? [])
    .filter((p: any) => p.stock_actual <= p.stock_minimo_critico)
    .sort((a: any, b: any) => a.stock_actual / a.stock_minimo_critico - b.stock_actual / b.stock_minimo_critico);

  // Top productos
  const prodMap = new Map<number, { nombre: string; total: number; unidades: number }>();
  for (const v of ventasList) {
    const nombre = (v.productos as any)?.nombre ?? "Desconocido";
    const prev = prodMap.get(v.producto_id) ?? { nombre, total: 0, unidades: 0 };
    prodMap.set(v.producto_id, { nombre, total: prev.total + (v.monto_total ?? 0), unidades: prev.unidades + (v.cantidad ?? 0) });
  }
  const topProductos = Array.from(prodMap.values()).sort((a, b) => b.total - a.total);

  // Top clientes mes
  const cliMap = new Map<number, { nombre: string; total: number }>();
  for (const v of ventasList) {
    const nombre = (v.clientes as any)?.nombre ?? "Desconocido";
    const prev = cliMap.get(v.cliente_id) ?? { nombre, total: 0 };
    cliMap.set(v.cliente_id, { nombre, total: prev.total + (v.monto_total ?? 0) });
  }
  const topClientes = Array.from(cliMap.values()).sort((a, b) => b.total - a.total);

  // Pareto (top-5 histórico)
  const paretoMap = new Map<number, { nombre: string; total: number }>();
  for (const v of ventasHist ?? []) {
    const vc = ventasList.find((x: any) => x.cliente_id === v.cliente_id);
    const nombre = (vc?.clientes as any)?.nombre ?? `Cliente ${v.cliente_id}`;
    const prev = paretoMap.get(v.cliente_id) ?? { nombre, total: 0 };
    paretoMap.set(v.cliente_id, { nombre, total: prev.total + (v.monto_total ?? 0) });
  }
  const paretoSorted = Array.from(paretoMap.values()).sort((a, b) => b.total - a.total);
  const paretoGrand = paretoSorted.reduce((s, x) => s + x.total, 0);
  const pareto = paretoSorted.slice(0, 5).map((c, i) => ({ ...c, pct: paretoGrand > 0 ? (c.total / paretoGrand) * 100 : 0, rank: i + 1 }));

  // Margen
  const vm = new Map<number, { revenue: number; unidades: number }>();
  for (const v of ventasList) {
    const prev = vm.get(v.producto_id) ?? { revenue: 0, unidades: 0 };
    vm.set(v.producto_id, { revenue: prev.revenue + (v.monto_total ?? 0), unidades: prev.unidades + (v.cantidad ?? 0) });
  }
  const margenProductos = (productosAll ?? []).map((p: any) => {
    const vd = vm.get(p.id) ?? { revenue: 0, unidades: 0 };
    const margenPct = p.precio_venta > 0 ? ((p.precio_venta - p.costo_proveedor) / p.precio_venta) * 100 : 0;
    return { ...p, ...vd, margenPct, gananciaNeta: (p.precio_venta - p.costo_proveedor) * vd.unidades };
  }).sort((a: any, b: any) => b.margenPct - a.margenPct);

  // Ventas por día
  const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const dowMap = new Map<number, { total: number; count: number; unidades: number }>();
  for (const v of ventasHist ?? []) {
    const dow = new Date(v.fecha_venta).getDay();
    const prev = dowMap.get(dow) ?? { total: 0, count: 0, unidades: 0 };
    dowMap.set(dow, { total: prev.total + (v.monto_total ?? 0), count: prev.count + 1, unidades: prev.unidades + (v.cantidad ?? 0) });
  }
  const ventasPorDia = DIAS.map((dia, d) => ({
    dia, total: dowMap.get(d)?.total ?? 0, count: dowMap.get(d)?.count ?? 0,
    unidades: dowMap.get(d)?.unidades ?? 0,
    promedio: (dowMap.get(d)?.count ?? 0) > 0 ? (dowMap.get(d)!.total / dowMap.get(d)!.count) : 0,
  }));

  // Ventas por hora
  const horaMap = new Map<number, { total: number; count: number }>();
  for (const v of ventasHist ?? []) {
    const h = new Date(v.fecha_venta).getHours();
    const prev = horaMap.get(h) ?? { total: 0, count: 0 };
    horaMap.set(h, { total: prev.total + (v.monto_total ?? 0), count: prev.count + 1 });
  }
  const ventasHora = Array.from({ length: 17 }, (_, i) => i + 6).map(h => ({
    hora: h, label: h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`,
    total: horaMap.get(h)?.total ?? 0, count: horaMap.get(h)?.count ?? 0,
  }));

  // Ventas por fecha (rellena días sin venta)
  const fechaMap = new Map<string, number>();
  for (const v of ventasList) {
    const dia = v.fecha_venta.slice(0, 10);
    fechaMap.set(dia, (fechaMap.get(dia) ?? 0) + (v.monto_total ?? 0));
  }
  const ventasFecha: { fecha: string; total: number }[] = [];
  const startDate = new Date(primer.slice(0, 10));
  const endDate   = new Date(ultimo.slice(0, 10));
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    ventasFecha.push({ fecha: key, total: fechaMap.get(key) ?? 0 });
  }

  // Ranking vendedores
  const vendMap = new Map<number, { nombre: string; meta: number; total: number; count: number }>();
  for (const v of vendedoresRows ?? []) {
    if (!v.vendedor_id) continue;
    const vend = v.vendedores as any;
    const nombre = vend?.nombre ?? "Sin nombre";
    const meta   = vend?.meta_mensual ?? 50000;
    const prev   = vendMap.get(v.vendedor_id) ?? { nombre, meta, total: 0, count: 0 };
    vendMap.set(v.vendedor_id, { nombre, meta, total: prev.total + (v.monto_total ?? 0), count: prev.count + 1 });
  }
  const rankingVendedores = Array.from(vendMap.values())
    .sort((a, b) => b.total - a.total)
    .map((v, i) => ({ ...v, rank: i + 1 }));

  return NextResponse.json({
    mermas:           { rows: mermasFiltradas, totalCosto: totalMerma },
    ventasMes,
    desabasto,
    enRiesgo30:       clientesRiesgo30 ?? [],
    enRiesgo35:       clientesRiesgo35 ?? [],
    topProductos,
    topClientes,
    margenProductos,
    ventasPorDia,
    ventasHora,
    pareto,
    ventasFecha,
    rankingVendedores,
    productos:        productosBasic  ?? [],
    clientes:         clientesBasic   ?? [],
    vendedores:       vendedoresBasic ?? [],
  });
}
