ALTER TABLE public.melhor_envio_config
  ADD COLUMN IF NOT EXISTS oauth_scopes TEXT;

ALTER TABLE public.shipping_diagnostics
  ADD COLUMN IF NOT EXISTS last_request_method TEXT,
  ADD COLUMN IF NOT EXISTS last_response_body TEXT,
  ADD COLUMN IF NOT EXISTS reauth_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reauth_reason TEXT,
  ADD COLUMN IF NOT EXISTS reauth_url TEXT,
  ADD COLUMN IF NOT EXISTS requested_scopes TEXT;