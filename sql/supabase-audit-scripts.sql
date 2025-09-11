-- =============================================================================
-- SCRIPTS DE AUDITORÍA PARA SUPABASE - EXTRAER CONFIGURACIÓN ACTUAL
-- =============================================================================
-- Ejecuta cada sección por separado en Supabase SQL Editor para revisar tu configuración actual

-- =============================================================================
-- 1. AUDITAR TABLAS Y COLUMNAS
-- =============================================================================
SELECT 
    '=== TABLAS Y COLUMNAS ===' as audit_section;

SELECT 
    t.table_name as tabla,
    c.column_name as columna,
    c.data_type as tipo,
    c.is_nullable as permite_null,
    c.column_default as valor_default,
    CASE 
        WHEN c.column_name = 'id' AND c.data_type = 'uuid' THEN '🔑 PRIMARY KEY'
        WHEN fk.column_name IS NOT NULL THEN '🔗 FOREIGN KEY → ' || fk.foreign_table_name || '(' || fk.foreign_column_name || ')'
        WHEN c.is_nullable = 'NO' AND c.column_default IS NULL THEN '⚠️  REQUIRED'
        ELSE '✅ OK'
    END as estado
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN (
    SELECT 
        kcu.column_name,
        kcu.table_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
) fk ON c.column_name = fk.column_name AND c.table_name = fk.table_name
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- =============================================================================
-- 2. AUDITAR FOREIGN KEYS (RELACIONES)
-- =============================================================================
SELECT 
    '=== FOREIGN KEYS ===' as audit_section;

SELECT 
    tc.constraint_name as nombre_fk,
    tc.table_name as tabla_origen,
    kcu.column_name as columna_origen,
    ccu.table_name as tabla_destino,
    ccu.column_name as columna_destino,
    rc.update_rule as regla_update,
    rc.delete_rule as regla_delete,
    CASE 
        WHEN rc.delete_rule = 'CASCADE' THEN '🗑️ DELETE CASCADE'
        WHEN rc.delete_rule = 'RESTRICT' THEN '🚫 DELETE RESTRICT'
        WHEN rc.delete_rule = 'SET NULL' THEN '🔄 SET NULL'
        ELSE '⚠️ ' || rc.delete_rule
    END as estado_delete
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- =============================================================================
-- 3. AUDITAR ÍNDICES
-- =============================================================================
SELECT 
    '=== ÍNDICES ===' as audit_section;

SELECT 
    schemaname as esquema,
    tablename as tabla,
    indexname as nombre_indice,
    indexdef as definicion,
    CASE 
        WHEN indexname LIKE '%_pkey' THEN '🔑 PRIMARY KEY'
        WHEN indexname LIKE '%_key' THEN '🔗 UNIQUE KEY'
        WHEN indexdef LIKE '%UNIQUE%' THEN '✨ UNIQUE INDEX'
        ELSE '📊 INDEX'
    END as tipo
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =============================================================================
-- 4. AUDITAR TRIGGERS
-- =============================================================================
SELECT 
    '=== TRIGGERS ===' as audit_section;

SELECT 
    t.trigger_name as nombre_trigger,
    t.table_name as tabla,
    t.action_timing as timing, -- BEFORE/AFTER
    t.event_manipulation as evento, -- INSERT/UPDATE/DELETE
    r.routine_name as funcion,
    CASE 
        WHEN r.routine_name LIKE '%updated_at%' THEN '⏰ UPDATE TIMESTAMP'
        WHEN r.routine_name LIKE '%member%' THEN '👥 MEMBERSHIP'
        WHEN t.action_timing = 'BEFORE' THEN '🔄 BEFORE TRIGGER'
        WHEN t.action_timing = 'AFTER' THEN '✅ AFTER TRIGGER'
        ELSE '🔧 CUSTOM TRIGGER'
    END as tipo
FROM information_schema.triggers t
LEFT JOIN information_schema.routines r ON t.action_statement LIKE '%' || r.routine_name || '%'
WHERE t.trigger_schema = 'public'
ORDER BY t.table_name, t.trigger_name;

-- =============================================================================
-- 5. AUDITAR FUNCIONES PERSONALIZADAS
-- =============================================================================
SELECT 
    '=== FUNCIONES PERSONALIZADAS ===' as audit_section;

SELECT 
    routine_name as nombre_funcion,
    routine_type as tipo, -- FUNCTION/PROCEDURE
    data_type as retorna,
    security_type as seguridad,
    routine_definition as definicion,
    CASE 
        WHEN routine_name LIKE '%safe%' THEN '🛡️ SAFE FUNCTION'
        WHEN routine_name LIKE '%user%' THEN '👤 USER FUNCTION'
        WHEN routine_name LIKE '%case%' THEN '📋 CASE FUNCTION'
        WHEN routine_name LIKE '%updated_at%' THEN '⏰ TIMESTAMP FUNCTION'
        ELSE '🔧 CUSTOM FUNCTION'
    END as categoria
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- =============================================================================
-- 6. AUDITAR RLS (ROW LEVEL SECURITY)
-- =============================================================================
SELECT 
    '=== ROW LEVEL SECURITY STATUS ===' as audit_section;

SELECT 
    schemaname as esquema,
    tablename as tabla,
    rowsecurity as rls_habilitado,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS ENABLED'
        ELSE '❌ RLS DISABLED'
    END as estado
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =============================================================================
-- 7. AUDITAR POLÍTICAS RLS
-- =============================================================================
SELECT 
    '=== POLÍTICAS RLS ===' as audit_section;

SELECT 
    schemaname as esquema,
    tablename as tabla,
    policyname as nombre_politica,
    permissive as tipo_politica, -- PERMISSIVE/RESTRICTIVE
    roles as roles,
    cmd as comando, -- SELECT/INSERT/UPDATE/DELETE/ALL
    qual as condicion_using,
    with_check as condicion_with_check,
    CASE 
        WHEN cmd = 'ALL' THEN '🔄 ALL OPERATIONS'
        WHEN cmd = 'SELECT' THEN '👁️ SELECT ONLY'
        WHEN cmd = 'INSERT' THEN '➕ INSERT ONLY'
        WHEN cmd = 'UPDATE' THEN '✏️ UPDATE ONLY'
        WHEN cmd = 'DELETE' THEN '🗑️ DELETE ONLY'
        ELSE '❓ ' || cmd
    END as tipo_operacion
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================================================
-- 8. AUDITAR TIPOS PERSONALIZADOS (ENUMS)
-- =============================================================================
SELECT 
    '=== TIPOS PERSONALIZADOS (ENUMS) ===' as audit_section;

SELECT 
    t.typname as nombre_tipo,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as valores,
    CASE 
        WHEN t.typname LIKE '%status%' THEN '📊 STATUS TYPE'
        WHEN t.typname LIKE '%priority%' THEN '⚡ PRIORITY TYPE'
        WHEN t.typname LIKE '%role%' THEN '👤 ROLE TYPE'
        WHEN t.typname LIKE '%type%' THEN '📋 GENERAL TYPE'
        ELSE '🔧 CUSTOM TYPE'
    END as categoria
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY t.typname
ORDER BY t.typname;

-- =============================================================================
-- 9. AUDITAR STORAGE BUCKETS Y POLÍTICAS
-- =============================================================================
SELECT 
    '=== STORAGE BUCKETS ===' as audit_section;

SELECT 
    id as bucket_id,
    name as nombre_bucket,
    public as es_publico,
    created_at as fecha_creacion,
    CASE 
        WHEN public = true THEN '🌍 PUBLIC BUCKET'
        ELSE '🔒 PRIVATE BUCKET'
    END as tipo
FROM storage.buckets
ORDER BY name;

-- Storage policies
SELECT 
    '=== STORAGE POLICIES ===' as audit_section;

SELECT 
    schemaname as esquema,
    tablename as tabla,
    policyname as nombre_politica,
    cmd as comando,
    roles as roles,
    CASE 
        WHEN cmd = 'SELECT' THEN '👁️ VIEW FILES'
        WHEN cmd = 'INSERT' THEN '📤 UPLOAD FILES'
        WHEN cmd = 'UPDATE' THEN '✏️ MODIFY FILES'
        WHEN cmd = 'DELETE' THEN '🗑️ DELETE FILES'
        ELSE '🔧 ' || cmd
    END as operacion
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- =============================================================================
-- 10. RESUMEN GENERAL
-- =============================================================================
SELECT 
    '=== RESUMEN GENERAL ===' as audit_section;

WITH table_stats AS (
    SELECT COUNT(*) as total_tablas 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
),
fk_stats AS (
    SELECT COUNT(*) as total_fks 
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'
),
trigger_stats AS (
    SELECT COUNT(*) as total_triggers 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
),
function_stats AS (
    SELECT COUNT(*) as total_funciones 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
),
rls_stats AS (
    SELECT 
        COUNT(*) as total_tablas_rls,
        COUNT(*) FILTER (WHERE rowsecurity = true) as tablas_con_rls
    FROM pg_tables 
    WHERE schemaname = 'public'
),
policy_stats AS (
    SELECT COUNT(*) as total_politicas 
    FROM pg_policies 
    WHERE schemaname = 'public'
),
enum_stats AS (
    SELECT COUNT(*) as total_enums 
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public' AND t.typtype = 'e'
),
bucket_stats AS (
    SELECT COUNT(*) as total_buckets 
    FROM storage.buckets
)
SELECT 
    'CONFIGURACIÓN ACTUAL' as componente,
    CONCAT(
        '📋 Tablas: ', t.total_tablas, ' | ',
        '🔗 FKs: ', f.total_fks, ' | ',
        '⚡ Triggers: ', tr.total_triggers, ' | ',
        '🔧 Funciones: ', fu.total_funciones, ' | ',
        '🛡️ RLS: ', r.tablas_con_rls, '/', r.total_tablas_rls, ' | ',
        '📜 Políticas: ', p.total_politicas, ' | ',
        '📊 Enums: ', e.total_enums, ' | ',
        '🗄️ Buckets: ', b.total_buckets
    ) as estado
FROM table_stats t, fk_stats f, trigger_stats tr, function_stats fu, 
     rls_stats r, policy_stats p, enum_stats e, bucket_stats b;
