-- Add PDF storage columns to consent_forms table
ALTER TABLE public.consent_forms 
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS pdf_size_kb INTEGER;