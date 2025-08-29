-- =====================================================
-- CONFIGURACIÓN BÁSICA - PASO 1
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla de organizaciones
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar organización demo
INSERT INTO public.organizations (id, name, email, phone, address) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Estudio Jurídico Demo', 'contacto@estudiodemo.com', '+34 91 123 4567', 'Calle Gran Vía 123, Madrid, España')
ON CONFLICT (id) DO NOTHING;
