-- Crear bucket para PDFs de consentimientos
INSERT INTO storage.buckets (id, name, public)
VALUES ('consent-pdfs', 'consent-pdfs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Crear políticas para permitir el acceso público a los PDFs
CREATE POLICY "Public PDF Access" ON storage.objects
FOR SELECT USING (bucket_id = 'consent-pdfs');

CREATE POLICY "Allow upload of consent PDFs" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'consent-pdfs');

CREATE POLICY "Allow update of consent PDFs" ON storage.objects
FOR UPDATE USING (bucket_id = 'consent-pdfs');

CREATE POLICY "Allow delete of consent PDFs" ON storage.objects
FOR DELETE USING (bucket_id = 'consent-pdfs');