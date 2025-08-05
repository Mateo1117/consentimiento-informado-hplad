-- Fix the function security issues by setting search_path
DROP FUNCTION IF EXISTS public.update_updated_at_column();

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

-- Fix existing webhook function if it exists
DROP FUNCTION IF EXISTS public.update_webhook_processed_at();

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