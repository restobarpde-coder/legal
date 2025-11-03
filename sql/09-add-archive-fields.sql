-- =============================================================================
-- 📁 AGREGAR CAMPOS DE ARCHIVO Y CARPETA A CASOS
-- =============================================================================
-- Este script agrega los campos numero_archivo y numero_carpeta a la tabla cases
-- para poder gestionar casos archivados de manera más organizada.

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📁 Agregando campos de archivo a la tabla cases...';
    RAISE NOTICE '';
END $$;

-- Agregar columna numero_archivo
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS numero_archivo TEXT;

-- Agregar columna numero_carpeta
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS numero_carpeta TEXT;

-- Crear índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_cases_archivo 
ON public.cases(numero_archivo) 
WHERE numero_archivo IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cases_carpeta 
ON public.cases(numero_carpeta) 
WHERE numero_carpeta IS NOT NULL AND deleted_at IS NULL;

-- Agregar comentarios a las columnas
COMMENT ON COLUMN public.cases.numero_archivo IS 'Número de archivo físico donde se guarda el caso cuando está archivado';
COMMENT ON COLUMN public.cases.numero_carpeta IS 'Número de carpeta física donde se organiza el caso archivado';

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Campos agregados exitosamente:';
    RAISE NOTICE '   - numero_archivo (TEXT)';
    RAISE NOTICE '   - numero_carpeta (TEXT)';
    RAISE NOTICE '   - Índices creados para búsqueda rápida';
    RAISE NOTICE '';
END $$;
