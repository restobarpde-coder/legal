-- ============================================================
-- Role system coherence fixes
--
-- Effective roles are admin | lawyer | assistant. Legacy enum
-- values map as: super_admin→admin, paralegal/intern→assistant,
-- client→no dashboard access. This migration aligns the SQL
-- layer with that model and closes the role self-escalation
-- hole (register page let anyone pick 'admin').
-- ============================================================

-- 1. inbox_is_admin() excluded super_admin, denying it the inbox
--    access the main RLS (get_user_role_safe) already grants.
CREATE OR REPLACE FUNCTION public.inbox_is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- 2. The chatwoot policies from sql/08 referenced user_profiles,
--    a table that was never created, so their admin branch can
--    never evaluate true. Recreate them against public.users.
DROP POLICY IF EXISTS "Users can access assigned conversations" ON public.chatwoot_conversations;
CREATE POLICY "Users can access assigned conversations" ON public.chatwoot_conversations
  FOR SELECT USING (
    auth.uid() = auto_assigned_user_id OR
    auto_assigned_user_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Allow webhook and assigned user updates" ON public.chatwoot_conversations;
CREATE POLICY "Allow webhook and assigned user updates" ON public.chatwoot_conversations
  FOR UPDATE USING (
    auto_assigned_user_id IS NULL OR
    auth.uid() = auto_assigned_user_id OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- 3. Conversations are queried by case for the case-detail
--    "Mensajes" tab; linked_client_id already has an index.
CREATE INDEX IF NOT EXISTS idx_inbox_conv_linked_case
  ON public.inbox_conversations(linked_case_id);

-- 4. Only admins may assign or change roles. Self-registration
--    (client-side inserts into public.users) is forced to
--    'assistant'; the service role (auth.uid() IS NULL) bypasses.
CREATE OR REPLACE FUNCTION public.enforce_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'assistant';
  ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar roles';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_role_change ON public.users;
CREATE TRIGGER trg_enforce_role_change
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_role_change();
