
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS origin_zip text,
  ADD COLUMN IF NOT EXISTS origin_state char(2),
  ADD COLUMN IF NOT EXISTS origin_city text,
  ADD COLUMN IF NOT EXISTS origin_district text,
  ADD COLUMN IF NOT EXISTS origin_address text,
  ADD COLUMN IF NOT EXISTS origin_number text,
  ADD COLUMN IF NOT EXISTS origin_complement text;

CREATE TABLE IF NOT EXISTS public.shipping_quotes_cache (
  cache_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.shipping_quotes_cache TO service_role;
ALTER TABLE public.shipping_quotes_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.shipping_quotes_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_shipping_quotes_cache_expires_at
  ON public.shipping_quotes_cache(expires_at);
