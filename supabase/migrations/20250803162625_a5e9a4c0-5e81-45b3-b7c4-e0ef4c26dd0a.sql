-- Drop trigger first to remove dependency
DROP TRIGGER IF EXISTS update_professional_signatures_updated_at ON public.professional_signatures;

-- Drop and recreate the function with proper security settings
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_professional_signatures_updated_at
BEFORE UPDATE ON public.professional_signatures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fix existing webhook function if it exists
CREATE OR REPLACE FUNCTION public.update_webhook_processed_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.processed = true AND OLD.processed = false THEN
    NEW.processed_at = now();
  END IF;
  RETURN NEW;
END;
$$;