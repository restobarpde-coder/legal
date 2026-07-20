-- Expand clients table with new personal data fields
ALTER TABLE clients ADD COLUMN IF NOT EXISTS rut VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ci VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS departamento VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pais VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS conyuge VARCHAR(255);

-- Create case_counterparties table for multiple counterparties per case
CREATE TABLE IF NOT EXISTS case_counterparties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  lawyer VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_case_counterparties_case_id ON case_counterparties(case_id);

-- Migrate existing counterparty data from cases table to new table
INSERT INTO case_counterparties (case_id, name, lawyer, created_at, updated_at)
SELECT
  id,
  counterparty_name,
  counterparty_lawyer,
  created_at,
  updated_at
FROM cases
WHERE counterparty_name IS NOT NULL OR counterparty_lawyer IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop old counterparty columns from cases table
ALTER TABLE cases DROP COLUMN IF EXISTS counterparty_name;
ALTER TABLE cases DROP COLUMN IF EXISTS counterparty_lawyer;

-- Enable RLS on case_counterparties
ALTER TABLE case_counterparties ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for case_counterparties
CREATE POLICY "Users can view counterparties of their cases" ON case_counterparties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_counterparties.case_id
      AND cases.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert counterparties to their cases" ON case_counterparties
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_counterparties.case_id
      AND cases.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update counterparties of their cases" ON case_counterparties
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_counterparties.case_id
      AND cases.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete counterparties of their cases" ON case_counterparties
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_counterparties.case_id
      AND cases.created_by = auth.uid()
    )
  );
