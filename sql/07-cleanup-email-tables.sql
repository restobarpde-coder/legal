-- Script para limpiar las tablas del sistema de email anterior
-- Ejecuta este script si quieres remover completamente las tablas de email

-- ADVERTENCIA: Este script eliminará PERMANENTEMENTE todos los datos de email
-- Asegúrate de hacer un backup antes de ejecutar

-- Comentar/descomentrar según necesites

-- 1. Eliminar las tablas de email (descomentrar si quieres eliminarlas)
-- DROP TABLE IF EXISTS email_cache CASCADE;
-- DROP TABLE IF EXISTS email_sync_status CASCADE; 
-- DROP TABLE IF EXISTS email_credentials CASCADE;

-- 2. Eliminar funciones relacionadas (descomentrar si quieres eliminarlas)
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 3. Script alternativo: Solo vaciar las tablas (mantener estructura)
-- TRUNCATE TABLE email_cache CASCADE;
-- TRUNCATE TABLE email_sync_status CASCADE;
-- TRUNCATE TABLE email_credentials CASCADE;

-- 4. Ver qué tablas de email existen actualmente
SELECT 
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_name LIKE '%email%'
AND table_schema = 'public'
ORDER BY table_name;

-- Comentario: 
-- Este script está comentado por seguridad
-- Si decides ejecutarlo, descomenta las líneas que necesites
-- Recomendación: Mantener las tablas por si necesitas recuperar datos más adelante
