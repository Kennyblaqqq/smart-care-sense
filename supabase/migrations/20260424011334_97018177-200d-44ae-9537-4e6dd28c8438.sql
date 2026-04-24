
-- Enable realtime for alerts so the UI updates instantly
ALTER TABLE public.alerts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

-- Helpful index for unresolved alert lookups
CREATE INDEX IF NOT EXISTS idx_alerts_user_unresolved
  ON public.alerts (user_id, created_at DESC)
  WHERE resolved_at IS NULL;

-- Enable extensions for scheduled background scans
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
