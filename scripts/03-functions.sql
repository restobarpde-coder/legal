-- Legal Office MVP - Database Functions
-- Run after tables.sql

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically add case creator as member
CREATE OR REPLACE FUNCTION add_case_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.case_members (case_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER add_case_creator_as_member_trigger
  AFTER INSERT ON public.cases
  FOR EACH ROW EXECUTE FUNCTION add_case_creator_as_member();

-- Function to get user's accessible cases
CREATE OR REPLACE FUNCTION get_user_cases(user_uuid UUID)
RETURNS TABLE (
  case_id UUID,
  title TEXT,
  description TEXT,
  client_name TEXT,
  status case_status,
  priority task_priority,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.description,
    cl.name,
    c.status,
    c.priority,
    c.start_date,
    c.end_date,
    c.created_at
  FROM public.cases c
  JOIN public.clients cl ON c.client_id = cl.id
  JOIN public.case_members cm ON c.id = cm.case_id
  WHERE cm.user_id = user_uuid
  ORDER BY c.created_at DESC;
END;
$$ language 'plpgsql';
