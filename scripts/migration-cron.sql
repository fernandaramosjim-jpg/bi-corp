-- Programar Edge Function push-send cada 30 minutos via pg_cron + pg_net
-- Correr en el SQL Editor de Supabase

-- 1. Habilitar extensiones (si no están activas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Crear el job
--    Reemplaza los dos valores de abajo con los de tu proyecto:
--      SUPABASE_URL  → Settings > API > Project URL
--      SERVICE_KEY   → Settings > API > service_role (secret)

SELECT cron.schedule(
  'push-alerts-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://TU_PROYECTO.supabase.co/functions/v1/push-send',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer TU_SERVICE_ROLE_KEY'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Verificar que quedó programado:
-- SELECT jobid, jobname, schedule, active FROM cron.job;

-- Eliminar el job si necesitas rehacerlo:
-- SELECT cron.unschedule('push-alerts-30min');
