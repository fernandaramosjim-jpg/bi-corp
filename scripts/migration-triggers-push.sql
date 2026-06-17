-- Triggers que llaman al Edge Function push-send cuando cambian datos relevantes
-- Esto genera notificaciones en tiempo real sin esperar el cron de 30 min
-- El Edge Function tiene dedup: cada alerta se envía máximo 1 vez por día

-- Función genérica que llama al Edge Function
CREATE OR REPLACE FUNCTION fn_notify_push()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://dppneliixtrwgddjpphr.supabase.co/functions/v1/push-send',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := '{}'::jsonb
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: nueva venta registrada → checar si se alcanzó o bajó la meta
DROP TRIGGER IF EXISTS trg_push_ventas ON ventas;
CREATE TRIGGER trg_push_ventas
AFTER INSERT ON ventas
FOR EACH STATEMENT
EXECUTE FUNCTION fn_notify_push();

-- Trigger: nueva merma registrada → checar si las mermas están elevadas
DROP TRIGGER IF EXISTS trg_push_mermas ON mermas;
CREATE TRIGGER trg_push_mermas
AFTER INSERT ON mermas
FOR EACH STATEMENT
EXECUTE FUNCTION fn_notify_push();

-- Trigger: cambio de stock en productos → checar desabasto crítico
DROP TRIGGER IF EXISTS trg_push_productos ON productos;
CREATE TRIGGER trg_push_productos
AFTER UPDATE OF stock_actual ON productos
FOR EACH STATEMENT
EXECUTE FUNCTION fn_notify_push();
