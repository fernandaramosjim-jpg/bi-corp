import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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

const updates = ventas.map((v, i) => ({ id: v.id, vendedor_id: pickId(i) }));

// ── 5. Update en lotes de 100 ─────────────────────────────────────────────────
const BATCH = 100;
for (let i = 0; i < updates.length; i += BATCH) {
  const batch = updates.slice(i, i + BATCH);
  const { error } = await supabase.from("ventas").upsert(batch, { onConflict: "id" });
  if (error) {
    console.error(`Error en lote ${Math.floor(i / BATCH) + 1}:`, error.message);
    process.exit(1);
  }
  process.stdout.write(`\r  ${Math.min(i + BATCH, updates.length)}/${updates.length} ventas listas`);
}

console.log("\n¡Listo! Vendedores asignados correctamente.");
