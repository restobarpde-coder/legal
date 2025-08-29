-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP WITH TIME ZONE,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "tasks_select_authenticated" ON public.tasks 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "tasks_insert_authenticated" ON public.tasks 
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "tasks_update_authenticated" ON public.tasks 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "tasks_delete_authenticated" ON public.tasks 
  FOR DELETE USING (auth.uid() IS NOT NULL);
