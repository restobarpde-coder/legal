-- Create legal matters table
CREATE TABLE IF NOT EXISTS public.matters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  matter_type TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'pending', 'closed', 'archived')) DEFAULT 'active',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  assigned_lawyer UUID REFERENCES auth.users(id),
  start_date DATE,
  end_date DATE,
  estimated_hours DECIMAL(10,2),
  hourly_rate DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for matters
CREATE POLICY "Users can view matters in their organization" ON public.matters
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage matters in their organization" ON public.matters
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'lawyer', 'assistant')
    )
  );
