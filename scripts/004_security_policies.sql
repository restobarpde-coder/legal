-- =====================================================
-- POLÍTICAS DE SEGURIDAD - PASO 4
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Políticas para organizations
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
CREATE POLICY "Users can view their organization" ON public.organizations
    FOR SELECT USING (id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Políticas para profiles
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
CREATE POLICY "Users can view profiles in their organization" ON public.profiles
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- Políticas para clients
DROP POLICY IF EXISTS "Users can view clients in their organization" ON public.clients;
CREATE POLICY "Users can view clients in their organization" ON public.clients
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert clients in their organization" ON public.clients;
CREATE POLICY "Users can insert clients in their organization" ON public.clients
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can update clients in their organization" ON public.clients;
CREATE POLICY "Users can update clients in their organization" ON public.clients
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Políticas similares para el resto de tablas...
-- (Continúa con matters, tasks, events, documents, notes)
