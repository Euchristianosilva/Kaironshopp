ALTER TABLE public.shipping_diagnostics
  ADD COLUMN IF NOT EXISTS last_request_headers JSONB;