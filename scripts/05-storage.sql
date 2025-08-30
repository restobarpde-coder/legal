-- Legal Office MVP - Storage Setup
-- Run after RLS policies

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies for documents bucket
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Users can view documents they have access to" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documents');

CREATE POLICY "Users can update their uploaded documents" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'documents' AND auth.uid()::text = owner);

CREATE POLICY "Users can delete their uploaded documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'documents' AND auth.uid()::text = owner);
