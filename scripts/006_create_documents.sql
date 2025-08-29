-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  document_type TEXT DEFAULT 'general' CHECK (document_type IN ('contract', 'pleading', 'correspondence', 'evidence', 'general')),
  tags TEXT[],
  is_confidential BOOLEAN DEFAULT FALSE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "documents_select_authenticated" ON public.documents 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "documents_insert_authenticated" ON public.documents 
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "documents_update_authenticated" ON public.documents 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "documents_delete_authenticated" ON public.documents 
  FOR DELETE USING (auth.uid() IS NOT NULL);
