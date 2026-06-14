
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  buyer_unread INT NOT NULL DEFAULT 0,
  seller_unread INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, seller_id, product_id)
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_buyer ON public.conversations(buyer_id, last_message_at DESC);
CREATE INDEX idx_conversations_seller ON public.conversations(seller_id, last_message_at DESC);
CREATE INDEX idx_messages_conv ON public.messages(conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper: is user a participant of a conversation?
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id UUID, _conv_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    LEFT JOIN public.sellers s ON s.id = c.seller_id
    WHERE c.id = _conv_id
      AND (c.buyer_id = _user_id OR s.owner_id = _user_id)
  )
$$;

-- Conversations policies
CREATE POLICY "Participants can view conversations" ON public.conversations
  FOR SELECT TO authenticated USING (
    buyer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "Buyers can create conversations" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Participants can update conversation counters" ON public.conversations
  FOR UPDATE TO authenticated USING (
    buyer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid())
  );

-- Messages policies
CREATE POLICY "Participants can view messages" ON public.messages
  FOR SELECT TO authenticated USING (public.is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "Participants can send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_participant(auth.uid(), conversation_id)
  );

CREATE POLICY "Participants can mark messages read" ON public.messages
  FOR UPDATE TO authenticated USING (public.is_conversation_participant(auth.uid(), conversation_id));

-- Update conversation on new message + notify other party
CREATE OR REPLACE FUNCTION public.on_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE conv RECORD; recipient UUID; sender_name TEXT;
BEGIN
  SELECT c.*, s.owner_id AS seller_owner, s.name AS seller_name
  INTO conv
  FROM public.conversations c
  JOIN public.sellers s ON s.id = c.seller_id
  WHERE c.id = NEW.conversation_id;

  IF NEW.sender_id = conv.buyer_id THEN
    recipient := conv.seller_owner;
    UPDATE public.conversations SET
      last_message_at = NEW.created_at,
      last_message_preview = left(NEW.body, 120),
      seller_unread = seller_unread + 1,
      updated_at = now()
    WHERE id = conv.id;
  ELSE
    recipient := conv.buyer_id;
    UPDATE public.conversations SET
      last_message_at = NEW.created_at,
      last_message_preview = left(NEW.body, 120),
      buyer_unread = buyer_unread + 1,
      updated_at = now()
    WHERE id = conv.id;
  END IF;

  SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  VALUES (
    recipient, 'generic',
    'Nova mensagem' || COALESCE(' de ' || sender_name, ''),
    left(NEW.body, 160),
    '/messages?c=' || conv.id::text,
    jsonb_build_object('conversation_id', conv.id, 'sender_id', NEW.sender_id)
  );
  RETURN NEW;
END $$;

CREATE TRIGGER messages_after_insert
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.on_new_message();

CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
