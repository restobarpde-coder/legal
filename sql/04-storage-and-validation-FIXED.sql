-- =============================================================================
-- 🚀 RECREACIÓN COMPLETA DEL BACKEND - PARTE 3: STORAGE Y VALIDACIÓN FINAL
-- =============================================================================
-- Ejecutar DESPUÉS de 03-functions-triggers-rls-FIXED.sql

-- =============================================================================
-- 8. CONFIGURAR STORAGE BUCKETS Y POLÍTICAS
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '🗄️ Configurando Storage Buckets...';
END $$;

-- Crear bucket principal para documentos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    52428800,  -- 50MB limit
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/zip',
        'application/x-zip-compressed'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/zip',
        'application/x-zip-compressed'
    ];

-- Crear bucket para avatars de usuarios
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880,   -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Crear bucket para templates de documentos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'templates',
    'templates',
    false,
    10485760,  -- 10MB limit
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];

DO $$
BEGIN
    RAISE NOTICE '   ✅ Storage buckets configurados: documents, avatars, templates';
END $$;

-- =============================================================================
-- 9. CREAR POLÍTICAS DE STORAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔒 Creando políticas de Storage...';
END $$;

-- Políticas para bucket 'documents'
CREATE POLICY "documents_storage_insert" ON storage.objects
    FOR INSERT TO authenticated 
    WITH CHECK (
        bucket_id = 'documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "documents_storage_select" ON storage.objects
    FOR SELECT TO authenticated 
    USING (
        bucket_id = 'documents' AND (
            auth.uid()::text = (storage.foldername(name))[1] OR
            get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer')
        )
    );

CREATE POLICY "documents_storage_update" ON storage.objects
    FOR UPDATE TO authenticated 
    USING (
        bucket_id = 'documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "documents_storage_delete" ON storage.objects
    FOR DELETE TO authenticated 
    USING (
        bucket_id = 'documents' AND (
            auth.uid()::text = (storage.foldername(name))[1] OR
            get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer')
        )
    );

-- Políticas para bucket 'avatars' (público)
CREATE POLICY "avatars_storage_insert" ON storage.objects
    FOR INSERT TO authenticated 
    WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "avatars_storage_select" ON storage.objects
    FOR SELECT 
    USING (bucket_id = 'avatars');

CREATE POLICY "avatars_storage_update" ON storage.objects
    FOR UPDATE TO authenticated 
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "avatars_storage_delete" ON storage.objects
    FOR DELETE TO authenticated 
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Políticas para bucket 'templates'
CREATE POLICY "templates_storage_insert" ON storage.objects
    FOR INSERT TO authenticated 
    WITH CHECK (
        bucket_id = 'templates' AND
        get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer')
    );

CREATE POLICY "templates_storage_select" ON storage.objects
    FOR SELECT TO authenticated 
    USING (bucket_id = 'templates');

CREATE POLICY "templates_storage_update" ON storage.objects
    FOR UPDATE TO authenticated 
    USING (
        bucket_id = 'templates' AND
        get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer')
    );

CREATE POLICY "templates_storage_delete" ON storage.objects
    FOR DELETE TO authenticated 
    USING (
        bucket_id = 'templates' AND
        get_user_role_safe(auth.uid()) IN ('super_admin', 'admin', 'lawyer')
    );

DO $$
BEGIN
    RAISE NOTICE '   ✅ Políticas de Storage creadas para todos los buckets';
END $$;

-- =============================================================================
-- 10. CREAR VISTAS ÚTILES
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '👁️ Creando vistas útiles...';
END $$;

-- Vista para casos con información del cliente
CREATE OR REPLACE VIEW case_summary AS
SELECT 
    c.id,
    c.case_number,
    c.title,
    c.description,
    c.status,
    c.priority,
    c.start_date,
    c.end_date,
    c.estimated_hours,
    c.actual_hours,
    c.budget,
    c.expenses,
    c.is_billable,
    cl.name as client_name,
    cl.email as client_email,
    cl.company as client_company,
    u.full_name as created_by_name,
    al.full_name as assigned_lawyer_name,
    c.created_at,
    c.updated_at,
    (
        SELECT COUNT(*)::integer 
        FROM public.tasks t 
        WHERE t.case_id = c.id AND t.deleted_at IS NULL
    ) as total_tasks,
    (
        SELECT COUNT(*)::integer 
        FROM public.tasks t 
        WHERE t.case_id = c.id AND t.status = 'completed' AND t.deleted_at IS NULL
    ) as completed_tasks,
    (
        SELECT COUNT(*)::integer 
        FROM public.documents d 
        WHERE d.case_id = c.id AND d.deleted_at IS NULL
    ) as total_documents
FROM public.cases c
LEFT JOIN public.clients cl ON c.client_id = cl.id
LEFT JOIN public.users u ON c.created_by = u.id
LEFT JOIN public.users al ON c.assigned_lawyer = al.id
WHERE c.deleted_at IS NULL;

-- Vista para estadísticas de usuarios
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.department,
    u.is_active,
    (
        SELECT COUNT(*)::integer 
        FROM public.cases c 
        WHERE c.created_by = u.id AND c.deleted_at IS NULL
    ) as cases_created,
    (
        SELECT COUNT(*)::integer 
        FROM public.cases c 
        WHERE c.assigned_lawyer = u.id AND c.deleted_at IS NULL
    ) as cases_assigned,
    (
        SELECT COUNT(*)::integer 
        FROM public.tasks t 
        WHERE t.assigned_to = u.id AND t.deleted_at IS NULL
    ) as tasks_assigned,
    (
        SELECT COUNT(*)::integer 
        FROM public.tasks t 
        WHERE t.assigned_to = u.id AND t.status = 'completed' AND t.deleted_at IS NULL
    ) as tasks_completed,
    (
        SELECT COALESCE(SUM(te.hours), 0) 
        FROM public.time_entries te 
        WHERE te.user_id = u.id AND te.deleted_at IS NULL
        AND te.date >= CURRENT_DATE - INTERVAL '30 days'
    ) as hours_last_30_days,
    u.created_at,
    u.last_login_at
FROM public.users u
WHERE u.deleted_at IS NULL;

DO $$
BEGIN
    RAISE NOTICE '   ✅ Vistas creadas: case_summary, user_statistics';
END $$;

-- =============================================================================
-- 11. FUNCIONES UTILITARIAS ADICIONALES
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 Creando funciones utilitarias adicionales...';
END $$;

-- Función para obtener casos accesibles por usuario
CREATE OR REPLACE FUNCTION get_user_accessible_cases(user_uuid UUID)
RETURNS TABLE (
    case_id UUID,
    case_number TEXT,
    title TEXT,
    client_name TEXT,
    status case_status,
    priority task_priority,
    can_edit BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.case_number,
        c.title,
        cl.name,
        c.status,
        c.priority,
        CASE 
            WHEN get_user_role_safe(user_uuid) IN ('super_admin', 'admin', 'lawyer') THEN true
            WHEN c.created_by = user_uuid OR c.assigned_lawyer = user_uuid THEN true
            WHEN cm.can_edit = true THEN true
            ELSE false
        END as can_edit
    FROM public.cases c
    LEFT JOIN public.clients cl ON c.client_id = cl.id
    LEFT JOIN public.case_members cm ON c.id = cm.case_id AND cm.user_id = user_uuid
    WHERE c.deleted_at IS NULL
    AND (
        get_user_role_safe(user_uuid) IN ('super_admin', 'admin', 'lawyer') OR
        c.created_by = user_uuid OR
        c.assigned_lawyer = user_uuid OR
        cm.user_id = user_uuid
    )
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas del dashboard
CREATE OR REPLACE FUNCTION get_dashboard_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    user_role_val TEXT;
BEGIN
    user_role_val := get_user_role_safe(user_uuid);
    
    SELECT json_build_object(
        'total_cases', (
            CASE 
                WHEN user_role_val IN ('super_admin', 'admin', 'lawyer') THEN
                    (SELECT COUNT(*) FROM public.cases WHERE deleted_at IS NULL)
                ELSE
                    (SELECT COUNT(*) FROM public.cases c
                     LEFT JOIN public.case_members cm ON c.id = cm.case_id
                     WHERE c.deleted_at IS NULL
                     AND (c.created_by = user_uuid OR c.assigned_lawyer = user_uuid OR cm.user_id = user_uuid))
            END
        ),
        'active_cases', (
            CASE 
                WHEN user_role_val IN ('super_admin', 'admin', 'lawyer') THEN
                    (SELECT COUNT(*) FROM public.cases WHERE status = 'active' AND deleted_at IS NULL)
                ELSE
                    (SELECT COUNT(*) FROM public.cases c
                     LEFT JOIN public.case_members cm ON c.id = cm.case_id
                     WHERE c.status = 'active' AND c.deleted_at IS NULL
                     AND (c.created_by = user_uuid OR c.assigned_lawyer = user_uuid OR cm.user_id = user_uuid))
            END
        ),
        'pending_tasks', (
            SELECT COUNT(*) FROM public.tasks t
            LEFT JOIN public.case_members cm ON t.case_id = cm.case_id
            WHERE t.status IN ('pending', 'in_progress') 
            AND t.deleted_at IS NULL
            AND (
                user_role_val IN ('super_admin', 'admin', 'lawyer') OR
                t.assigned_to = user_uuid OR
                t.created_by = user_uuid OR
                cm.user_id = user_uuid
            )
        ),
        'overdue_tasks', (
            SELECT COUNT(*) FROM public.tasks t
            LEFT JOIN public.case_members cm ON t.case_id = cm.case_id
            WHERE t.due_date < NOW() 
            AND t.status NOT IN ('completed', 'cancelled')
            AND t.deleted_at IS NULL
            AND (
                user_role_val IN ('super_admin', 'admin', 'lawyer') OR
                t.assigned_to = user_uuid OR
                t.created_by = user_uuid OR
                cm.user_id = user_uuid
            )
        ),
        'total_clients', (
            CASE 
                WHEN user_role_val IN ('super_admin', 'admin', 'lawyer') THEN
                    (SELECT COUNT(*) FROM public.clients WHERE deleted_at IS NULL)
                ELSE
                    (SELECT COUNT(DISTINCT c.client_id) FROM public.cases c
                     LEFT JOIN public.case_members cm ON c.id = cm.case_id
                     WHERE c.deleted_at IS NULL
                     AND (c.created_by = user_uuid OR c.assigned_lawyer = user_uuid OR cm.user_id = user_uuid))
            END
        ),
        'hours_this_month', (
            SELECT COALESCE(SUM(hours), 0) FROM public.time_entries
            WHERE user_id = user_uuid 
            AND deleted_at IS NULL
            AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
            AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    RAISE NOTICE '   ✅ Funciones utilitarias adicionales creadas';
END $$;

-- =============================================================================
-- 12. VALIDACIÓN COMPLETA DEL SISTEMA
-- =============================================================================

DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
    type_count INTEGER;
    trigger_count INTEGER;
    policy_count INTEGER;
    index_count INTEGER;
    bucket_count INTEGER;
    storage_policy_count INTEGER;
    view_count INTEGER;
    
    -- Contadores específicos
    main_tables INTEGER;
    audit_triggers INTEGER;
    rls_tables INTEGER;
    
    validation_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VALIDACIÓN COMPLETA DEL SISTEMA RECREADO...';
    RAISE NOTICE '';
    
    -- Contar objetos del sistema
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
    
    SELECT COUNT(*) INTO type_count
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public' AND t.typtype = 'e';
    
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public';
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO bucket_count
    FROM storage.buckets;
    
    SELECT COUNT(*) INTO storage_policy_count
    FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects';
    
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views 
    WHERE table_schema = 'public';
    
    -- Conteos específicos
    SELECT COUNT(*) INTO main_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('users', 'clients', 'cases', 'case_members', 'tasks', 'documents', 'notes', 'time_entries', 'appointments', 'audit_logs');
    
    SELECT COUNT(*) INTO audit_triggers
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public' 
    AND trigger_name LIKE 'audit_%';
    
    SELECT COUNT(*) INTO rls_tables
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND rowsecurity = true;
    
    -- Validaciones
    IF table_count < 10 THEN
        validation_errors := array_append(validation_errors, 'Faltan tablas principales (esperado: >=10, actual: ' || table_count || ')');
    END IF;
    
    IF main_tables < 10 THEN
        validation_errors := array_append(validation_errors, 'Faltan tablas específicas del sistema (esperado: 10, actual: ' || main_tables || ')');
    END IF;
    
    IF function_count < 8 THEN
        validation_errors := array_append(validation_errors, 'Faltan funciones (esperado: >=8, actual: ' || function_count || ')');
    END IF;
    
    IF type_count < 6 THEN
        validation_errors := array_append(validation_errors, 'Faltan tipos personalizados (esperado: 6, actual: ' || type_count || ')');
    END IF;
    
    IF trigger_count < 20 THEN
        validation_errors := array_append(validation_errors, 'Faltan triggers (esperado: >=20, actual: ' || trigger_count || ')');
    END IF;
    
    IF policy_count < 15 THEN
        validation_errors := array_append(validation_errors, 'Faltan políticas RLS (esperado: >=15, actual: ' || policy_count || ')');
    END IF;
    
    IF bucket_count < 3 THEN
        validation_errors := array_append(validation_errors, 'Faltan buckets de storage (esperado: 3, actual: ' || bucket_count || ')');
    END IF;
    
    IF storage_policy_count < 12 THEN
        validation_errors := array_append(validation_errors, 'Faltan políticas de storage (esperado: >=12, actual: ' || storage_policy_count || ')');
    END IF;
    
    -- Mostrar resultados
    RAISE NOTICE '📊 RESULTADOS DE LA VALIDACIÓN:';
    RAISE NOTICE '   📋 Tablas creadas: % (principales: %)', table_count, main_tables;
    RAISE NOTICE '   🔧 Funciones creadas: %', function_count;
    RAISE NOTICE '   📊 Tipos personalizados: %', type_count;
    RAISE NOTICE '   ⚡ Triggers creados: % (audit: %)', trigger_count, audit_triggers;
    RAISE NOTICE '   🛡️ Tablas con RLS: %', rls_tables;
    RAISE NOTICE '   🔒 Políticas RLS: %', policy_count;
    RAISE NOTICE '   📊 Índices creados: %', index_count;
    RAISE NOTICE '   🗄️ Storage buckets: %', bucket_count;
    RAISE NOTICE '   🔒 Políticas storage: %', storage_policy_count;
    RAISE NOTICE '   👁️ Vistas creadas: %', view_count;
    RAISE NOTICE '';
    
    IF array_length(validation_errors, 1) = 0 OR validation_errors IS NULL THEN
        RAISE NOTICE '✅✅✅ VALIDACIÓN EXITOSA - BACKEND COMPLETAMENTE RECREADO ✅✅✅';
        RAISE NOTICE '';
        RAISE NOTICE '🎉 CARACTERÍSTICAS DEL NUEVO BACKEND:';
        RAISE NOTICE '   ✨ Estructura optimizada con mejores prácticas';
        RAISE NOTICE '   ✨ Soft delete en todas las tablas principales';
        RAISE NOTICE '   ✨ Numeración automática de casos y tareas';
        RAISE NOTICE '   ✨ Sistema de auditoría completo con IP y session tracking';
        RAISE NOTICE '   ✨ RLS policies sin recursión infinita';
        RAISE NOTICE '   ✨ Roles expandidos: super_admin, paralegal, intern, client';
        RAISE NOTICE '   ✨ Gestión avanzada de permisos por caso';
        RAISE NOTICE '   ✨ Cálculo automático de horas reales';
        RAISE NOTICE '   ✨ Storage buckets con límites y tipos MIME';
        RAISE NOTICE '   ✨ Vistas útiles para dashboard y reportes';
        RAISE NOTICE '   ✨ Funciones helper para consultas complejas';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 PRÓXIMOS PASOS:';
        RAISE NOTICE '   1. Verificar autenticación en tu aplicación';
        RAISE NOTICE '   2. Crear un usuario administrador inicial';
        RAISE NOTICE '   3. Probar las funcionalidades principales';
        RAISE NOTICE '   4. Configurar backups automáticos';
        RAISE NOTICE '   5. Activar el tema "backend" en Warp Terminal';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '❌ ERRORES DE VALIDACIÓN ENCONTRADOS:';
        IF validation_errors IS NOT NULL AND array_length(validation_errors, 1) > 0 THEN
            FOR i IN 1..array_length(validation_errors, 1) LOOP
                RAISE NOTICE '   • %', validation_errors[i];
            END LOOP;
        END IF;
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  Revisa los errores antes de continuar';
    END IF;
END $$;

-- =============================================================================
-- 13. MENSAJE FINAL
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🏁 RECREACIÓN COMPLETA FINALIZADA';
    RAISE NOTICE '';
    RAISE NOTICE '📁 ARCHIVOS EJECUTADOS:';
    RAISE NOTICE '   1. 01-reset-complete-destruction-FIXED.sql (eliminación)';
    RAISE NOTICE '   2. 02-recreate-FIXED.sql (tablas e índices)';
    RAISE NOTICE '   3. 03-functions-triggers-rls-FIXED.sql (lógica y seguridad)';
    RAISE NOTICE '   4. 04-storage-and-validation-FIXED.sql (storage y validación)';
    RAISE NOTICE '';
    RAISE NOTICE '🎨 TEMA WARP DISPONIBLE:';
    RAISE NOTICE '   • Ubicación: ~/.local/share/warp-terminal/themes/backend.yaml';
    RAISE NOTICE '   • Actívalo en Warp Terminal > Settings > Appearance > Theme';
    RAISE NOTICE '';
    RAISE NOTICE '✨ Tu backend legal está completamente renovado y listo para usar!';
    RAISE NOTICE '';
END $$;
