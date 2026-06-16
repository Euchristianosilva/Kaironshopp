
-- 1. Department enum
DO $$ BEGIN
  CREATE TYPE public.support_department AS ENUM ('financial','commercial','logistics','technical','general');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add department columns
ALTER TABLE public.support_agents
  ADD COLUMN IF NOT EXISTS department public.support_department NOT NULL DEFAULT 'general';

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS department public.support_department NOT NULL DEFAULT 'general';

-- 3. Backfill ticket departments from category
UPDATE public.support_tickets SET department = CASE
  WHEN category = 'financial' THEN 'financial'::public.support_department
  WHEN category = 'shipping' THEN 'logistics'::public.support_department
  WHEN category = 'technical' THEN 'technical'::public.support_department
  WHEN category IN ('products','orders') THEN 'commercial'::public.support_department
  ELSE 'general'::public.support_department
END WHERE department = 'general';

CREATE INDEX IF NOT EXISTS idx_support_tickets_department ON public.support_tickets(department);

-- 4. Allow 'system' sender type for transfer events
ALTER TABLE public.support_messages DROP CONSTRAINT IF EXISTS support_messages_sender_type_check;
ALTER TABLE public.support_messages
  ADD CONSTRAINT support_messages_sender_type_check
  CHECK (sender_type IN ('seller','agent','system'));

-- 5. Helper: viewer can see this ticket as support staff
CREATE OR REPLACE FUNCTION public.support_can_view_ticket(_uid uuid, _ticket_dept public.support_department)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_agents a
    WHERE a.user_id = _uid AND a.active
      AND (a.role = 'manager' OR a.department = _ticket_dept)
  )
$$;

-- 6. Update ticket RLS to scope by department
DROP POLICY IF EXISTS "tickets_seller_select" ON public.support_tickets;
CREATE POLICY "tickets_seller_select" ON public.support_tickets
  FOR SELECT TO authenticated USING (
    opened_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.support_can_view_ticket(auth.uid(), department)
  );

DROP POLICY IF EXISTS "tickets_update_owner_or_support" ON public.support_tickets;
CREATE POLICY "tickets_update_owner_or_support" ON public.support_tickets
  FOR UPDATE TO authenticated USING (
    opened_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.support_can_view_ticket(auth.uid(), department)
  ) WITH CHECK (
    opened_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.support_can_view_ticket(auth.uid(), department)
  );

-- 7. Allow system messages from agents/admins
DROP POLICY IF EXISTS "support_msgs_insert" ON public.support_messages;
CREATE POLICY "support_msgs_insert" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id AND (
        (support_messages.sender_type = 'seller' AND t.opened_by = auth.uid())
        OR (support_messages.sender_type IN ('agent','system')
            AND (public.is_support_agent(auth.uid()) OR public.has_role(auth.uid(),'admin'::public.app_role)))
      )
    )
  );

-- 8. Skip counter/notification side effects for system messages
CREATE OR REPLACE FUNCTION public.on_new_support_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t RECORD; recipient uuid;
BEGIN
  IF NEW.sender_type = 'system' THEN
    UPDATE public.support_tickets SET
      last_message_at = NEW.created_at,
      last_message_preview = left(NEW.body, 140),
      updated_at = now()
    WHERE id = NEW.ticket_id;
    RETURN NEW;
  END IF;

  SELECT * INTO t FROM public.support_tickets WHERE id = NEW.ticket_id;

  IF NEW.sender_type = 'seller' THEN
    UPDATE public.support_tickets SET
      last_message_at = NEW.created_at,
      last_message_preview = left(NEW.body, 140),
      agent_unread = agent_unread + 1,
      status = CASE WHEN status IN ('resolved','closed') THEN 'open'::public.ticket_status ELSE status END,
      updated_at = now()
    WHERE id = NEW.ticket_id;
    IF t.assigned_to IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
      VALUES (t.assigned_to, 'generic', 'Nova mensagem em chamado', left(NEW.body, 160),
              '/admin/support?t=' || t.id::text, jsonb_build_object('ticket_id', t.id));
    END IF;
  ELSE
    recipient := t.opened_by;
    UPDATE public.support_tickets SET
      last_message_at = NEW.created_at,
      last_message_preview = left(NEW.body, 140),
      seller_unread = seller_unread + 1,
      status = CASE WHEN status = 'open' THEN 'in_progress'::public.ticket_status ELSE status END,
      updated_at = now()
    WHERE id = NEW.ticket_id;
    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (recipient, 'generic', 'Resposta do suporte', left(NEW.body, 160),
            '/seller/support?t=' || t.id::text, jsonb_build_object('ticket_id', t.id));
  END IF;
  RETURN NEW;
END $$;

-- 9. Realtime for agent list
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_agents;
