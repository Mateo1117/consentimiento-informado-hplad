-- Eliminar las políticas existentes que requieren autenticación
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access for photos" ON storage.objects;

-- Crear nuevas políticas que permiten acceso público para subida de fotos
-- Política para permitir SELECT (lectura) pública
CREATE POLICY "Public read access for photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'photos');

-- Política para permitir INSERT (subida) pública - sin autenticación requerida
CREATE POLICY "Public upload access for photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'photos');

-- Política para permitir UPDATE público (necesario para algunos casos de uso)
CREATE POLICY "Public update access for photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'photos');

-- Política para permitir DELETE público (para limpieza de archivos temporales)
CREATE POLICY "Public delete access for photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'photos');