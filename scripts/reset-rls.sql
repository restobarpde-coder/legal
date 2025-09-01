-- Script para reiniciar políticas RLS y corregir recursión infinita
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can create clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view cases they are members of" ON public.cases;
DROP POLICY IF EXISTS "Authenticated users can create cases" ON public.cases;
DROP POLICY IF EXISTS "Case members can update cases" ON public.cases;
DROP POLICY IF EXISTS "Users can view case members for their cases" ON public.case_members;
DROP POLICY IF EXISTS "Case owners can manage members" ON public.case_members;
DROP POLICY IF EXISTS "Users can view their own case memberships" ON public.case_members;
DROP POLICY IF EXISTS "Users can insert case members for cases they create" ON public.case_members;
DROP POLICY IF EXISTS "Case creators can manage members" ON public.case_members;
DROP POLICY IF EXISTS "Case creators can delete members" ON public.case_members;
DROP POLICY IF EXISTS "Users can view tasks for their cases" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks for their cases" ON public.tasks;
DROP POLICY IF EXISTS "Users can view documents for their cases" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view notes for their cases/clients" ON public.notes;
DROP POLICY IF EXISTS "Authenticated users can create notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can view time entries for their cases" ON public.time_entries;
DROP POLICY IF EXISTS "Users can create their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON public.time_entries;

-- 2. Recrear las políticas corregidas

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Clients policies (accessible by all authenticated users)
CREATE POLICY "Authenticated users can view clients" ON public.clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update clients" ON public.clients
  FOR UPDATE TO authenticated USING (true);

-- Cases policies (based on case_members)
CREATE POLICY "Users can view cases they are members of" ON public.cases
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.case_members cm 
      WHERE cm.case_id = id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create cases" ON public.cases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Case members can update cases" ON public.cases
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.case_members cm 
      WHERE cm.case_id = id AND cm.user_id = auth.uid()
    )
  );

-- Case members policies (CORREGIDAS - sin recursión)
CREATE POLICY "Users can view their own case memberships" ON public.case_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert case members for cases they create" ON public.case_members
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Case creators can manage members" ON public.case_members
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Case creators can delete members" ON public.case_members
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id AND c.created_by = auth.uid()
    )
  );

-- Tasks policies
CREATE POLICY "Users can view tasks for their cases" ON public.tasks
  FOR SELECT TO authenticated USING (
    case_id IS NULL OR EXISTS (
      SELECT 1 FROM public.case_members cm 
      WHERE cm.case_id = tasks.case_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create tasks" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update tasks for their cases" ON public.tasks
  FOR UPDATE TO authenticated USING (
    case_id IS NULL OR EXISTS (
      SELECT 1 FROM public.case_members cm 
      WHERE cm.case_id = tasks.case_id AND cm.user_id = auth.uid()
    )
  );

-- Documents policies
CREATE POLICY "Users can view documents for their cases" ON public.documents
  FOR SELECT TO authenticated USING (
    case_id IS NULL OR EXISTS (
      SELECT 1 FROM public.case_members cm 
      WHERE cm.case_id = documents.case_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can upload documents" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);

-- Notes policies
CREATE POLICY "Users can view notes for their cases/clients" ON public.notes
  FOR SELECT TO authenticated USING (
    (case_id IS NULL OR EXISTS (
      SELECT 1 FROM public.case_members cm 
      WHERE cm.case_id = notes.case_id AND cm.user_id = auth.uid()
    )) AND
    (is_private = false OR created_by = auth.uid())
  );

CREATE POLICY "Authenticated users can create notes" ON public.notes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own notes" ON public.notes
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Time entries policies
CREATE POLICY "Users can view time entries for their cases" ON public.time_entries
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.case_members cm 
      WHERE cm.case_id = time_entries.case_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own time entries" ON public.time_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries" ON public.time_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
