-- ============================================================
-- Migration 21: align attachment visibility with migration 19
-- Run after sql/20-notifications-reliability.sql
-- ============================================================
--
-- Migration 19 moved inbox visibility to `inbox_can_access_conversation()`,
-- where staff see every WhatsApp conversation and email is scoped by account.
-- It redefined the policies on inbox_conversations, inbox_messages and
-- inbox_delivery_attempts, but left inbox_attachments on migration 16's rule:
-- admin, or the conversation assigned to the caller.
--
-- Inbound WhatsApp conversations are created unassigned, so for a non-admin
-- that rule matched no rows: the message rendered (19's policy allowed it) while
-- /api/inbox/attachments/[id] answered 404 for the attachment it referenced.
-- Voice notes showed a dead 0:00 / 0:00 player, and "Guardar en caso" could not
-- read the file either.
--
-- Deriving from the message keeps one source of truth, so a future change to
-- conversation visibility carries over instead of drifting again. This grants no
-- more than migration 19 already does: an attachment is readable exactly when
-- the message carrying it is.
--
-- Unlike migration 16, this drops before creating so it can be re-run safely.

DROP POLICY IF EXISTS "inbox_attachment_select" ON public.inbox_attachments;

CREATE POLICY "inbox_attachment_select" ON public.inbox_attachments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.inbox_messages m
      WHERE m.id = message_id
        AND public.inbox_can_access_conversation(m.conversation_id)
    )
  );

-- Verification, as a logged-in non-admin (not the service role): this must
-- return the row for a WhatsApp voice note rather than zero rows.
--   SELECT a.id, a.mime_type
--   FROM public.inbox_attachments a
--   JOIN public.inbox_messages m ON m.id = a.message_id
--   WHERE m.content_type = 'audio';
--
-- Still on migration 16's stricter rule, and worth revisiting separately:
-- inbox_notes (inbox_note_select / inbox_note_insert) and
-- inbox_conversation_appointments (inbox_appointment_select) — notes and
-- appointments on unassigned WhatsApp conversations stay invisible to lawyers.
