-- Create storage bucket for signature photos
INSERT INTO storage.buckets (id, name, public) VALUES ('signature-photos', 'signature-photos', false);

-- Create policies for signature photos
CREATE POLICY "Users can view signature photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'signature-photos');

CREATE POLICY "Users can upload signature photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'signature-photos');

-- Add photo columns to consent_forms table
ALTER TABLE consent_forms 
ADD COLUMN patient_photo_url TEXT,
ADD COLUMN professional_photo_url TEXT;