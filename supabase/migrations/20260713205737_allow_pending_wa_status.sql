-- The reply endpoint persists outbound WhatsApp messages with wa_status
-- 'pending' before attempting delivery, then updates to 'sent'/'failed'.
-- The original constraint only allowed post-delivery statuses, so every
-- outbound WhatsApp reply failed at the initial insert.
ALTER TABLE public.inbox_messages
  DROP CONSTRAINT IF EXISTS inbox_messages_wa_status_check;

ALTER TABLE public.inbox_messages
  ADD CONSTRAINT inbox_messages_wa_status_check
  CHECK (wa_status IN ('pending', 'sent', 'delivered', 'read', 'failed'));
