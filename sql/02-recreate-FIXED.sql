-- =============================================================================
-- 🚀 RECREACIÓN COMPLETA DEL BACKEND - VERSIÓN CORREGIDA SIN ERRORES
-- =============================================================================
-- Ejecutar DESPUÉS del script de eliminación

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🚀🚀🚀 INICIANDO RECREACIÓN COMPLETA DEL BACKEND 🚀🚀🚀';
    RAISE NOTICE '';
    RAISE NOTICE '✨ Creando estructura optimizada y moderna';
    RAISE NOTICE '✨ Incluye mejores prácticas de seguridad';
    RAISE NOTICE '✨ RLS policies sin recursión infinita';
    RAISE NOTICE '✨ Sistema de auditoría completo';
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- 1. CREAR TIPOS PERSONALIZADOS (ENUMS)
-- =============================================================================

-- Case status enum
CREATE TYPE case_status AS ENUM (
  'draft',        -- Borrador (nuevo)
  'active',
  'pending', 
  'on_hold',      -- En pausa (nuevo)
  'closed',
  'archived'
);

-- Task priority enum  
CREATE TYPE task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent',
  'critical'      -- Crítico (nuevo)
);

-- Task status enum
CREATE TYPE task_status AS ENUM (
  'pending',
  'in_progress', 
  'blocked',      -- Bloqueada (nuevo)
  'review',       -- En revisión (nuevo)
  'completed',
  'cancelled'
);

-- Document type enum
CREATE TYPE document_type AS ENUM (
  'contract',
  'brief',
  'evidence',
  'correspondence',
  'court_filing',
  'invoice',      -- Factura (nuevo)
  'receipt',      -- Recibo (nuevo)
  'report',       -- Reporte (nuevo)
  'other'
);

-- User role enum
CREATE TYPE user_role AS ENUM (
  'super_admin',  -- Super administrador (nuevo)
  'admin',
  'lawyer',
  'paralegal',    -- Paralegal (nuevo)
  'assistant',
  'intern',       -- Interno (nuevo)
  'client'        -- Cliente (nuevo)
);

-- Appointment status enum (nuevo)
CREATE TYPE appointment_status AS ENUM (
  'tentative',
  'confirmed',
  'rescheduled',
  'cancelled',
  'completed',
  'no_show'
);

DO $$
BEGIN
    RAISE NOTICE '📊 Tipos personalizados creados exitosamente';
END $$;

-- =============================================================================
-- 2. CREAR TABLAS PRINCIPALES
-- =============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'assistant',
  avatar_url TEXT,
  phone TEXT,
  department TEXT,            -- Departamento (nuevo)
  employee_id TEXT UNIQUE,    -- ID empleado (nuevo)
  hourly_rate DECIMAL(10,2),  -- Tarifa por hora (nuevo)
  is_active BOOLEAN DEFAULT true,  -- Estado activo (nuevo)
  last_login_at TIMESTAMPTZ,  -- Último login (nuevo)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ      -- Soft delete (nuevo)
);

-- Clients table
CREATE TABLE public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  company TEXT,
  tax_id TEXT,                -- RFC/NIT (nuevo)
  industry TEXT,              -- Industria (nuevo)
  website TEXT,               -- Sitio web (nuevo)
  notes TEXT,
  billing_address TEXT,       -- Dirección facturación (nuevo)
  contact_person TEXT,        -- Persona contacto (nuevo)
  is_active BOOLEAN DEFAULT true,  -- Estado activo (nuevo)
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ      -- Soft delete (nuevo)
);

-- Cases table
CREATE TABLE public.cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_number TEXT UNIQUE,    -- Número de caso (nuevo)
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  status case_status DEFAULT 'draft',
  priority task_priority DEFAULT 'medium',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  estimated_hours INTEGER,
  actual_hours DECIMAL(8,2) DEFAULT 0,  -- Horas reales (nuevo)
  hourly_rate DECIMAL(10,2),
  budget DECIMAL(12,2),       -- Presupuesto (nuevo)
  expenses DECIMAL(12,2) DEFAULT 0,  -- Gastos (nuevo)
  court_name TEXT,            -- Tribunal (nuevo)
  case_type TEXT,             -- Tipo de caso (nuevo)
  counterparty_name TEXT,
  counterparty_lawyer TEXT,
  is_billable BOOLEAN DEFAULT true,   -- Es facturable (nuevo)
  created_by UUID REFERENCES public.users(id) NOT NULL,
  assigned_lawyer UUID REFERENCES public.users(id),  -- Abogado asignado (nuevo)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ      -- Soft delete (nuevo)
);

-- Case members (who can access each case)
CREATE TABLE public.case_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member',
  can_edit BOOLEAN DEFAULT false,     -- Permisos de edición (nuevo)
  can_view_billing BOOLEAN DEFAULT false,  -- Ver facturación (nuevo)
  added_by UUID REFERENCES public.users(id),  -- Quién lo agregó (nuevo)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(case_id, user_id)
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_number TEXT UNIQUE,    -- Número de tarea (nuevo)
  title TEXT NOT NULL,
  description TEXT,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.users(id),
  status task_status DEFAULT 'pending',
  priority task_priority DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_hours DECIMAL(6,2),      -- Horas estimadas (nuevo)
  actual_hours DECIMAL(6,2) DEFAULT 0,  -- Horas reales (nuevo)
  completion_notes TEXT,             -- Notas de completado (nuevo)
  is_recurring BOOLEAN DEFAULT false,  -- Es recurrente (nuevo)
  parent_task_id UUID REFERENCES public.tasks(id),  -- Tarea padre (nuevo)
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ      -- Soft delete (nuevo)
);

-- Documents table
CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  document_type document_type DEFAULT 'other',
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,  -- Relacionar con tarea (nuevo)
  version INTEGER DEFAULT 1,         -- Versión (nuevo)
  is_template BOOLEAN DEFAULT false, -- Es plantilla (nuevo)
  is_signed BOOLEAN DEFAULT false,   -- Está firmado (nuevo)
  signature_date TIMESTAMPTZ,        -- Fecha de firma (nuevo)
  expiry_date DATE,                  -- Fecha expiración (nuevo)
  tags TEXT[],                       -- Etiquetas (nuevo)
  uploaded_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ      -- Soft delete (nuevo)
);

-- Notes table
CREATE TABLE public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  content TEXT NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,  -- Relacionar con tarea (nuevo)
  is_private BOOLEAN DEFAULT FALSE,
  is_important BOOLEAN DEFAULT FALSE, -- Es importante (nuevo)
  reminder_date TIMESTAMPTZ,          -- Fecha recordatorio (nuevo)
  tags TEXT[],                       -- Etiquetas (nuevo)
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,     -- Soft delete (nuevo)
  CONSTRAINT notes_reference_check CHECK (
    (case_id IS NOT NULL AND client_id IS NULL AND task_id IS NULL) OR 
    (case_id IS NULL AND client_id IS NOT NULL AND task_id IS NULL) OR
    (case_id IS NULL AND client_id IS NULL AND task_id IS NOT NULL)
  )
);

-- Time entries table (for billing)
CREATE TABLE public.time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,  -- Relacionar con tarea (nuevo)
  user_id UUID REFERENCES public.users(id) NOT NULL,
  description TEXT NOT NULL,
  hours DECIMAL(4,2) NOT NULL,
  rate DECIMAL(10,2),
  date DATE DEFAULT CURRENT_DATE,
  start_time TIMESTAMPTZ,             -- Hora inicio (nuevo)
  end_time TIMESTAMPTZ,               -- Hora fin (nuevo)
  break_time DECIMAL(4,2) DEFAULT 0,  -- Tiempo de descanso (nuevo)
  billable BOOLEAN DEFAULT TRUE,
  billed BOOLEAN DEFAULT FALSE,       -- Ya facturado (nuevo)
  invoice_id UUID,                    -- ID factura (nuevo)
  notes TEXT,                         -- Notas adicionales (nuevo)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ              -- Soft delete (nuevo)
);

-- Appointments table (mejorada)
CREATE TABLE public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.users(id) NOT NULL,
  status appointment_status DEFAULT 'tentative',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,                      -- Ubicación (nuevo)
  meeting_type TEXT DEFAULT 'in_person', -- Tipo reunión (nuevo)
  meeting_url TEXT,                   -- URL reunión virtual (nuevo)
  reminder_sent BOOLEAN DEFAULT FALSE, -- Recordatorio enviado (nuevo)
  notes TEXT,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,             -- Soft delete (nuevo)
  CONSTRAINT appointments_time_check CHECK (end_time > start_time)
);

-- Audit logs table (mejorada)
CREATE TABLE public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL,           -- INSERT, UPDATE, DELETE
  user_id UUID REFERENCES public.users(id),
  user_email TEXT,
  user_name TEXT,
  user_role TEXT,
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  ip_address INET,                   -- IP address (nuevo)
  user_agent TEXT,                   -- User agent (nuevo)
  session_id TEXT,                   -- Session ID (nuevo)
  data_hash TEXT,
  previous_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    RAISE NOTICE '📋 Todas las tablas creadas exitosamente';
END $$;

-- =============================================================================
-- 3. CREAR ÍNDICES OPTIMIZADOS
-- =============================================================================

-- Índices para users
CREATE INDEX idx_users_email ON public.users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON public.users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_active ON public.users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_employee_id ON public.users(employee_id) WHERE deleted_at IS NULL;

-- Índices para clients
CREATE INDEX idx_clients_name ON public.clients(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_email ON public.clients(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_active ON public.clients(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_created_by ON public.clients(created_by) WHERE deleted_at IS NULL;

-- Índices para cases
CREATE INDEX idx_cases_case_number ON public.cases(case_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_cases_status ON public.cases(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_cases_priority ON public.cases(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_cases_client_id ON public.cases(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cases_created_by ON public.cases(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_cases_assigned_lawyer ON public.cases(assigned_lawyer) WHERE deleted_at IS NULL;
CREATE INDEX idx_cases_dates ON public.cases(start_date, end_date) WHERE deleted_at IS NULL;

-- Índices para case_members
CREATE INDEX idx_case_members_case_id ON public.case_members(case_id);
CREATE INDEX idx_case_members_user_id ON public.case_members(user_id);
CREATE UNIQUE INDEX idx_case_members_unique ON public.case_members(case_id, user_id);

-- Índices para tasks
CREATE INDEX idx_tasks_case_id ON public.tasks(case_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status ON public.tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_priority ON public.tasks(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_parent ON public.tasks(parent_task_id) WHERE deleted_at IS NULL;

-- Índices para documents
CREATE INDEX idx_documents_case_id ON public.documents(case_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_task_id ON public.documents(task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_type ON public.documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_uploaded_by ON public.documents(uploaded_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_tags ON public.documents USING GIN(tags) WHERE deleted_at IS NULL;

-- Índices para notes
CREATE INDEX idx_notes_case_id ON public.notes(case_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_client_id ON public.notes(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_task_id ON public.notes(task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_created_by ON public.notes(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_important ON public.notes(is_important) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_tags ON public.notes USING GIN(tags) WHERE deleted_at IS NULL;

-- Índices para time_entries
CREATE INDEX idx_time_entries_case_id ON public.time_entries(case_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_time_entries_task_id ON public.time_entries(task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_time_entries_date ON public.time_entries(date) WHERE deleted_at IS NULL;
CREATE INDEX idx_time_entries_billable ON public.time_entries(billable) WHERE deleted_at IS NULL;
CREATE INDEX idx_time_entries_billed ON public.time_entries(billed) WHERE deleted_at IS NULL;

-- Índices para appointments
CREATE INDEX idx_appointments_client_id ON public.appointments(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_case_id ON public.appointments(case_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_assigned_to ON public.appointments(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_status ON public.appointments(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_time ON public.appointments(start_time, end_time) WHERE deleted_at IS NULL;

-- Índices para audit_logs
CREATE INDEX idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_operation ON public.audit_logs(operation);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

DO $$
BEGIN
    RAISE NOTICE '📊 Todos los índices creados exitosamente';
    RAISE NOTICE '';
    RAISE NOTICE '✅ RECREACIÓN PARTE 1 COMPLETADA';
    RAISE NOTICE '🚀 Continúa con: 03-functions-triggers-rls.sql';
    RAISE NOTICE '';
END $$;
