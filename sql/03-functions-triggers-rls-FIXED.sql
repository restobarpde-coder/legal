-- =============================================================================
-- 🚀 RECREACIÓN COMPLETA DEL BACKEND - PARTE 2: FUNCIONES, TRIGGERS Y RLS
-- =============================================================================
-- Ejecutar DESPUÉS de 02-recreate-FIXED.sql

-- =============================================================================
-- 4. CREAR FUNCIONES UTILITARIAS Y HELPER
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 Creando funciones utilitarias...';
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get user role (safe version - no recursion)
CREATE OR REPLACE FUNCTION get_user_role_safe(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN 'assistant';
    END IF;
    
    SELECT role INTO user_role
    FROM public.users 
    WHERE id = p_user_id AND deleted_at IS NULL;
    
    RETURN COALESCE(user_role::text, 'assistant');
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'assistant';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check case membership (safe version - no recursion)
CREATE OR REPLACE FUNCTION is_case_member_safe(p_case_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_case_id IS NULL OR p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN EXISTS (
        SELECT 1
        FROM public.case_members
        WHERE case_id = p_case_id 
        AND user_id = p_user_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically add case creator as member
CREATE OR REPLACE FUNCTION add_case_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.case_members (case_id, user_id, role, can_edit, can_view_billing, added_by)
    VALUES (NEW.id, NEW.created_by, 'owner', true, true, NEW.created_by)
    ON CONFLICT (case_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate case number
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
DECLARE
    year_suffix TEXT;
    case_count INTEGER;
    new_number TEXT;
BEGIN
    IF NEW.case_number IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    year_suffix := EXTRACT(YEAR FROM NOW())::TEXT;
    
    SELECT COUNT(*) + 1 INTO case_count
    FROM public.cases 
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
    AND deleted_at IS NULL;
    
    new_number := 'CASE-' || year_suffix || '-' || LPAD(case_count::TEXT, 4, '0');
    NEW.case_number := new_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate task number
CREATE OR REPLACE FUNCTION generate_task_number()
RETURNS TRIGGER AS $$
DECLARE
    case_prefix TEXT;
    task_count INTEGER;
    new_number TEXT;
BEGIN
    IF NEW.task_number IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    IF NEW.case_id IS NOT NULL THEN
        SELECT case_number INTO case_prefix
        FROM public.cases 
        WHERE id = NEW.case_id AND deleted_at IS NULL;
        
        SELECT COUNT(*) + 1 INTO task_count
        FROM public.tasks 
        WHERE case_id = NEW.case_id AND deleted_at IS NULL;
        
        new_number := case_prefix || '-T' || LPAD(task_count::TEXT, 3, '0');
    ELSE
        SELECT COUNT(*) + 1 INTO task_count
        FROM public.tasks 
        WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
        AND case_id IS NULL AND deleted_at IS NULL;
        
        new_number := 'TASK-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(task_count::TEXT, 4, '0');
    END IF;
    
    NEW.task_number := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Advanced audit function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[] := ARRAY[]::TEXT[];
    field_name TEXT;
    user_info RECORD;
BEGIN
    -- Get user information
    SELECT email, full_name, role::text INTO user_info
    FROM public.users 
    WHERE id = auth.uid() AND deleted_at IS NULL;
    
    -- Prepare data based on operation
    CASE TG_OP
        WHEN 'DELETE' THEN
            old_data := to_jsonb(OLD);
            new_data := NULL;
        WHEN 'INSERT' THEN
            old_data := NULL;
            new_data := to_jsonb(NEW);
        WHEN 'UPDATE' THEN
            old_data := to_jsonb(OLD);
            new_data := to_jsonb(NEW);
            
            -- Find changed fields
            FOR field_name IN SELECT key FROM jsonb_each(old_data) LOOP
                IF old_data->>field_name IS DISTINCT FROM new_data->>field_name THEN
                    changed_fields := array_append(changed_fields, field_name);
                END IF;
            END LOOP;
    END CASE;
    
    -- Insert audit record
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        operation,
        user_id,
        user_email,
        user_name,
        user_role,
        old_data,
        new_data,
        changed_fields,
        ip_address,
        session_id
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        auth.uid(),
        user_info.email,
        user_info.full_name,
        user_info.role,
        old_data,
        new_data,
        changed_fields,
        inet_client_addr(),
        current_setting('application_name', true)
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate actual hours for cases
CREATE OR REPLACE FUNCTION update_case_actual_hours()
RETURNS TRIGGER AS $$
DECLARE
    total_hours DECIMAL(8,2);
BEGIN
    SELECT COALESCE(SUM(hours), 0) INTO total_hours
    FROM public.time_entries 
    WHERE case_id = COALESCE(NEW.case_id, OLD.case_id)
    AND deleted_at IS NULL;
    
    UPDATE public.cases 
    SET actual_hours = total_hours
    WHERE id = COALESCE(NEW.case_id, OLD.case_id)
    AND deleted_at IS NULL;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update task actual hours
CREATE OR REPLACE FUNCTION update_task_actual_hours()
RETURNS TRIGGER AS $$
DECLARE
    total_hours DECIMAL(6,2);
BEGIN
    SELECT COALESCE(SUM(hours), 0) INTO total_hours
    FROM public.time_entries 
    WHERE task_id = COALESCE(NEW.task_id, OLD.task_id)
    AND deleted_at IS NULL;
    
    UPDATE public.tasks 
    SET actual_hours = total_hours
    WHERE id = COALESCE(NEW.task_id, OLD.task_id)
    AND deleted_at IS NULL;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    RAISE NOTICE '   ✅ Funciones utilitarias creadas';
END $$;

-- =============================================================================
-- 5. CREAR TODOS LOS TRIGGERS
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '⚡ Creando triggers...';
END $$;

-- Triggers for updated_at timestamp on all main tables
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON public.clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at 
    BEFORE UPDATE ON public.cases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON public.tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON public.documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at 
    BEFORE UPDATE ON public.notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at 
    BEFORE UPDATE ON public.time_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON public.appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Case number generation trigger
CREATE TRIGGER generate_case_number_trigger
    BEFORE INSERT ON public.cases
    FOR EACH ROW EXECUTE FUNCTION generate_case_number();

-- Task number generation trigger  
CREATE TRIGGER generate_task_number_trigger
    BEFORE INSERT ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION generate_task_number();

-- Case member auto-addition trigger
CREATE TRIGGER add_case_creator_as_member_trigger
    AFTER INSERT ON public.cases
    FOR EACH ROW EXECUTE FUNCTION add_case_creator_as_member();

-- Audit triggers for all main tables
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_clients_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_cases_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.cases
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_tasks_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_documents_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_notes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.notes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_time_entries_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.time_entries
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_appointments_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Hours calculation triggers
CREATE TRIGGER update_case_hours_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.time_entries
    FOR EACH ROW EXECUTE FUNCTION update_case_actual_hours();

CREATE TRIGGER update_task_hours_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.time_entries
    FOR EACH ROW EXECUTE FUNCTION update_task_actual_hours();

DO $$
BEGIN
    RAISE NOTICE '   ✅ Todos los triggers creados';
END $$;

-- =============================================================================
-- 6. HABILITAR RLS EN TODAS LAS TABLAS
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '🛡️ Habilitando Row Level Security...';
END $$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
-- audit_logs no tiene RLS para preservar integridad

DO $$
BEGIN
    RAISE NOTICE '   ✅ RLS habilitado en todas las tablas principales';
END $$;

-- =============================================================================
-- 7. CREAR POLÍTICAS RLS OPTIMIZADAS (SIN RECURSIÓN)
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔒 Creando políticas RLS optimizadas...';
END $$;

-- USERS - Solo pueden ver/editar sus propios datos o ser vistos por miembros del mismo caso
CREATE POLICY "users_select_policy" ON public.users
    FOR SELECT 
    USING (
        auth.uid() = id OR
        get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer')
    );

CREATE POLICY "users_update_policy" ON public.users
    FOR UPDATE 
    USING (
        auth.uid() = id OR
        get_user_role_safe(auth.uid()) IN ('super_admin', 'admin')
    );

-- CLIENTS - Basado en roles y creación
CREATE POLICY "clients_select_policy" ON public.clients
    FOR SELECT 
    USING (
        deleted_at IS NULL AND (
            get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer') OR
            created_by = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.cases c 
                JOIN public.case_members cm ON c.id = cm.case_id
                WHERE c.client_id = clients.id 
                AND cm.user_id = auth.uid()
                AND c.deleted_at IS NULL
            )
        )
    );

CREATE POLICY "clients_insert_policy" ON public.clients
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        created_by = auth.uid()
    );

CREATE POLICY "clients_update_policy" ON public.clients
    FOR UPDATE 
    USING (
        deleted_at IS NULL AND (
            get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer') OR
            created_by = auth.uid()
        )
    );

CREATE POLICY "clients_delete_policy" ON public.clients
    FOR DELETE 
    USING (
        get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer') OR
        created_by = auth.uid()
    );

-- CASES - Políticas basadas en rol y membresía
CREATE POLICY "cases_select_policy" ON public.cases
    FOR SELECT
    USING (
        deleted_at IS NULL AND 
        CASE 
            WHEN auth.uid() IS NULL THEN FALSE
            WHEN get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer') THEN TRUE
            WHEN created_by = auth.uid() THEN TRUE
            WHEN assigned_lawyer = auth.uid() THEN TRUE
            ELSE EXISTS (
                SELECT 1 FROM public.case_members 
                WHERE case_id = cases.id AND user_id = auth.uid()
            )
        END
    );

CREATE POLICY "cases_insert_policy" ON public.cases
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        created_by = auth.uid()
    );

CREATE POLICY "cases_update_policy" ON public.cases
    FOR UPDATE
    USING (
        deleted_at IS NULL AND (
            get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer') OR
            created_by = auth.uid() OR
            assigned_lawyer = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.case_members 
                WHERE case_id = cases.id 
                AND user_id = auth.uid() 
                AND can_edit = true
            )
        )
    );

CREATE POLICY "cases_delete_policy" ON public.cases
    FOR DELETE
    USING (
        get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer') OR
        created_by = auth.uid()
    );

-- CASE MEMBERS - Control de membresías
CREATE POLICY "case_members_select_policy" ON public.case_members
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer') OR
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE id = case_members.case_id 
            AND (created_by = auth.uid() OR assigned_lawyer = auth.uid())
            AND deleted_at IS NULL
        )
    );

CREATE POLICY "case_members_insert_policy" ON public.case_members
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer') OR
            EXISTS (
                SELECT 1 FROM public.cases 
                WHERE id = case_members.case_id 
                AND (created_by = auth.uid() OR assigned_lawyer = auth.uid())
                AND deleted_at IS NULL
            )
        )
    );

CREATE POLICY "case_members_delete_policy" ON public.case_members
    FOR DELETE
    USING (
        user_id = auth.uid() OR
        get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer') OR
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE id = case_members.case_id 
            AND (created_by = auth.uid() OR assigned_lawyer = auth.uid())
            AND deleted_at IS NULL
        )
    );

-- TASKS - Acceso basado en caso, asignación y creación
CREATE POLICY "tasks_policy" ON public.tasks
    FOR ALL
    USING (
        deleted_at IS NULL AND (
            get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer') OR
            created_by = auth.uid() OR
            assigned_to = auth.uid() OR
            (case_id IS NOT NULL AND is_case_member_safe(case_id, auth.uid()))
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            created_by = auth.uid() OR
            get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer')
        )
    );

-- DOCUMENTS - Acceso basado en caso y subida
CREATE POLICY "documents_policy" ON public.documents
    FOR ALL
    USING (
        deleted_at IS NULL AND (
            get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer') OR
            uploaded_by = auth.uid() OR
            (case_id IS NOT NULL AND is_case_member_safe(case_id, auth.uid()))
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            uploaded_by = auth.uid() OR
            get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer')
        )
    );

-- NOTES - Acceso basado en caso, privacidad y creación
CREATE POLICY "notes_policy" ON public.notes
    FOR ALL
    USING (
        deleted_at IS NULL AND (
            get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer') OR
            (created_by = auth.uid()) OR
            (case_id IS NOT NULL AND is_private = false AND is_case_member_safe(case_id, auth.uid())) OR
            (client_id IS NOT NULL AND is_private = false) OR
            (task_id IS NOT NULL AND is_private = false)
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            created_by = auth.uid() OR
            get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer')
        )
    );

-- TIME ENTRIES - Acceso basado en caso y usuario
CREATE POLICY "time_entries_policy" ON public.time_entries
    FOR ALL
    USING (
        deleted_at IS NULL AND (
            get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer') OR
            user_id = auth.uid() OR
            is_case_member_safe(case_id, auth.uid())
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            user_id = auth.uid() OR
            get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer')
        )
    );

-- APPOINTMENTS - Acceso basado en asignación y caso
CREATE POLICY "appointments_policy" ON public.appointments
    FOR ALL
    USING (
        deleted_at IS NULL AND (
            get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer') OR
            assigned_to = auth.uid() OR
            created_by = auth.uid() OR
            (case_id IS NOT NULL AND is_case_member_safe(case_id, auth.uid()))
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            created_by = auth.uid() OR
            get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer')
        )
    );

DO $$
BEGIN
    RAISE NOTICE '   ✅ Todas las políticas RLS creadas exitosamente';
    RAISE NOTICE '';
    RAISE NOTICE '✅ RECREACIÓN PARTE 2 COMPLETADA';
    RAISE NOTICE '🚀 Continúa con: 04-storage-and-validation.sql';
    RAISE NOTICE '';
END $$;
