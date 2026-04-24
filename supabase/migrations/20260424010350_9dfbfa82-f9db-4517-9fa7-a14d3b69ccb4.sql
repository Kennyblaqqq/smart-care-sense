ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS api_key_prefix text;
CREATE INDEX IF NOT EXISTS idx_vitals_user_metric_time ON public.vitals_readings (user_id, metric_type, recorded_at DESC);