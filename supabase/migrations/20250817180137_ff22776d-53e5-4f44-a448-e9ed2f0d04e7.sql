-- Fix security issues with consent access

-- 1. First, let's create a more secure version of get_consent_by_token
-- This version ensures proper access control and sets search_path
CREATE OR REPLACE FUNCTION public.get_consent_by_token(p_token text)
RETURNS TABLE(
  id uuid, 
  consent_type text, 
  payload jsonb, 
  patient_name text, 
  patient_document_type text, 
  patient_document_number text, 
  share_expires_at timestamp with time zone, 
  status text, 
  signed_at timestamp with time zone, 
  pdf_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Validate token format first
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RAISE EXCEPTION 'Invalid token format';
  END IF;

  -- Return consent data only if token is valid and not expired
  -- This function is specifically for public access via share tokens
  RETURN QUERY
  SELECT 
    c.id, 
    c.consent_type, 
    c.payload, 
    c.patient_name, 
    c.patient_document_type, 
    c.patient_document_number,
    c.share_expires_at, 
    c.status, 
    c.signed_at, 
    c.pdf_url
  FROM public.consents c
  WHERE c.share_token = p_token
    AND c.status IN ('sent', 'signed')  -- Only allow access to valid consents
    AND (c.share_expires_at IS NULL OR now() <= c.share_expires_at);
    
  -- If no rows returned, the token is invalid or expired
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token inválido o expirado';
  END IF;
END;
$$;

-- 2. Update sign_consent_by_token with better security
CREATE OR REPLACE FUNCTION public.sign_consent_by_token(
  p_token text, 
  p_signature_data text, 
  p_signed_by_name text, 
  p_patient_photo_url text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, 
  status text, 
  signed_at timestamp with time zone, 
  signed_by_name text, 
  patient_photo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_consent_id uuid;
  v_now timestamptz := now();
  v_prof_signature text;
  v_prof_name text;
BEGIN
  -- Validate inputs
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RAISE EXCEPTION 'Token inválido';
  END IF;
  
  IF p_signature_data IS NULL OR length(trim(p_signature_data)) = 0 THEN
    RAISE EXCEPTION 'Datos de firma requeridos';
  END IF;
  
  IF p_signed_by_name IS NULL OR length(trim(p_signed_by_name)) = 0 THEN
    RAISE EXCEPTION 'Nombre del firmante requerido';
  END IF;

  -- Find the consent and verify it can be signed
  SELECT c.id INTO v_consent_id
  FROM consents c
  WHERE c.share_token = p_token
    AND c.status = 'sent'  -- Only allow signing of 'sent' consents
    AND (c.share_expires_at IS NULL OR v_now <= c.share_expires_at);

  -- Check if consent was found
  IF v_consent_id IS NULL THEN
    RAISE EXCEPTION 'Token inválido, expirado o ya firmado';
  END IF;

  -- Get professional signature if exists
  SELECT ps.signature_data, ps.professional_name
  INTO v_prof_signature, v_prof_name
  FROM consents c
  LEFT JOIN professional_signatures ps ON ps.created_by = c.created_by
  WHERE c.id = v_consent_id;

  -- Update the consent with signature data
  UPDATE consents
  SET 
    patient_signature_data = p_signature_data,
    signed_by_name = p_signed_by_name,
    signed_at = v_now,
    status = 'signed',
    patient_photo_url = p_patient_photo_url,
    professional_signature_data = COALESCE(v_prof_signature, professional_signature_data),
    professional_name = COALESCE(v_prof_name, professional_name),
    updated_at = v_now
  WHERE id = v_consent_id;

  -- Return the updated data
  RETURN QUERY
  SELECT 
    v_consent_id as id,
    'signed'::text as status,
    v_now as signed_at,
    p_signed_by_name as signed_by_name,
    p_patient_photo_url as patient_photo_url;
END;
$$;

-- 3. Create a policy for public access to consents (for share tokens)
-- This allows anonymous users to access consents via valid share tokens
CREATE POLICY "Allow public access via valid share tokens" 
ON public.consents 
FOR SELECT 
TO anon, authenticated
USING (
  share_token IS NOT NULL 
  AND status IN ('sent', 'signed')
  AND (share_expires_at IS NULL OR now() <= share_expires_at)
);

-- 4. Create a policy for public updates via share tokens (for signing)
CREATE POLICY "Allow public signing via valid share tokens"
ON public.consents
FOR UPDATE
TO anon, authenticated
USING (
  share_token IS NOT NULL 
  AND status = 'sent'
  AND (share_expires_at IS NULL OR now() <= share_expires_at)
)
WITH CHECK (
  status = 'signed'
  AND signed_at IS NOT NULL
  AND patient_signature_data IS NOT NULL
  AND signed_by_name IS NOT NULL
);

-- 5. Grant execute permissions on the functions to public
GRANT EXECUTE ON FUNCTION public.get_consent_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_consent_by_token(text, text, text, text) TO anon, authenticated;