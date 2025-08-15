-- Verificar si el bucket 'photos' existe
SELECT id, name, public FROM storage.buckets WHERE id = 'photos';

-- Si no existe, crear el bucket 'photos'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas RLS para el bucket 'photos'
-- Política para permitir SELECT (lectura) pública
CREATE POLICY "Public Access for photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'photos');

-- Política para permitir INSERT (subida) para todos los usuarios autenticados
CREATE POLICY "Authenticated users can upload photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'photos');

-- Política para permitir UPDATE para usuarios autenticados (solo sus propios archivos)
CREATE POLICY "Users can update own photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política para permitir DELETE para usuarios autenticados (solo sus propios archivos)
CREATE POLICY "Users can delete own photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);