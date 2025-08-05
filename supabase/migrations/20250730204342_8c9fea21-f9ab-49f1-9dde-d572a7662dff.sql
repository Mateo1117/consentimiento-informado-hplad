-- Create the consent_forms table
CREATE TABLE IF NOT EXISTS consent_forms (
  id BIGSERIAL PRIMARY KEY,
  patient_name TEXT NOT NULL,
  patient_surname TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_number TEXT NOT NULL,
  birth_date DATE NOT NULL,
  age INTEGER NOT NULL,
  eps TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  healthcare_center TEXT NOT NULL,
  selected_procedures TEXT[] NOT NULL,
  consent_decision TEXT NOT NULL CHECK (consent_decision IN ('aprobar', 'disentir')),
  professional_name TEXT NOT NULL,
  professional_document TEXT NOT NULL,
  guardian_name TEXT,
  guardian_document TEXT,
  guardian_relationship TEXT,
  additional_info TEXT,
  differential_approach JSONB NOT NULL DEFAULT '{}',
  pdf_filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_consent_forms_document_type ON consent_forms(document_type);
CREATE INDEX IF NOT EXISTS idx_consent_forms_document_number ON consent_forms(document_number);
CREATE INDEX IF NOT EXISTS idx_consent_forms_patient_name ON consent_forms(patient_name);
CREATE INDEX IF NOT EXISTS idx_consent_forms_patient_surname ON consent_forms(patient_surname);
CREATE INDEX IF NOT EXISTS idx_consent_forms_created_at ON consent_forms(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE consent_forms ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now (you can customize this later)
CREATE POLICY "Allow all operations on consent_forms" ON consent_forms
  FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON consent_forms TO postgres, anon, authenticated, service_role;
GRANT ALL ON SEQUENCE consent_forms_id_seq TO postgres, anon, authenticated, service_role;