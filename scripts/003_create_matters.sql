-- Create matters (cases) table
CREATE TABLE IF NOT EXISTS public.matters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  matter_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'on_hold', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  practice_area TEXT,
  assigned_lawyer UUID REFERENCES auth.users(id),
  hourly_rate DECIMAL(10,2),
  budget DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for matters
CREATE POLICY "matters_select_authenticated" ON public.matters 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "matters_insert_authenticated" ON public.matters 
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "matters_update_authenticated" ON public.matters 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "matters_delete_authenticated" ON public.matters 
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create sequence for matter numbers
CREATE SEQUENCE IF NOT EXISTS matter_number_seq START 1000;

-- Function to generate matter numbers
CREATE OR REPLACE FUNCTION generate_matter_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'M-' || LPAD(nextval('matter_number_seq')::TEXT, 6, '0');
END;
$$;

-- Trigger to auto-generate matter numbers
CREATE OR REPLACE FUNCTION set_matter_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.matter_number IS NULL OR NEW.matter_number = '' THEN
    NEW.matter_number := generate_matter_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_matter_number_trigger ON public.matters;
CREATE TRIGGER set_matter_number_trigger
  BEFORE INSERT ON public.matters
  FOR EACH ROW
  EXECUTE FUNCTION set_matter_number();
