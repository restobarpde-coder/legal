-- Legal Office MVP - Seed Data
-- Run last, after all other scripts
-- IMPORTANT: Replace the UUID values with your actual Supabase user IDs

-- Insert sample users (replace UUIDs with real ones from auth.users)
INSERT INTO public.users (id, email, full_name, role, phone) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@estudio.com', 'María González', 'admin', '+54 11 1234-5678'),
  ('00000000-0000-0000-0000-000000000002', 'abogado@estudio.com', 'Carlos Rodríguez', 'lawyer', '+54 11 2345-6789'),
  ('00000000-0000-0000-0000-000000000003', 'asistente@estudio.com', 'Ana Martínez', 'assistant', '+54 11 3456-7890');

-- Insert sample clients
INSERT INTO public.clients (id, name, email, phone, company, created_by) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Empresa ABC S.A.', 'contacto@abc.com', '+54 11 4567-8901', 'ABC S.A.', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'Juan Pérez', 'juan.perez@email.com', '+54 11 5678-9012', NULL, '00000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003', 'Constructora XYZ', 'info@xyz.com', '+54 11 6789-0123', 'XYZ Construcciones', '00000000-0000-0000-0000-000000000001');

-- Insert sample cases
INSERT INTO public.cases (id, title, description, client_id, status, priority, hourly_rate, created_by) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Contrato de Servicios ABC', 'Revisión y negociación de contrato de servicios profesionales', '10000000-0000-0000-0000-000000000001', 'active', 'high', 15000.00, '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'Divorcio Juan Pérez', 'Proceso de divorcio consensuado', '10000000-0000-0000-0000-000000000002', 'active', 'medium', 12000.00, '00000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000003', 'Disputa Contractual XYZ', 'Resolución de disputa por incumplimiento contractual', '10000000-0000-0000-0000-000000000003', 'pending', 'urgent', 18000.00, '00000000-0000-0000-0000-000000000001');

-- Insert sample tasks
INSERT INTO public.tasks (title, description, case_id, assigned_to, status, priority, due_date, created_by) VALUES
  ('Revisar cláusulas del contrato', 'Análisis detallado de las cláusulas propuestas por ABC', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'in_progress', 'high', NOW() + INTERVAL '3 days', '00000000-0000-0000-0000-000000000001'),
  ('Preparar documentación para divorcio', 'Recopilar y preparar toda la documentación necesaria', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'pending', 'medium', NOW() + INTERVAL '1 week', '00000000-0000-0000-0000-000000000002'),
  ('Citar a mediación', 'Coordinar fecha para mediación con XYZ', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'pending', 'urgent', NOW() + INTERVAL '2 days', '00000000-0000-0000-0000-000000000001');

-- Insert sample notes
INSERT INTO public.notes (title, content, case_id, created_by) VALUES
  ('Reunión inicial ABC', 'Cliente muy colaborativo. Principales preocupaciones: cláusulas de confidencialidad y penalidades por incumplimiento.', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('Llamada con Juan Pérez', 'Proceso amigable. Ambas partes de acuerdo con la división de bienes propuesta.', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002'),
  ('Análisis del caso XYZ', 'Caso complejo. Revisar jurisprudencia sobre incumplimientos en contratos de construcción.', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001');
