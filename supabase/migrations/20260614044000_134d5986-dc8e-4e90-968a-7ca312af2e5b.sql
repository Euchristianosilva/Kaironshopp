
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tracking_code text,
  ADD COLUMN IF NOT EXISTS carrier text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS seller_notes text;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_fulfillment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_fulfillment_status_check
  CHECK (fulfillment_status IN ('pending','processing','shipped','delivered','canceled','returned'));

CREATE POLICY "orders seller read" ON public.orders FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = orders.seller_id AND s.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.order_items oi JOIN public.sellers s ON s.id = oi.seller_id
             WHERE oi.order_id = orders.id AND s.owner_id = auth.uid()));

CREATE POLICY "orders seller update fulfillment" ON public.orders FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.order_items oi JOIN public.sellers s ON s.id = oi.seller_id
               WHERE oi.order_id = orders.id AND s.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.order_items oi JOIN public.sellers s ON s.id = oi.seller_id
                    WHERE oi.order_id = orders.id AND s.owner_id = auth.uid()));
