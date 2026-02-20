-- Permitir que usuarios anónimos suban PDFs de firmas remotas a consent-pdfs/remote_signed/
-- (la firma pública no tiene sesión de usuario)
CREATE POLICY "Anon can upload remote signed PDFs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'consent-pdfs'
  AND (storage.foldername(name))[1] = 'remote_signed'
);

-- Anon puede leer también para crear signed URL (aunque solo authenticated puede crearla via API)
CREATE POLICY "Public can read remote signed PDFs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'consent-pdfs'
  AND (storage.foldername(name))[1] = 'remote_signed'
);