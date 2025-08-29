-- Insert demo organization
INSERT INTO public.organizations (id, name, description, address, phone, email, website)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Estudio Jurídico Demo',
  'Estudio jurídico especializado en derecho civil y comercial',
  'Av. Corrientes 1234, CABA, Argentina',
  '+54 11 4567-8900',
  'contacto@estudiodemo.com.ar',
  'https://estudiodemo.com.ar'
) ON CONFLICT (id) DO NOTHING;

-- Insert demo clients
INSERT INTO public.clients (id, organization_id, first_name, last_name, email, phone, address, identification_number, client_type, notes)
VALUES 
  (
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    'Juan Carlos',
    'Pérez',
    'juan.perez@email.com',
    '+54 11 1234-5678',
    'Av. Santa Fe 2345, CABA',
    '12345678',
    'individual',
    'Cliente desde 2020, casos de derecho civil'
  ),
  (
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440000',
    'María Elena',
    'González',
    'maria.gonzalez@email.com',
    '+54 11 2345-6789',
    'Av. Rivadavia 3456, CABA',
    '23456789',
    'individual',
    'Caso de divorcio en proceso'
  ),
  (
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440000',
    'Empresa',
    'Tech Solutions SRL',
    'info@techsolutions.com.ar',
    '+54 11 3456-7890',
    'Av. Córdoba 4567, CABA',
    '30-12345678-9',
    'company',
    'Empresa de tecnología, contratos comerciales'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert demo legal matters
INSERT INTO public.matters (id, organization_id, client_id, title, description, matter_type, status, priority, start_date, estimated_hours, hourly_rate)
VALUES 
  (
    '770e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440001',
    'Reclamo de Daños y Perjuicios',
    'Reclamo por accidente de tránsito con lesiones menores',
    'Civil',
    'active',
    'medium',
    '2024-01-15',
    40,
    15000.00
  ),
  (
    '770e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440002',
    'Divorcio Contencioso',
    'Proceso de divorcio con división de bienes',
    'Familia',
    'active',
    'high',
    '2024-02-01',
    60,
    18000.00
  ),
  (
    '770e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440003',
    'Revisión de Contratos Comerciales',
    'Revisión y redacción de contratos de servicios',
    'Comercial',
    'pending',
    'medium',
    '2024-03-01',
    20,
    20000.00
  )
ON CONFLICT (id) DO NOTHING;

-- Insert demo tasks
INSERT INTO public.tasks (id, organization_id, matter_id, title, description, status, priority, due_date, estimated_hours)
VALUES 
  (
    '880e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    '770e8400-e29b-41d4-a716-446655440001',
    'Recopilar documentación médica',
    'Solicitar informes médicos del accidente',
    'pending',
    'high',
    '2024-12-31 18:00:00+00',
    4
  ),
  (
    '880e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440000',
    '770e8400-e29b-41d4-a716-446655440002',
    'Preparar documentos de divorcio',
    'Redactar demanda de divorcio',
    'in_progress',
    'high',
    '2024-12-30 15:00:00+00',
    8
  ),
  (
    '880e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440000',
    '770e8400-e29b-41d4-a716-446655440003',
    'Revisar cláusulas contractuales',
    'Analizar términos y condiciones propuestos',
    'pending',
    'medium',
    '2025-01-15 12:00:00+00',
    6
  )
ON CONFLICT (id) DO NOTHING;

-- Insert demo events
INSERT INTO public.events (id, organization_id, matter_id, client_id, title, description, event_type, start_time, end_time, location)
VALUES 
  (
    '990e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    '770e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440001',
    'Reunión con cliente - Caso Pérez',
    'Revisión del estado del caso y próximos pasos',
    'meeting',
    '2024-12-30 14:00:00+00',
    '2024-12-30 15:30:00+00',
    'Oficina - Sala de reuniones'
  ),
  (
    '990e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440000',
    '770e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440002',
    'Audiencia de divorcio',
    'Primera audiencia en juzgado de familia',
    'hearing',
    '2025-01-10 10:00:00+00',
    '2025-01-10 12:00:00+00',
    'Juzgado de Familia N° 3'
  )
ON CONFLICT (id) DO NOTHING;
