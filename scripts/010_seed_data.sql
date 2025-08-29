-- Seed data for LegalStudio
-- Insert sample profiles (lawyers and staff)
INSERT INTO profiles (id, first_name, last_name, email, role, phone, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'John', 'Smith', 'john.smith@legalstudio.com', 'partner', '+1-555-0101', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'Sarah', 'Johnson', 'sarah.johnson@legalstudio.com', 'associate', '+1-555-0102', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Michael', 'Brown', 'michael.brown@legalstudio.com', 'paralegal', '+1-555-0103', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', 'Emily', 'Davis', 'emily.davis@legalstudio.com', 'admin', '+1-555-0104', NOW(), NOW());

-- Insert sample clients
INSERT INTO clients (id, name, email, phone, address, client_type, created_by, created_at, updated_at) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Acme Corporation', 'legal@acme.com', '+1-555-1001', '123 Business Ave, New York, NY 10001', 'corporate', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000002', 'Jane Doe', 'jane.doe@email.com', '+1-555-1002', '456 Residential St, Los Angeles, CA 90001', 'individual', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000003', 'TechStart Inc.', 'contact@techstart.com', '+1-555-1003', '789 Innovation Blvd, San Francisco, CA 94105', 'corporate', '00000000-0000-0000-0000-000000000002', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000004', 'Robert Wilson', 'robert.wilson@email.com', '+1-555-1004', '321 Main St, Chicago, IL 60601', 'individual', '00000000-0000-0000-0000-000000000002', NOW(), NOW());

-- Insert sample matters
INSERT INTO matters (id, title, matter_number, description, client_id, responsible_lawyer, status, priority, created_at, updated_at) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Contract Negotiation', 'MAT-2024-001', 'Negotiating service agreement with vendor', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'active', 'high', NOW(), NOW()),
  ('20000000-0000-0000-0000-000000000002', 'Personal Injury Claim', 'MAT-2024-002', 'Auto accident personal injury case', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'active', 'medium', NOW(), NOW()),
  ('20000000-0000-0000-0000-000000000003', 'Intellectual Property Filing', 'MAT-2024-003', 'Patent application for new technology', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'active', 'high', NOW(), NOW()),
  ('20000000-0000-0000-0000-000000000004', 'Estate Planning', 'MAT-2024-004', 'Will and trust preparation', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'pending', 'low', NOW(), NOW());

-- Insert sample tasks
INSERT INTO tasks (id, title, description, matter_id, assigned_to, status, priority, due_date, estimated_hours, created_at, updated_at) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Review Contract Terms', 'Review and analyze contract terms for negotiation', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'in_progress', 'high', NOW() + INTERVAL '3 days', 4.0, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000002', 'Prepare Discovery Documents', 'Prepare initial discovery documents for personal injury case', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'pending', 'medium', NOW() + INTERVAL '1 week', 6.0, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000003', 'Patent Research', 'Conduct prior art research for patent application', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'pending', 'high', NOW() + INTERVAL '5 days', 8.0, NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000004', 'Schedule Client Meeting', 'Schedule initial consultation for estate planning', '20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'completed', 'low', NOW() - INTERVAL '1 day', 0.5, NOW(), NOW());

-- Insert sample calendar events
INSERT INTO calendar_events (id, title, description, start_time, end_time, event_type, all_day, location, matter_id, client_id, attendees, created_by, created_at, updated_at) VALUES
  ('40000000-0000-0000-0000-000000000001', 'Contract Review Meeting', 'Meeting to discuss contract terms with client', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '1 hour', 'meeting', false, 'Conference Room A', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', ARRAY['legal@acme.com'], '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000002', 'Court Hearing', 'Initial hearing for personal injury case', NOW() + INTERVAL '1 week', NOW() + INTERVAL '1 week' + INTERVAL '2 hours', 'court', false, 'Superior Court Room 3', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', ARRAY['jane.doe@email.com'], '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000003', 'Patent Filing Deadline', 'Deadline to file patent application', NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days', 'deadline', true, '', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', ARRAY[], '00000000-0000-0000-0000-000000000002', NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000004', 'Estate Planning Consultation', 'Initial consultation for will and trust', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '90 minutes', 'consultation', false, 'Office', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', ARRAY['robert.wilson@email.com'], '00000000-0000-0000-0000-000000000002', NOW(), NOW());

-- Insert sample time entries
INSERT INTO time_entries (id, matter_id, user_id, description, hours, billable_rate, date, is_billable, created_at, updated_at) VALUES
  ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Contract review and analysis', 3.5, 350.00, CURRENT_DATE - INTERVAL '1 day', true, NOW(), NOW()),
  ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Client consultation and case assessment', 2.0, 350.00, CURRENT_DATE - INTERVAL '2 days', true, NOW(), NOW()),
  ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Patent research and documentation', 4.0, 275.00, CURRENT_DATE - INTERVAL '1 day', true, NOW(), NOW()),
  ('50000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Document preparation and filing', 1.5, 125.00, CURRENT_DATE, true, NOW(), NOW());

-- Insert sample invoices
INSERT INTO invoices (id, client_id, matter_id, invoice_number, amount, status, due_date, created_by, created_at, updated_at) VALUES
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'INV-2024-001', 1225.00, 'sent', CURRENT_DATE + INTERVAL '30 days', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'INV-2024-002', 887.50, 'draft', CURRENT_DATE + INTERVAL '30 days', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'INV-2024-003', 1100.00, 'paid', CURRENT_DATE - INTERVAL '5 days', '00000000-0000-0000-0000-000000000002', NOW(), NOW());
