-- Script de diagnóstico para el sistema de notificaciones

-- 1. Ver todas las tareas activas con fecha de vencimiento
SELECT 
  id,
  title,
  assigned_to,
  due_date,
  priority,
  status,
  deleted_at,
  created_at,
  -- Calcular horas hasta vencimiento
  EXTRACT(EPOCH FROM (due_date - NOW())) / 3600 AS hours_until_due
FROM tasks
WHERE deleted_at IS NULL
ORDER BY due_date ASC
LIMIT 20;

-- 2. Ver tareas que deberían notificar (próxima semana)
SELECT 
  id,
  title,
  assigned_to,
  due_date,
  priority,
  status,
  EXTRACT(EPOCH FROM (due_date - NOW())) / 3600 AS hours_until_due,
  -- Mostrar si cumple criterios
  CASE 
    WHEN assigned_to IS NULL THEN '❌ Sin usuario asignado'
    WHEN status IN ('completed', 'cancelled') THEN '❌ Estado: ' || status
    WHEN due_date < NOW() THEN '❌ Ya venció'
    WHEN due_date > NOW() + INTERVAL '7 days' THEN '❌ Vence en más de 7 días'
    ELSE '✅ Cumple criterios'
  END AS validacion
FROM tasks
WHERE deleted_at IS NULL
  AND due_date >= NOW() - INTERVAL '1 day'
  AND due_date <= NOW() + INTERVAL '7 days'
ORDER BY due_date ASC;

-- 3. Ver usuarios disponibles para asignar
SELECT 
  id,
  full_name,
  email,
  role,
  is_active
FROM users
WHERE deleted_at IS NULL
  AND is_active = true
ORDER BY full_name;

-- 4. Estadísticas generales
SELECT 
  'Total tareas' AS metrica,
  COUNT(*) AS cantidad
FROM tasks
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'Tareas con assigned_to',
  COUNT(*)
FROM tasks
WHERE deleted_at IS NULL
  AND assigned_to IS NOT NULL

UNION ALL

SELECT 
  'Tareas con due_date',
  COUNT(*)
FROM tasks
WHERE deleted_at IS NULL
  AND due_date IS NOT NULL

UNION ALL

SELECT 
  'Tareas próximas (7 días)',
  COUNT(*)
FROM tasks
WHERE deleted_at IS NULL
  AND assigned_to IS NOT NULL
  AND status NOT IN ('completed', 'cancelled')
  AND due_date >= NOW()
  AND due_date <= NOW() + INTERVAL '7 days';
