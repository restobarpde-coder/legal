-- =============================================================================
-- 4. RLS POLICIES
-- =============================================================================
-- Clear existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "Allow users to view their own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow users to update their own data" ON public.users FOR UPDATE USING (auth.uid() = id);

-- CLIENTS (accessible by all authenticated users)
CREATE POLICY "Allow all authenticated users to manage clients" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CASES
CREATE POLICY "Lawyers can view all cases, assistants only their own" ON public.cases
    FOR SELECT
    USING (
        get_user_role(auth.uid()) = 'lawyer' OR
        is_case_member(id, auth.uid())
    );

CREATE POLICY "Users can create cases" ON public.cases
    FOR INSERT
    WITH CHECK (
        created_by = auth.uid()
    );

CREATE POLICY "Lawyers or case members can update cases" ON public.cases
    FOR UPDATE
    USING (
        get_user_role(auth.uid()) = 'lawyer' OR
        is_case_member(id, auth.uid())
    );

CREATE POLICY "Lawyers or case creators can delete cases" ON public.cases
    FOR DELETE
    USING (
        get_user_role(auth.uid()) = 'lawyer' OR
        created_by = auth.uid()
    );

-- CASE MEMBERS
CREATE POLICY "Lawyers or case members can view memberships" ON public.case_members
    FOR SELECT
    USING (
        get_user_role(auth.uid()) = 'lawyer' OR
        is_case_member(case_id, auth.uid())
    );

CREATE POLICY "Lawyers or case creators can add members" ON public.case_members
    FOR INSERT
    WITH CHECK (
        get_user_role(auth.uid()) = 'lawyer' OR
        EXISTS (SELECT 1 FROM cases WHERE id = case_id AND created_by = auth.uid())
    );

CREATE POLICY "Lawyers or case creators can remove members" ON public.case_members
    FOR DELETE
    USING (
        get_user_role(auth.uid()) = 'lawyer' OR
        EXISTS (SELECT 1 FROM cases WHERE id = case_id AND created_by = auth.uid())
    );

-- TASKS, DOCUMENTS, NOTES, TIME ENTRIES (permission inherited from case)
CREATE POLICY "Inherit access from case for tasks" ON public.tasks FOR ALL USING (is_case_member(case_id, auth.uid()) OR get_user_role(auth.uid()) = 'lawyer');
CREATE POLICY "Inherit access from case for documents" ON public.documents FOR ALL USING (is_case_member(case_id, auth.uid()) OR get_user_role(auth.uid()) = 'lawyer');
CREATE POLICY "Inherit access from case for notes" ON public.notes FOR ALL USING (is_case_member(case_id, auth.uid()) OR get_user_role(auth.uid()) = 'lawyer');
CREATE POLICY "Inherit access from case for time_entries" ON public.time_entries FOR ALL USING (is_case_member(case_id, auth.uid()) OR get_user_role(auth.uid()) = 'lawyer');
