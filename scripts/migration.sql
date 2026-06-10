-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tabla de vendedores
CREATE TABLE vendedores (
  id           SERIAL PRIMARY KEY,
  nombre       TEXT NOT NULL,
  email        TEXT,
  meta_mensual NUMERIC(12,2) NOT NULL DEFAULT 50000,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS: lectura y escritura pública (igual que ventas/mermas)
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon select"  ON vendedores FOR SELECT USING (true);
CREATE POLICY "anon insert"  ON vendedores FOR INSERT WITH CHECK (true);
CREATE POLICY "anon update"  ON vendedores FOR UPDATE USING (true);

-- 3. Agregar columna vendedor_id a ventas (nullable, no rompe datos existentes)
ALTER TABLE ventas ADD COLUMN vendedor_id INTEGER REFERENCES vendedores(id);
