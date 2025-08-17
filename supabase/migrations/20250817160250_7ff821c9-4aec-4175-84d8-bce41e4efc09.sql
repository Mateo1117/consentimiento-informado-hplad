-- Remove the unique constraint on professional_document
ALTER TABLE professional_signatures DROP CONSTRAINT IF EXISTS professional_signatures_professional_document_key;

-- Add a unique constraint on created_by to ensure one signature per user
ALTER TABLE professional_signatures ADD CONSTRAINT professional_signatures_created_by_key UNIQUE (created_by);