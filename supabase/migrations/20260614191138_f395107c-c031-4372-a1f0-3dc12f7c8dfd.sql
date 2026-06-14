
CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text,
  recipient text NOT NULL,
  phone text,
  zip text NOT NULL,
  street text NOT NULL,
  number text,
  complement text,
  district text,
  city text NOT NULL,
  state text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addresses_select_own" ON public.addresses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "addresses_insert_own" ON public.addresses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses_update_own" ON public.addresses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses_delete_own" ON public.addresses FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_addresses_updated BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_addresses_user ON public.addresses(user_id);
