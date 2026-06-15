UPDATE public.shipping_diagnostics d
SET last_request_context = jsonb_build_object(
  'http_endpoint', d.last_error_endpoint,
  'environment', CASE WHEN c.environment = 'production' THEN 'Production' ELSE 'Sandbox' END,
  'oauth_scopes', COALESCE(c.oauth_scopes, d.requested_scopes),
  'redirect_uri', c.callback_url,
  'client_id_masked', CASE
    WHEN c.client_id IS NULL THEN NULL
    WHEN length(c.client_id) <= 6 THEN left(c.client_id, 2) || '…' || right(c.client_id, 1)
    ELSE left(c.client_id, 3) || '…' || right(c.client_id, 2)
  END
),
updated_at = now()
FROM public.melhor_envio_config c
WHERE d.id = true AND c.id = true;