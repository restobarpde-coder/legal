CREATE OR REPLACE FUNCTION public.inbox_increment_unread(p_conversation_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_count INTEGER;
BEGIN
  UPDATE public.inbox_conversations
  SET unread_count = (
    SELECT COUNT(*)::INTEGER
    FROM public.inbox_messages
    WHERE conversation_id = p_conversation_id
      AND direction = 'inbound'
      AND is_read = FALSE
  )
  WHERE id = p_conversation_id
  RETURNING unread_count INTO next_count;

  RETURN COALESCE(next_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.inbox_increment_unread(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inbox_increment_unread(UUID) TO service_role;
