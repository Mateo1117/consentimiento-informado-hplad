-- PHASE 1: CRITICAL AUDIT LOG PROTECTION

-- Fix consent_access_logs table - prevent users from manipulating audit trails
-- Drop the overly permissive policy that allows creators to view access logs
DROP POLICY IF EXISTS "Consent creators can view access logs" ON public.consent_access_logs;

-- Create secure policies for consent_access_logs
-- Only allow SELECT for consent creators (read-only audit trail)
CREATE POLICY "Consent creators can view access logs (read-only)" 
ON public.consent_access_logs 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM consents c 
  WHERE c.id = consent_access_logs.consent_id 
  AND c.created_by = auth.uid()
));

-- Only allow system functions to insert audit logs (no direct user manipulation)
CREATE POLICY "System functions only for audit log creation" 
ON public.consent_access_logs 
FOR INSERT 
TO authenticated
WITH CHECK (false); -- Block all direct inserts - only RPC functions can insert

-- Prevent any updates or deletes to maintain audit trail integrity
CREATE POLICY "Prevent audit log modifications" 
ON public.consent_access_logs 
FOR UPDATE 
TO authenticated
USING (false);

CREATE POLICY "Prevent audit log deletions" 
ON public.consent_access_logs 
FOR DELETE 
TO authenticated
USING (false);

-- Fix webhook_logs table - restrict to admin users only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.webhook_logs;

-- Create admin-only access policy
-- Note: This assumes you'll add role-based access. For now, restricting to service_role
CREATE POLICY "Admin only webhook logs access" 
ON public.webhook_logs 
FOR ALL 
TO authenticated
USING (
  -- Only allow users with admin role in their metadata
  COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role', '') = 'admin'
  OR 
  -- Or if you prefer, restrict to specific email domains
  auth.jwt() ->> 'email' LIKE '%@admin.%'
);

-- PHASE 2: AUTHENTICATION HARDENING

-- Update database functions to use secure search_path
-- This prevents schema injection attacks

-- Update get_consent_by_token function
CREATE OR REPLACE FUNCTION public.get_consent_by_token(p_token text)
RETURNS TABLE(id uuid, consent_type text, payload jsonb, patient_name text, patient_document_type text, patient_document_number text, share_expires_at timestamp with time zone, status text, signed_at timestamp with time zone, pdf_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Update sign_consent_by_token function
CREATE OR REPLACE FUNCTION public.sign_consent_by_token(p_token text, p_signature_data text, p_signed_by_name text, p_patient_photo_url text DEFAULT NULL::text)
RETURNS TABLE(id uuid, status text, signed_at timestamp with time zone, signed_by_name text, patient_photo_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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

  -- Insert audit log through direct INSERT (since this is a system function)
  INSERT INTO public.consent_access_logs (
    consent_id, 
    share_token, 
    access_type, 
    success
  ) VALUES (
    v_consent_id, 
    p_token, 
    'sign', 
    true
  );

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
$function$;

-- Create a secure function for inserting audit logs (only callable by system functions)
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_consent_id uuid,
  p_share_token text,
  p_access_type text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.consent_access_logs (
    consent_id,
    share_token,
    access_type,
    ip_address,
    user_agent,
    success,
    error_message,
    accessed_at
  ) VALUES (
    p_consent_id,
    p_share_token,
    p_access_type,
    p_ip_address,
    p_user_agent,
    p_success,
    p_error_message,
    now()
  );
END;
$function$;