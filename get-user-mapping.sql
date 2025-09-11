-- Ejecuta esta query en tu panel de Supabase para obtener el mapeo de usuarios
-- Copia el resultado y usalo para actualizar el webhook

SELECT 
    CONCAT('''', u.email, ''': ''', up.id, ''',') as mapping_line,
    up.id as user_uuid,
    up.full_name,
    u.email,
    up.role
FROM user_profiles up
JOIN auth.users u ON up.id = u.id
ORDER BY up.created_at;

-- El resultado debería verse así:
-- 'admin@estudio.com': '123e4567-e89b-12d3-a456-426614174000',
-- 'maria@estudio.com': '123e4567-e89b-12d3-a456-426614174001',
-- 'juan@estudio.com': '123e4567-e89b-12d3-a456-426614174002',

-- Copia estas líneas al emailToUserMapping en el webhook
