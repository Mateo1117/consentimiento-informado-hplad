-- Create storage bucket for PDFs if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('consent-pdfs', 'consent-pdfs', false, 52428800) -- 50MB limit
ON CONFLICT (id) DO NOTHING;

-- RLS policies for PDF storage
CREATE POLICY "Users can upload their own PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'consent-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'consent-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own PDFs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'consent-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'consent-pdfs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add source column to track where consent was created
ALTER TABLE public.consents 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'app' CHECK (source IN ('app', 'mobile'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_consents_source ON public.consents(source);
CREATE INDEX IF NOT EXISTS idx_consents_created_by_status ON public.consents(created_by, status);