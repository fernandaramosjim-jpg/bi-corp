-- Actualizar policies de anon → authenticated
-- Correr DESPUÉS de hacer deploy del login real

-- ventas
DROP POLICY IF EXISTS "anon select" ON ventas;
DROP POLICY IF EXISTS "anon insert" ON ventas;
DROP POLICY IF EXISTS "anon update" ON ventas;
DROP POLICY IF EXISTS "anon delete" ON ventas;
CREATE POLICY "auth" ON ventas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- mermas
DROP POLICY IF EXISTS "anon select" ON mermas;
DROP POLICY IF EXISTS "anon insert" ON mermas;
DROP POLICY IF EXISTS "anon update" ON mermas;
DROP POLICY IF EXISTS "anon delete" ON mermas;
CREATE POLICY "auth" ON mermas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- productos
DROP POLICY IF EXISTS "anon select" ON productos;
DROP POLICY IF EXISTS "anon insert" ON productos;
DROP POLICY IF EXISTS "anon update" ON productos;
DROP POLICY IF EXISTS "anon delete" ON productos;
CREATE POLICY "auth" ON productos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- clientes
DROP POLICY IF EXISTS "anon select" ON clientes;
DROP POLICY IF EXISTS "anon insert" ON clientes;
DROP POLICY IF EXISTS "anon update" ON clientes;
DROP POLICY IF EXISTS "anon delete" ON clientes;
CREATE POLICY "auth" ON clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- vendedores
DROP POLICY IF EXISTS "anon select" ON vendedores;
DROP POLICY IF EXISTS "anon insert" ON vendedores;
DROP POLICY IF EXISTS "anon update" ON vendedores;
CREATE POLICY "auth" ON vendedores FOR ALL TO authenticated USING (true) WITH CHECK (true);
