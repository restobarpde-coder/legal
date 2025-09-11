-- Limpiar conversaciones de prueba antes de ir a producción
-- EJECUTAR SOLO SI QUIERES ELIMINAR LAS CONVERSACIONES DE PRUEBA

-- Ver qué conversaciones de prueba tienes
SELECT 
    chatwoot_id,
    contact_name,
    contact_email,
    inbox_name,
    created_at
FROM chatwoot_conversations 
WHERE contact_name LIKE '%Test%' 
   OR contact_name LIKE '%Prueba%'
   OR chatwoot_id IN (12345, 54321, 99999, 67890)
ORDER BY created_at DESC;

-- Si quieres eliminarlas (descomenta las siguientes líneas):
-- DELETE FROM chatwoot_messages WHERE conversation_chatwoot_id IN (12345, 54321, 99999, 67890);
-- DELETE FROM chatwoot_conversations WHERE chatwoot_id IN (12345, 54321, 99999, 67890);

-- Verificar que están limpias
-- SELECT COUNT(*) as remaining_test_conversations FROM chatwoot_conversations WHERE contact_name LIKE '%Test%';
