-- Enable Realtime for case-related tables
-- This allows instant updates when tasks, documents, notes, or time entries are added/changed

-- Enable realtime on tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Enable realtime on documents table
ALTER PUBLICATION supabase_realtime ADD TABLE documents;

-- Enable realtime on notes table
ALTER PUBLICATION supabase_realtime ADD TABLE notes;

-- Enable realtime on time_entries table
ALTER PUBLICATION supabase_realtime ADD TABLE time_entries;

-- Optional: Enable realtime on cases table if you want to track case changes
ALTER PUBLICATION supabase_realtime ADD TABLE cases;

-- Verify enabled tables
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
