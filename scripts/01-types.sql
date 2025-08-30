-- Legal Office MVP - Database Types
-- Run this first to create custom types

-- Case status enum
CREATE TYPE case_status AS ENUM (
  'active',
  'pending',
  'closed',
  'archived'
);

-- Task priority enum  
CREATE TYPE task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Task status enum
CREATE TYPE task_status AS ENUM (
  'pending',
  'in_progress', 
  'completed',
  'cancelled'
);

-- Document type enum
CREATE TYPE document_type AS ENUM (
  'contract',
  'brief',
  'evidence',
  'correspondence',
  'court_filing',
  'other'
);

-- User role enum
CREATE TYPE user_role AS ENUM (
  'admin',
  'lawyer',
  'assistant'
);
