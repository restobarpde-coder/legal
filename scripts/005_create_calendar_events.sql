-- Create calendar events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  matter_id UUID REFERENCES public.matters(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'court', 'deadline', 'consultation', 'other')),
  attendees TEXT[], -- Array of email addresses
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar events
CREATE POLICY "calendar_events_select_authenticated" ON public.calendar_events 
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "calendar_events_insert_authenticated" ON public.calendar_events 
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "calendar_events_update_authenticated" ON public.calendar_events 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "calendar_events_delete_authenticated" ON public.calendar_events 
  FOR DELETE USING (auth.uid() IS NOT NULL);
