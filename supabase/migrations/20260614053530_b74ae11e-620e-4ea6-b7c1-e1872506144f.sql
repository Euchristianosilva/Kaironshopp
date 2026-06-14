
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_new_message() FROM PUBLIC, anon, authenticated;
