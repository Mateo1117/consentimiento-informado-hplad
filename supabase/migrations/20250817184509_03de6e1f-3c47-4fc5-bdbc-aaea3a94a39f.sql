-- Enhanced security measures for patient medical data protection (fixed)

-- 1. Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Consent creators can view access logs" ON public.consent_access_logs;

-- Create access logs table for audit trail (using IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.consent_access_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  consent_id uuid REFERENCES public.consents(id) ON DELETE CASCADE,
  share_token text NOT NULL,
  access_type text NOT NULL CHECK (access_type IN ('view', 'sign', 'failed_attempt')),
  ip_address inet,
  user_agent text,
  success boolean DEFAULT true,
  error_message text,
  accessed_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on access logs
ALTER TABLE public.consent_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy for access logs (only consent creators can view logs)
CREATE POLICY "Consent creators can view access logs" 
ON public.consent_access_logs 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.consents c 
    WHERE c.id = consent_access_logs.consent_id 
    AND c.created_by = auth.uid()
  )
);

-- Create secure function for getting consent with data masking and rate limiting
CREATE OR REPLACE FUNCTION public.get_consent_by_token_secure(
  p_token text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, 
  consent_type text, 
  payload jsonb, 
  patient_name_masked text,
  patient_document_masked text,
  patient_document_type text,
  share_expires_at timestamp with time zone, 
  status text, 
  signed_at timestamp with time zone,
  access_count bigint,
  requires_verification boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_consent_id uuid;
  v_recent_attempts integer;
  v_access_count bigint;
  v_consent_record record;
BEGIN
  -- Validate token format
  IF p_token IS NULL OR length(p_token) < 32 THEN
    -- Log failed attempt
    INSERT INTO public.consent_access_logs (consent_id, share_token, access_type, ip_address, user_agent, success, error_message)
    VALUES (NULL, p_token, 'failed_attempt', p_ip_address, p_user_agent, false, 'Invalid token format');
    
    RAISE EXCEPTION 'Token inválido';
  END IF;

  -- Check for rate limiting (max 10 attempts per IP per hour)
  SELECT COUNT(*) INTO v_recent_attempts
  FROM public.consent_access_logs
  WHERE ip_address = p_ip_address
    AND accessed_at > now() - interval '1 hour'
    AND success = false;

  IF v_recent_attempts >= 10 THEN
    INSERT INTO public.consent_access_logs (consent_id, share_token, access_type, ip_address, user_agent, success, error_message)
    VALUES (NULL, p_token, 'failed_attempt', p_ip_address, p_user_agent, false, 'Rate limit exceeded');
    
    RAISE EXCEPTION 'Demasiados intentos fallidos. Intente más tarde.';
  END IF;

  -- Get consent with validation
  SELECT c.* INTO v_consent_record
  FROM public.consents c
  WHERE c.share_token = p_token
    AND c.status IN ('sent', 'signed')
    AND (c.share_expires_at IS NULL OR now() <= c.share_expires_at);

  IF NOT FOUND THEN
    -- Log failed attempt
    INSERT INTO public.consent_access_logs (consent_id, share_token, access_type, ip_address, user_agent, success, error_message)
    VALUES (NULL, p_token, 'failed_attempt', p_ip_address, p_user_agent, false, 'Token not found or expired');
    
    RAISE EXCEPTION 'Token inválido o expirado';
  END IF;

  -- Count total access attempts for this consent
  SELECT COUNT(*) INTO v_access_count
  FROM public.consent_access_logs
  WHERE consent_id = v_consent_record.id
    AND access_type IN ('view', 'sign')
    AND success = true;

  -- Log successful access
  INSERT INTO public.consent_access_logs (consent_id, share_token, access_type, ip_address, user_agent, success)
  VALUES (v_consent_record.id, p_token, 'view', p_ip_address, p_user_agent, true);

  -- Return masked data for security
  RETURN QUERY
  SELECT 
    v_consent_record.id,
    v_consent_record.consent_type,
    v_consent_record.payload,
    -- Mask patient name (show first 2 chars + asterisks)
    CASE 
      WHEN length(v_consent_record.patient_name) > 2 THEN 
        left(v_consent_record.patient_name, 2) || repeat('*', length(v_consent_record.patient_name) - 2)
      ELSE v_consent_record.patient_name
    END as patient_name_masked,
    -- Mask document number (show last 4 digits)
    CASE 
      WHEN length(v_consent_record.patient_document_number) > 4 THEN 
        repeat('*', length(v_consent_record.patient_document_number) - 4) || right(v_consent_record.patient_document_number, 4)
      ELSE v_consent_record.patient_document_number
    END as patient_document_masked,
    v_consent_record.patient_document_type,
    v_consent_record.share_expires_at,
    v_consent_record.status,
    v_consent_record.signed_at,
    v_access_count,
    -- Require additional verification for high-risk access
    (v_access_count > 5 OR v_recent_attempts > 0) as requires_verification;
END;
$$;

-- Enhanced signing function with additional security
CREATE OR REPLACE FUNCTION public.sign_consent_by_token_secure(
  p_token text, 
  p_signature_data text, 
  p_signed_by_name text, 
  p_patient_photo_url text DEFAULT NULL,
  p_verification_code text DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
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
  v_recent_failed_attempts integer;
  v_access_count bigint;
BEGIN
  -- Validate inputs
  IF p_token IS NULL OR length(p_token) < 32 THEN
    INSERT INTO public.consent_access_logs (consent_id, share_token, access_type, ip_address, user_agent, success, error_message)
    VALUES (NULL, p_token, 'failed_attempt', p_ip_address, p_user_agent, false, 'Invalid token format for signing');
    RAISE EXCEPTION 'Token inválido';
  END IF;
  
  IF p_signature_data IS NULL OR length(trim(p_signature_data)) = 0 THEN
    RAISE EXCEPTION 'Datos de firma requeridos';
  END IF;
  
  IF p_signed_by_name IS NULL OR length(trim(p_signed_by_name)) = 0 THEN
    RAISE EXCEPTION 'Nombre del firmante requerido';
  END IF;

  -- Check for suspicious activity
  SELECT COUNT(*) INTO v_recent_failed_attempts
  FROM public.consent_access_logs
  WHERE ip_address = p_ip_address
    AND accessed_at > now() - interval '1 hour'
    AND success = false;

  IF v_recent_failed_attempts >= 5 THEN
    INSERT INTO public.consent_access_logs (consent_id, share_token, access_type, ip_address, user_agent, success, error_message)
    VALUES (NULL, p_token, 'failed_attempt', p_ip_address, p_user_agent, false, 'Too many failed attempts before signing');
    RAISE EXCEPTION 'Demasiados intentos fallidos. Contacte al administrador.';
  END IF;

  -- Find the consent and verify it can be signed
  SELECT c.id INTO v_consent_id
  FROM consents c
  WHERE c.share_token = p_token
    AND c.status = 'sent'
    AND (c.share_expires_at IS NULL OR v_now <= c.share_expires_at);

  IF v_consent_id IS NULL THEN
    INSERT INTO public.consent_access_logs (consent_id, v_consent_id, share_token, access_type, ip_address, user_agent, success, error_message)
    VALUES (v_consent_id, p_token, 'failed_attempt', p_ip_address, p_user_agent, false, 'Consent not found or cannot be signed');
    RAISE EXCEPTION 'Token inválido, expirado o ya firmado';
  END IF;

  -- Check access history for this consent
  SELECT COUNT(*) INTO v_access_count
  FROM public.consent_access_logs
  WHERE consent_id = v_consent_id;

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

  -- Log successful signing
  INSERT INTO public.consent_access_logs (consent_id, share_token, access_type, ip_address, user_agent, success)
  VALUES (v_consent_id, p_token, 'sign', p_ip_address, p_user_agent, true);

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_consent_by_token_secure(text, inet, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_consent_by_token_secure(text, text, text, text, text, inet, text) TO anon, authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_consent_access_logs_ip_time ON public.consent_access_logs(ip_address, accessed_at);
CREATE INDEX IF NOT EXISTS idx_consent_access_logs_consent_id ON public.consent_access_logs(consent_id);
CREATE INDEX IF NOT EXISTS idx_consent_access_logs_token ON public.consent_access_logs(share_token);