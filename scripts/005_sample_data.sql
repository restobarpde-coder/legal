-- =====================================================
-- DATOS DE PRUEBA - PASO 5
-- =====================================================

-- Insertar perfiles demo (sin depender de auth.users)
INSERT INTO public.profiles (id, organization_id, email, full_name, role, phone) VALUES
('11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'admin@estudiodemo.com', 'Administrador Demo', 'admin', '+34 91 111 1111'),
('22222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440000', 'abogado@estudiodemo.com', 'Juan Carlos Abogado', 'abogado', '+34 91 222 2222'),
('33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440000', 'asistente@estudiodemo.com', 'María Asistente', 'asistente', '+34 91 333 3333')
ON CONFLICT (id) DO NOTHING;

-- Insertar clientes demo
INSERT INTO public.clients (id, organization_id, name, email, phone, address, client_type, tax_id, notes, created_by) VALUES
('c1111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'Juan Pérez García', 'juan.perez@email.com', '+34 91 555 0001', 'Calle Mayor 45, Madrid', 'individual', '12345678A', 'Cliente desde 2020', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Insertar un asunto demo
INSERT INTO public.matters (id, organization_id, client_id, title, description, matter_type, status, priority, assigned_lawyer, start_date, created_by) VALUES
('m1111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440000', 'c1111111-1111-1111-1111-111111111111', 'Divorcio Contencioso', 'Proceso de divorcio con disputa sobre custodia de menores', 'Derecho de Familia', 'active', 'high', '22222222-2222-2222-2222-222222222222', '2024-01-15', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;
