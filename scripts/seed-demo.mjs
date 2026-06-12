/**
 * seed-demo.mjs — genera datos demo ricos para todos los periodos del dashboard
 * Correr con: node --env-file=.env.local scripts/seed-demo.mjs
 */
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ─── Utilidades ───────────────────────────────────────────────────────────────
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const isoDate = (d) => d.toISOString().slice(0, 10);
const isoTs   = (d, hms) => `${isoDate(d)}T${hms}`;
const padded  = (n) => String(n).padStart(2, "0");
const randTime = () => `${padded(rnd(8,19))}:${padded(rnd(0,59))}:${padded(rnd(0,59))}`;

// ─── 1. Cargar catálogos ──────────────────────────────────────────────────────
console.log("Cargando catálogos...");
const [{ data: prods }, { data: clientes }, { data: vendedores }] = await Promise.all([
  sb.from("productos").select("id, precio_venta, costo_proveedor, stock_minimo_critico"),
  sb.from("clientes").select("id"),
  sb.from("vendedores").select("id"),
]);

if (!prods?.length || !clientes?.length) {
  console.error("Faltan productos o clientes. Verifica tu base de datos.");
  process.exit(1);
}
if (!vendedores?.length) {
  console.warn("No hay vendedores — corre seed-vendedores.mjs primero para tenerlos.");
}
console.log(`  ${prods.length} productos · ${clientes.length} clientes · ${vendedores?.length ?? 0} vendedores`);

// ─── 2. Limpiar datos previos ─────────────────────────────────────────────────
console.log("Limpiando ventas y mermas previas...");
await sb.from("ventas").delete().gte("id", 0);
await sb.from("mermas").delete().gte("id", 0);

// ─── 3. Preparar distribuciones ponderadas ────────────────────────────────────

// Clientes: distribución pareto (los primeros 3 compran ~60%)
const cliPesos = clientes.flatMap((c, i) =>
  Array(Math.max(1, 7 - i)).fill(c.id)
);

// Productos: top 4 se venden mucho más
const prodPesos = prods.flatMap((p, i) =>
  Array(Math.max(1, 6 - Math.floor(i / 2))).fill(p)
);

// Vendedores: Carlos 40%, Laura 30%, Roberto 20%, Ana 10%
const vendPesos = vendedores?.length
  ? vendedores.flatMap((v, i) => Array([4,3,2,1][i] ?? 1).fill(v.id))
  : [];

// ─── 4. Generar ventas (últimos 90 días, incluyendo hoy) ─────────────────────
const HOY   = new Date("2026-06-10");
const INICIO = addDays(HOY, -89);

console.log(`Generando ventas del ${isoDate(INICIO)} al ${isoDate(HOY)}...`);
const ventas = [];
let dia = new Date(INICIO);

while (dia <= HOY) {
  const dow = dia.getDay(); // 0=Dom 6=Sáb
  const esFinDeSemana = dow === 0 || dow === 6;

  // Tendencia creciente: día 0→70%, día 89→100%
  const diasDesde = Math.floor((dia - INICIO) / 86_400_000);
  const tendencia = 0.7 + 0.3 * (diasDesde / 89);

  const baseMin = esFinDeSemana ? 1 : 4;
  const baseMax = esFinDeSemana ? 4 : 9;
  const numVentas = Math.round((baseMin + Math.random() * (baseMax - baseMin)) * tendencia);

  for (let i = 0; i < numVentas; i++) {
    const prod = pick(prodPesos);
    const cantidad = rnd(1, 5);
    // Precio con variación ±5%
    const precio = prod.precio_venta * (0.95 + Math.random() * 0.1);
    ventas.push({
      cliente_id:  pick(cliPesos),
      producto_id: prod.id,
      fecha_venta: isoTs(dia, randTime()),
      cantidad,
      monto_total: Math.round(precio * cantidad * 100) / 100,
      ...(vendPesos.length && { vendedor_id: pick(vendPesos) }),
    });
  }
  dia = addDays(dia, 1);
}

// Insertar en lotes de 100
const BATCH = 100;
for (let i = 0; i < ventas.length; i += BATCH) {
  const { error } = await sb.from("ventas").insert(ventas.slice(i, i + BATCH));
  if (error) { console.error("Error ventas:", error.message); process.exit(1); }
  process.stdout.write(`\r  ${Math.min(i + BATCH, ventas.length)}/${ventas.length} ventas insertadas`);
}
console.log(`\n  ✓ ${ventas.length} ventas generadas`);

// ─── 5. Generar mermas (~30% de los días tienen merma) ───────────────────────
console.log("Generando mermas...");
const MOTIVOS = ["Caducidad", "Daño en transporte", "Rotura en almacén", "Contaminación", "Error de inventario"];
const mermas = [];
let dm = new Date(INICIO);
while (dm <= HOY) {
  if (Math.random() < 0.3) {
    const p = pick(prods);
    const cant = rnd(1, 8);
    mermas.push({
      producto_id:     p.id,
      fecha_merma:     isoDate(dm),
      cantidad_perdida: cant,
      motivo:          pick(MOTIVOS),
      costo_perdida:   Math.round(p.costo_proveedor * cant * 100) / 100,
    });
  }
  dm = addDays(dm, 1);
}
const { error: merErr } = await sb.from("mermas").insert(mermas);
if (merErr) console.warn("  Aviso mermas:", merErr.message);
else console.log(`  ✓ ${mermas.length} mermas generadas`);

// ─── 6. Desabasto: poner 3 productos en stock crítico ─────────────────────────
console.log("Configurando alertas de desabasto...");
for (const p of prods.slice(0, 3)) {
  const stockCritico = Math.max(0, Math.floor(p.stock_minimo_critico * 0.4));
  const { error } = await sb.from("productos").update({ stock_actual: stockCritico }).eq("id", p.id);
  if (error) console.warn("  Aviso stock:", error.message);
}
console.log("  ✓ 3 productos con desabasto crítico");

// ─── 7. Retención: marcar 2 clientes sin comprar en 40+ días ─────────────────
console.log("Configurando alertas de retención...");
const fechaRiesgo1 = isoDate(addDays(HOY, -42));
const fechaRiesgo2 = isoDate(addDays(HOY, -58));
if (clientes.length >= 2) {
  await sb.from("clientes").update({ ultima_fecha_compra: fechaRiesgo1 }).eq("id", clientes[clientes.length - 2].id);
  await sb.from("clientes").update({ ultima_fecha_compra: fechaRiesgo2 }).eq("id", clientes[clientes.length - 1].id);
  console.log("  ✓ 2 clientes marcados en riesgo de churn");
}

console.log(`
🎉 ¡Demo data lista!
   Ventas:  ${ventas.length} registros (${isoDate(INICIO)} → ${isoDate(HOY)})
   Mermas:  ${mermas.length} registros
   Alertas: desabasto + retención activados
`);
