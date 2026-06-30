import { createClient } from "@supabase/supabase-js";

// Requiere Node 20.6+ — pasar con: node --env-file=.env.local scripts/seed-vendedores.mjs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── 1. Limpiar vendedores previos (idempotente) ───────────────────────────────
console.log("Limpiando vendedores previos...");
await supabase.from("ventas").update({ vendedor_id: null }).not("vendedor_id", "is", null);
await supabase.from("vendedores").delete().gte("id", 0);

// ── 2. Insertar vendedores ────────────────────────────────────────────────────
const VENDEDORES = [
  { nombre: "Carlos Mendoza",  email: "carlos@e1technology.com",  meta_mensual: 80000 },
  { nombre: "Laura Sánchez",   email: "laura@e1technology.com",   meta_mensual: 65000 },
  { nombre: "Roberto Torres",  email: "roberto@e1technology.com", meta_mensual: 55000 },
  { nombre: "Ana García",      email: "ana@e1technology.com",     meta_mensual: 45000 },
];

console.log("Insertando vendedores...");
const { data: vendData, error: vendErr } = await supabase
  .from("vendedores")
  .insert(VENDEDORES)
  .select("id, nombre");

if (vendErr) {
  console.error("Error:", vendErr.message);
  process.exit(1);
}
const ids = vendData.map(v => v.id);
console.log("Creados:", vendData.map(v => `${v.id}:${v.nombre}`).join(", "));

// ── 3. Obtener todas las ventas ───────────────────────────────────────────────
const { data: ventas, error: ventasErr } = await supabase
  .from("ventas")
  .select("id")
  .order("id");

if (ventasErr) {
  console.error("Error:", ventasErr.message);
  process.exit(1);
}
console.log(`Asignando vendedores a ${ventas.length} ventas...`);

// ── 4. Asignar con distribución ponderada (deterministíca) ───────────────────
// Carlos 40% | Laura 30% | Roberto 20% | Ana 10%
function pickId(index) {
  const i = index % 10;
  if (i < 4) return ids[0];
  if (i < 7) return ids[1];
  if (i < 9) return ids[2];
  return ids[3];
}

// ── 5. Agrupar por vendedor y hacer un UPDATE por grupo ──────────────────────
const grupos = new Map();
ventas.forEach((v, i) => {
  const vid = pickId(i);
  if (!grupos.has(vid)) grupos.set(vid, []);
  grupos.get(vid).push(v.id);
});

for (const [vendedorId, ventaIds] of grupos) {
  const nombre = vendData.find(v => v.id === vendedorId)?.nombre ?? vendedorId;
  const { error } = await supabase
    .from("ventas")
    .update({ vendedor_id: vendedorId })
    .in("id", ventaIds);
  if (error) {
    console.error(`Error asignando a ${nombre}:`, error.message);
    process.exit(1);
  }
  console.log(`  ${nombre}: ${ventaIds.length} ventas asignadas`);
}

console.log("¡Listo! Vendedores asignados correctamente.");
