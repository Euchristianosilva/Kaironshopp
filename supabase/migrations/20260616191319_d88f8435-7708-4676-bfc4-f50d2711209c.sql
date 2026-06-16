-- Add promotion type and enable realtime
DO $$ BEGIN
  CREATE TYPE public.promotion_type AS ENUM ('flash','exclusive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS type public.promotion_type NOT NULL DEFAULT 'flash';

ALTER TABLE public.promotions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions;