-- ============================================================================
-- SETUP CASE RAG - Bóveda de información embeddeada por caso
-- ============================================================================
-- Ejecuta este archivo completo en Supabase SQL Editor
-- ============================================================================

-- Tabla: case_embeddings
-- Almacena embeddings de documentos, notas, tareas y chats de cada caso
CREATE TABLE IF NOT EXISTS case_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('document', 'note', 'task', 'chat')),
  source_id UUID,
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_case_embeddings_case_id
  ON case_embeddings(case_id);

CREATE INDEX IF NOT EXISTS idx_case_embeddings_source_type
  ON case_embeddings(case_id, source_type);

-- Índice IVFFLAT para búsquedas de vectores (crucial para performance)
CREATE INDEX IF NOT EXISTS idx_case_embeddings_vector
  ON case_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================================
-- Función: search_case_embeddings
-- Busca embeddings similares dentro de un caso específico
-- ============================================================================
CREATE OR REPLACE FUNCTION search_case_embeddings(
  p_case_id UUID,
  p_query_embedding vector,
  p_match_threshold float8 DEFAULT 0.6,
  p_match_count int DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  case_id UUID,
  source_type TEXT,
  source_id UUID,
  content TEXT,
  embedding vector,
  similarity float8,
  created_at TIMESTAMP
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.case_id,
    ce.source_type,
    ce.source_id,
    ce.content,
    ce.embedding,
    1 - (ce.embedding <=> p_query_embedding) as similarity,
    ce.created_at
  FROM case_embeddings ce
  WHERE ce.case_id = p_case_id
    AND ce.embedding IS NOT NULL
    AND (1 - (ce.embedding <=> p_query_embedding)) > p_match_threshold
  ORDER BY ce.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

COMMENT ON FUNCTION search_case_embeddings(UUID, vector, float8, int) IS
  'Búsqueda vectorial de embeddings similares dentro de un caso específico';

-- ============================================================================
-- RLS (Row Level Security) - Seguridad
-- Acceso por membresía: cualquier miembro del caso puede acceder
-- ============================================================================
ALTER TABLE case_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view case embeddings"
  ON case_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM case_members cm
      WHERE cm.case_id = case_embeddings.case_id
      AND cm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_embeddings.case_id
      AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Team members can insert case embeddings"
  ON case_embeddings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM case_members cm
      WHERE cm.case_id = case_id
      AND cm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
      AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Team members can delete case embeddings"
  ON case_embeddings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM case_members cm
      WHERE cm.case_id = case_embeddings.case_id
      AND cm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_embeddings.case_id
      AND c.created_by = auth.uid()
    )
  );

-- ============================================================================
-- Comentarios y documentación
-- ============================================================================
COMMENT ON TABLE case_embeddings IS
  'Almacena embeddings de contenido de casos para RAG per-caso. Cada caso es una bóveda de información independiente.';

COMMENT ON COLUMN case_embeddings.case_id IS
  'ID del caso al que pertenece este contenido';

COMMENT ON COLUMN case_embeddings.source_type IS
  'Tipo de fuente: document, note, task, o chat';

COMMENT ON COLUMN case_embeddings.source_id IS
  'ID de la fuente (documento, nota, tarea, etc)';

COMMENT ON COLUMN case_embeddings.content IS
  'Contenido original (usado para mostrar en contexto)';

COMMENT ON COLUMN case_embeddings.embedding IS
  'Vector embedding de 1536 dimensiones (text-embedding-3-small)';

-- ============================================================================
-- Fin del setup
-- ============================================================================
-- Verificación: ejecuta esto para confirmar que todo está bien
-- SELECT tablename FROM pg_tables WHERE tablename = 'case_embeddings';
-- SELECT * FROM information_schema.functions WHERE function_name = 'search_case_embeddings';
