-- Agregar campos para guardar las firmas en base64
ALTER TABLE public.consent_forms 
ADD COLUMN IF NOT EXISTS patient_signature_data TEXT,
ADD COLUMN IF NOT EXISTS professional_signature_data TEXT;