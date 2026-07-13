-- ============================================================
-- Migration 17: Manual inbox operations
-- Run after sql/16-inbox-juridical-upgrade.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inbox_whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'es',
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, language_code)
);

CREATE TABLE IF NOT EXISTS public.inbox_conversation_appointments (
  conversation_id UUID NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, appointment_id)
);

ALTER TABLE public.inbox_whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_conversation_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbox_template_select" ON public.inbox_whatsapp_templates
  FOR SELECT TO authenticated USING (is_active OR public.inbox_is_admin());
CREATE POLICY "inbox_template_admin" ON public.inbox_whatsapp_templates
  FOR ALL TO authenticated
  USING (public.inbox_is_admin())
  WITH CHECK (public.inbox_is_admin());
CREATE POLICY "inbox_appointment_select" ON public.inbox_conversation_appointments
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.inbox_conversations c
    WHERE c.id = conversation_id
      AND (public.inbox_is_admin() OR c.assigned_user_id = (select auth.uid()))
  ));

