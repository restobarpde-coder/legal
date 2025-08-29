-- Create time entries table for billing
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  description TEXT NOT NULL,
  hours DECIMAL(5,2) NOT NULL CHECK (hours > 0),
  hourly_rate DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS (hours * hourly_rate) STORED,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_billable BOOLEAN DEFAULT TRUE,
  is_billed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time entries
CREATE POLICY "time_entries_select_authenticated" ON public.time_entries 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "time_entries_insert_own" ON public.time_entries 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "time_entries_update_own" ON public.time_entries 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "time_entries_delete_own" ON public.time_entries 
  FOR DELETE USING (auth.uid() = user_id);
