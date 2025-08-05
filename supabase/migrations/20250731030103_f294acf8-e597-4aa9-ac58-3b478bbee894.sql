-- Asegurar que el bucket signature-photos exista y sea público
INSERT INTO storage.buckets (id, name, public)
VALUES ('signature-photos', 'signature-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Crear políticas para permitir el acceso público a las fotos de firmas
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'signature-photos');

CREATE POLICY "Allow upload of signature photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'signature-photos');

CREATE POLICY "Allow update of signature photos" ON storage.objects
FOR UPDATE USING (bucket_id = 'signature-photos');

CREATE POLICY "Allow delete of signature photos" ON storage.objects
FOR DELETE USING (bucket_id = 'signature-photos');