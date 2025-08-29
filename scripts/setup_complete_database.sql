-- =====================================================
-- SISTEMA DE GESTIÓN JURÍDICA - CONFIGURACIÓN COMPLETA
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABLA DE ORGANIZACIONES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABLA DE PERFILES DE USUARIO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'abogado' CHECK (role IN ('admin', 'abogado', 'asistente')),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TABLA DE CLIENTES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    client_type VARCHAR(20) DEFAULT 'individual' CHECK (client_type IN ('individual', 'company')),
    tax_id VARCHAR(50),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TABLA DE ASUNTOS/CASOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.matters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    matter_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'closed', 'archived')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_lawyer UUID REFERENCES public.profiles(id),
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. TABLA DE TAREAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES public.profiles(id),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. TABLA DE EVENTOS/CALENDARIO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    matter_id UUID REFERENCES public.matters(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'hearing', 'deadline', 'appointment', 'reminder')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    attendees TEXT[],
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. TABLA DE DOCUMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500),
    file_size INTEGER,
    file_type VARCHAR(100),
    document_type VARCHAR(100),
    tags TEXT[],
    is_confidential BOOLEAN DEFAULT false,
    uploaded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. TABLA DE NOTAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    title VARCHAR(255),
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general' CHECK (note_type IN ('general', 'meeting', 'call', 'research', 'strategy')),
    is_private BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- POLÍTICAS DE SEGURIDAD (RLS)
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
CREATE POLICY "Users can view their organization" ON public.organizations
    FOR SELECT USING (id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Políticas para profiles
CREATE POLICY "Users can view profiles in their organization" ON public.profiles
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- Políticas para clients
CREATE POLICY "Users can view clients in their organization" ON public.clients
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert clients in their organization" ON public.clients
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update clients in their organization" ON public.clients
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Políticas para matters
CREATE POLICY "Users can view matters in their organization" ON public.matters
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert matters in their organization" ON public.matters
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update matters in their organization" ON public.matters
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Políticas para tasks
CREATE POLICY "Users can view tasks in their organization" ON public.tasks
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert tasks in their organization" ON public.tasks
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update tasks in their organization" ON public.tasks
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Políticas para events
CREATE POLICY "Users can view events in their organization" ON public.events
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert events in their organization" ON public.events
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update events in their organization" ON public.events
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Políticas para documents
CREATE POLICY "Users can view documents in their organization" ON public.documents
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert documents in their organization" ON public.documents
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update documents in their organization" ON public.documents
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Políticas para notes
CREATE POLICY "Users can view notes in their organization" ON public.notes
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert notes in their organization" ON public.notes
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update notes in their organization" ON public.notes
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    ));

-- =====================================================
-- TRIGGERS Y FUNCIONES
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.matters FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- DATOS DE PRUEBA
-- =====================================================

-- Insertar organización demo
INSERT INTO public.organizations (id, name, email, phone, address) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Estudio Jurídico Demo', 'contacto@estudiodemo.com', '+34 91 123 4567', 'Calle Gran Vía 123, Madrid, España')
ON CONFLICT (id) DO NOTHING;

-- Insertar usuarios demo (estos se crearán cuando los usuarios se registren)
-- Pero podemos insertar los perfiles directamente para testing
INSERT INTO public.profiles (id, organization_id, email, full_name, role, phone) VALUES
('11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'admin@estudiodemo.com', 'Administrador Demo', 'admin', '+34 91 111 1111'),
('22222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', 'abogado@estudiodemo.com', 'Juan Carlos Abogado', 'abogado', '+34 91 222 2222'),
('33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', 'asistente@estudiodemo.com', 'María Asistente', 'asistente', '+34 91 333 3333')
ON CONFLICT (id) DO NOTHING;

-- Insertar clientes demo
INSERT INTO public.clients (id, organization_id, name, email, phone, address, client_type, tax_id, notes, created_by) VALUES
('c1111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'Juan Pérez García', 'juan.perez@email.com', '+34 91 555 0001', 'Calle Mayor 45, Madrid', 'individual', '12345678A', 'Cliente desde 2020', '11111111-1111-1111-1111-111111111111'),
('c2222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', 'María García López', 'maria.garcia@email.com', '+34 91 555 0002', 'Avenida Libertad 78, Barcelona', 'individual', '87654321B', 'Caso de divorcio', '22222222-2222-2222-2222-222222222222'),
('c3333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', 'Empresa ABC S.A.', 'contacto@empresaabc.com', '+34 91 555 0003', 'Polígono Industrial Norte, Valencia', 'company', 'A12345678', 'Empresa de construcción', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Insertar asuntos demo
INSERT INTO public.matters (id, organization_id, client_id, title, description, matter_type, status, priority, assigned_lawyer, start_date, created_by) VALUES
('m1111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'c1111111-1111-1111-1111-111111111111', 'Divorcio Contencioso', 'Proceso de divorcio con disputa sobre custodia de menores', 'Derecho de Familia', 'active', 'high', '22222222-2222-2222-2222-222222222222', '2024-01-15', '11111111-1111-1111-1111-111111111111'),
('m2222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', 'c2222222-2222-2222-2222-222222222222', 'Demanda Laboral', 'Despido improcedente y reclamación de indemnización', 'Derecho Laboral', 'active', 'medium', '22222222-2222-2222-2222-222222222222', '2024-02-01', '11111111-1111-1111-1111-111111111111'),
('m3333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', 'c3333333-3333-3333-3333-333333333333', 'Contrato de Construcción', 'Revisión y negociación de contrato de obra pública', 'Derecho Mercantil', 'pending', 'low', '22222222-2222-2222-2222-222222222222', '2024-03-01', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Insertar tareas demo
INSERT INTO public.tasks (id, organization_id, matter_id, title, description, status, priority, assigned_to, due_date, created_by) VALUES
('t1111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'm1111111-1111-1111-1111-111111111111', 'Preparar documentación inicial', 'Recopilar certificados de matrimonio y documentos de los menores', 'completed', 'high', '33333333-3333-3333-3333-333333333333', '2024-01-20 10:00:00+00', '22222222-2222-2222-2222-222222222222'),
('t2222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', 'm1111111-1111-1111-1111-111111111111', 'Citar a mediación familiar', 'Contactar con el servicio de mediación del juzgado', 'in_progress', 'medium', '22222222-2222-2222-2222-222222222222', '2024-12-30 15:00:00+00', '22222222-2222-2222-2222-222222222222'),
('t3333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', 'm2222222-2222-2222-2222-222222222222', 'Revisar contrato de trabajo', 'Analizar cláusulas del contrato para determinar procedencia del despido', 'pending', 'high', '22222222-2222-2222-2222-222222222222', '2024-12-28 12:00:00+00', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Insertar eventos demo
INSERT INTO public.events (id, organization_id, matter_id, client_id, title, description, event_type, start_time, end_time, location, created_by) VALUES
('e1111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'm1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Vista de Divorcio', 'Primera vista en el Juzgado de Familia nº 3', 'hearing', '2024-12-30 09:30:00+00', '2024-12-30 11:00:00+00', 'Juzgado de Familia nº 3, Madrid', '22222222-2222-2222-2222-222222222222'),
('e2222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', 'm2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Reunión con cliente', 'Revisión del caso y preparación de estrategia', 'meeting', '2024-12-27 16:00:00+00', '2024-12-27 17:00:00+00', 'Oficina - Sala de Reuniones', '22222222-2222-2222-2222-222222222222'),
('e3333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', NULL, NULL, 'Formación Jurídica', 'Seminario sobre nuevas reformas laborales', 'appointment', '2024-12-29 10:00:00+00', '2024-12-29 13:00:00+00', 'Colegio de Abogados', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Insertar documentos demo
INSERT INTO public.documents (id, organization_id, matter_id, client_id, name, description, file_path, file_size, file_type, document_type, tags, is_confidential, uploaded_by) VALUES
('d1111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'm1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Certificado de Matrimonio', 'Certificado literal de matrimonio expedido por el Registro Civil', '/documents/certificado_matrimonio_juan_perez.pdf', 245760, 'application/pdf', 'Certificado', ARRAY['matrimonio', 'registro civil'], true, '33333333-3333-3333-3333-333333333333'),
('d2222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', 'm2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Contrato de Trabajo', 'Contrato de trabajo original firmado por ambas partes', '/documents/contrato_trabajo_maria_garcia.pdf', 512000, 'application/pdf', 'Contrato', ARRAY['laboral', 'contrato'], true, '22222222-2222-2222-2222-222222222222'),
('d3333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', 'm3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'Pliego de Condiciones', 'Pliego técnico de condiciones para la obra pública', '/documents/pliego_condiciones_empresa_abc.pdf', 1048576, 'application/pdf', 'Pliego', ARRAY['construcción', 'obra pública'], false, '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Insertar notas demo
INSERT INTO public.notes (id, organization_id, matter_id, client_id, title, content, note_type, is_private, created_by) VALUES
('n1111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'm1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Primera entrevista con el cliente', 'El cliente manifiesta su deseo de obtener la custodia compartida de los menores. Existe buena relación con los hijos. La cónyuge se opone inicialmente pero podría negociar.', 'meeting', false, '22222222-2222-2222-2222-222222222222'),
('n2222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', 'm2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Análisis del despido', 'El despido no siguió el procedimiento correcto. No se realizó comunicación previa ni se dió oportunidad de defensa. Caso sólido para improcedencia.', 'research', true, '22222222-2222-2222-2222-222222222222'),
('n3333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', 'm3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'Estrategia de negociación', 'Proponer modificaciones en las cláusulas de penalización por retraso. El cliente está dispuesto a aceptar un 15% de reducción en el margen si se mejoran los plazos.', 'strategy', false, '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_matters_organization_id ON public.matters(organization_id);
CREATE INDEX IF NOT EXISTS idx_matters_client_id ON public.matters(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_matter_id ON public.tasks(matter_id);
CREATE INDEX IF NOT EXISTS idx_events_organization_id ON public.events(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON public.documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_notes_organization_id ON public.notes(organization_id);

-- =====================================================
-- CONFIGURACIÓN COMPLETADA
-- =====================================================
-- El sistema está listo para usar con las credenciales:
-- Email: admin@estudiodemo.com
-- Password: admin123456 (configurar en Supabase Auth)
