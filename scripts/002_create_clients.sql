-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  company TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients - all authenticated users can access
CREATE POLICY "clients_select_authenticated" ON public.clients 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "clients_insert_authenticated" ON public.clients 
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "clients_update_authenticated" ON public.clients 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "clients_delete_authenticated" ON public.clients 
  FOR DELETE USING (auth.uid() IS NOT NULL);
