
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.system_heartbeat (
  id BIGSERIAL PRIMARY KEY,
  beat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);

GRANT SELECT ON public.system_heartbeat TO authenticated;
GRANT ALL ON public.system_heartbeat TO service_role;

ALTER TABLE public.system_heartbeat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Heartbeat readable by authenticated"
  ON public.system_heartbeat
  FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.record_system_heartbeat()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.system_heartbeat (note) VALUES ('cron-keepalive');
$$;

REVOKE EXECUTE ON FUNCTION public.record_system_heartbeat() FROM PUBLIC, anon, authenticated;

-- Unschedule previous version if it exists, then schedule every 3 days at 03:00 UTC
DO $$
BEGIN
  PERFORM cron.unschedule('system-heartbeat-3d');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'system-heartbeat-3d',
  '0 3 */3 * *',
  $$ SELECT public.record_system_heartbeat(); $$
);

-- Seed one row so the table is not empty
INSERT INTO public.system_heartbeat (note) VALUES ('initial-seed');
