-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true);

-- Create RLS policies for photos bucket
CREATE POLICY "Anyone can view photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'photos');

CREATE POLICY "Authenticated users can upload photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'photos' AND auth.uid() IS NOT NULL);

-- Update the sign_consent_by_token function to include patient photo
CREATE OR REPLACE FUNCTION public.sign_consent_by_token(
  p_token text, 
  p_signature_data text, 
  p_signed_by_name text,
  p_patient_photo_url text DEFAULT NULL
)
RETURNS TABLE(id uuid, signed_at timestamp with time zone, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
  v_now TIMESTAMPTZ := now();
  v_consent_record consents%ROWTYPE;
BEGIN
  -- Get the consent record with professional signature from creator
  SELECT c.*, ps.signature_data as prof_signature, ps.professional_name as prof_name
  INTO v_consent_record
  FROM public.consents c
  LEFT JOIN public.professional_signatures ps ON ps.created_by = c.created_by
  WHERE c.share_token = p_token
    AND (c.share_expires_at IS NULL OR v_now <= c.share_expires_at)
    AND c.status <> 'signed';

  -- Check if consent was found
  IF v_consent_record.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token, or already signed';
  END IF;

  -- Update the consent record with all signature data
  UPDATE public.consents
  SET patient_signature_data = p_signature_data,
      signed_by_name = p_signed_by_name,
      signed_at = v_now,
      status = 'signed',
      patient_photo_url = p_patient_photo_url,
      professional_signature_data = v_consent_record.prof_signature,
      professional_name = v_consent_record.prof_name
  WHERE id = v_consent_record.id
  RETURNING id INTO v_id;

  -- Return the result
  RETURN QUERY SELECT v_id AS id, v_now AS signed_at, 'signed'::TEXT AS status;
END;
$function$;