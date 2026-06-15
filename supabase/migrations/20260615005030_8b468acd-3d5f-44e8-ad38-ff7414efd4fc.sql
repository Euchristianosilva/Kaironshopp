
-- Auto-promote kaironshopp@gmail.com to admin on signup, and now if already exists
CREATE OR REPLACE FUNCTION public.auto_promote_owner_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'kaironshopp@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_promote_owner ON auth.users;
CREATE TRIGGER on_auth_user_created_promote_owner
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_promote_owner_admin();

-- Promote immediately if user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'kaironshopp@gmail.com'
ON CONFLICT DO NOTHING;
