-- Consultas para explorar qué tablas tienes disponibles

-- 1. Ver todas las tablas disponibles
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Si no tienes user_profiles, usar solo auth.users
SELECT 
    CONCAT('''', email, ''': ''', id, ''',') as mapping_line,
    id as user_uuid,
    email,
    created_at
FROM auth.users
ORDER BY created_at;

-- 3. Ver qué columnas tiene auth.users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'auth';
