-- POLÍTICAS RLS SIMPLES Y FUNCIONALES
-- Enfoque: simplicidad y funcionalidad, sin recursión

-- =============================================================================
-- 1. LIMPIAR POLÍTICAS EXISTENTES
-- =============================================================================

-- Eliminar todas las políticas existentes de todas las tablas
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Eliminar todas las políticas de las tablas principales
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Eliminar funciones auxiliares
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_lawyer();
DROP FUNCTION IF EXISTS is_assistant();

-- =============================================================================
-- 2. FUNCIONES AUXILIARES SIMPLES
-- =============================================================================

-- Función simple para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Si no hay usuario autenticado, devolver 'anonymous'
    IF auth.uid() IS NULL THEN
        RETURN 'anonymous';
    END IF;
    
    -- Buscar el rol del usuario
    SELECT role INTO user_role
    FROM public.users 
    WHERE id = auth.uid();
    
    -- Si no encuentra el usuario, devolver 'assistant' por defecto
    RETURN COALESCE(user_role, 'assistant');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. POLÍTICAS PARA USERS (SIMPLE)
-- =============================================================================

CREATE POLICY "Anyone can view users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- =============================================================================
-- 4. POLÍTICAS PARA CLIENTS (TODOS PUEDEN ACCEDER)
-- =============================================================================

CREATE POLICY "Anyone can view clients" ON public.clients
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update clients" ON public.clients
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete clients" ON public.clients
  FOR DELETE USING (true);

-- =============================================================================
-- 5. POLÍTICAS PARA CASES (AQUÍ ESTÁ LA LÓGICA DE ROLES)
-- =============================================================================

-- VER CASOS: La lógica principal
CREATE POLICY "View cases based on role" ON public.cases
  FOR SELECT USING (
    -- Admin y Lawyer ven todo
    get_user_role() IN ('admin', 'lawyer') OR
    -- Assistant solo ve casos que creó
    (get_user_role() = 'assistant' AND created_by = auth.uid()) OR
    -- Assistant también ve casos donde es miembro (versión simple)
    (get_user_role() = 'assistant' AND EXISTS (
      SELECT 1 FROM public.case_members 
      WHERE case_id = cases.id AND user_id = auth.uid()
    )) OR
    -- Usuarios no autenticados no ven nada de casos
    (get_user_role() = 'anonymous' AND false)
  );

-- CREAR CASOS: Todos los usuarios autenticados
CREATE POLICY "Authenticated users can create cases" ON public.cases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- ACTUALIZAR CASOS: Misma lógica que ver
CREATE POLICY "Update cases based on role" ON public.cases
  FOR UPDATE USING (
    get_user_role() IN ('admin', 'lawyer') OR
    (get_user_role() = 'assistant' AND created_by = auth.uid()) OR
    (get_user_role() = 'assistant' AND EXISTS (
      SELECT 1 FROM public.case_members 
      WHERE case_id = cases.id AND user_id = auth.uid()
    ))
  );

-- ELIMINAR CASOS: Solo admin, lawyer, o creador
CREATE POLICY "Delete cases based on role" ON public.cases
  FOR DELETE USING (
    get_user_role() IN ('admin', 'lawyer') OR
    (get_user_role() = 'assistant' AND created_by = auth.uid())
  );

-- =============================================================================
-- 6. POLÍTICAS PARA CASE_MEMBERS (SIMPLE)
-- =============================================================================

CREATE POLICY "Anyone can view case members" ON public.case_members
  FOR SELECT USING (true);

CREATE POLICY "Admin and Lawyer can manage members" ON public.case_members
  FOR ALL USING (get_user_role() IN ('admin', 'lawyer'));

CREATE POLICY "Case creators can manage their case members" ON public.case_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.cases WHERE id = case_id AND created_by = auth.uid())
  );

-- =============================================================================
-- 7. POLÍTICAS PARA TASKS, DOCUMENTS, NOTES, TIME_ENTRIES (MUY SIMPLE)
-- =============================================================================

-- TASKS: Acceso basado en casos
CREATE POLICY "View tasks if can view related case" ON public.tasks
  FOR SELECT USING (
    case_id IS NULL OR
    get_user_role() IN ('admin', 'lawyer') OR
    (get_user_role() = 'assistant' AND (
      EXISTS (SELECT 1 FROM public.cases WHERE id = case_id AND created_by = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.case_members WHERE case_id = tasks.case_id AND user_id = auth.uid())
    ))
  );

CREATE POLICY "Create tasks" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update tasks if can view case" ON public.tasks
  FOR UPDATE USING (
    get_user_role() IN ('admin', 'lawyer') OR
    created_by = auth.uid()
  );

CREATE POLICY "Delete own tasks" ON public.tasks
  FOR DELETE USING (
    get_user_role() IN ('admin', 'lawyer') OR
    created_by = auth.uid()
  );

-- DOCUMENTS: Similar a tasks
CREATE POLICY "View documents if can view related case" ON public.documents
  FOR SELECT USING (
    case_id IS NULL OR
    get_user_role() IN ('admin', 'lawyer') OR
    (get_user_role() = 'assistant' AND (
      EXISTS (SELECT 1 FROM public.cases WHERE id = case_id AND created_by = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.case_members WHERE case_id = documents.case_id AND user_id = auth.uid())
    ))
  );

CREATE POLICY "Upload documents" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Update documents" ON public.documents
  FOR UPDATE USING (get_user_role() IN ('admin', 'lawyer') OR uploaded_by = auth.uid());

CREATE POLICY "Delete documents" ON public.documents
  FOR DELETE USING (get_user_role() IN ('admin', 'lawyer') OR uploaded_by = auth.uid());

-- NOTES: Con privacidad simple
CREATE POLICY "View notes if can view case and not private" ON public.notes
  FOR SELECT USING (
    (case_id IS NULL OR
     get_user_role() IN ('admin', 'lawyer') OR
     (get_user_role() = 'assistant' AND (
       EXISTS (SELECT 1 FROM public.cases WHERE id = case_id AND created_by = auth.uid()) OR
       EXISTS (SELECT 1 FROM public.case_members WHERE case_id = notes.case_id AND user_id = auth.uid())
     ))
    ) AND
    (is_private = false OR created_by = auth.uid())
  );

CREATE POLICY "Create notes" ON public.notes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update own notes" ON public.notes
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Delete own notes" ON public.notes
  FOR DELETE USING (auth.uid() = created_by);

-- TIME_ENTRIES: Solo propias
CREATE POLICY "View time entries if can view case" ON public.time_entries
  FOR SELECT USING (
    get_user_role() IN ('admin', 'lawyer') OR
    user_id = auth.uid() OR
    (get_user_role() = 'assistant' AND (
      EXISTS (SELECT 1 FROM public.cases WHERE id = case_id AND created_by = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.case_members WHERE case_id = time_entries.case_id AND user_id = auth.uid())
    ))
  );

CREATE POLICY "Create own time entries" ON public.time_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own time entries" ON public.time_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Delete own time entries" ON public.time_entries
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- 8. REACTIVAR RLS
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 9. ASIGNAR GONZALO A ALGUNOS CASOS PARA PRUEBA
-- =============================================================================

-- Buscar IDs necesarios y asignar a Gonzalo como miembro de un caso
DO $$
DECLARE
    gonzalo_id UUID;
    sample_case_id UUID;
BEGIN
    -- Obtener ID de Gonzalo
    SELECT id INTO gonzalo_id 
    FROM public.users 
    WHERE email = 'gonzalo@centrodeasesoramiento.com' 
    LIMIT 1;
    
    -- Obtener un caso de ejemplo
    SELECT id INTO sample_case_id 
    FROM public.cases 
    LIMIT 1;
    
    -- Solo si encontramos ambos
    IF gonzalo_id IS NOT NULL AND sample_case_id IS NOT NULL THEN
        -- Insertar membresía si no existe
        INSERT INTO public.case_members (case_id, user_id, role)
        VALUES (sample_case_id, gonzalo_id, 'assistant')
        ON CONFLICT (case_id, user_id) DO NOTHING;
        
        RAISE NOTICE 'Gonzalo asignado al caso % como assistant', sample_case_id;
    END IF;
END $$;

-- =============================================================================
-- 10. MENSAJE DE CONFIRMACIÓN
-- =============================================================================

SELECT 'Políticas RLS simples aplicadas correctamente - probando acceso por roles' as status;
