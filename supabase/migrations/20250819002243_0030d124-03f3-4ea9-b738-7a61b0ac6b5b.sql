-- Update the source column check constraint to allow both 'app' and 'web' values
ALTER TABLE public.consents 
DROP CONSTRAINT IF EXISTS consents_source_check;

-- Add the updated constraint that allows both 'app' and 'web' values
ALTER TABLE public.consents 
ADD CONSTRAINT consents_source_check 
CHECK (source IN ('app', 'web'));