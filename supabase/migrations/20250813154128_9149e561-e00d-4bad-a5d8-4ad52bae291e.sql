-- Fix the ambiguous status column reference in sign_consent_by_token function
CREATE OR REPLACE FUNCTION public.sign_consent_by_token(p_token text, p_signature_data text, p_signed_by_name text)
 RETURNS TABLE(id uuid, signed_at timestamp with time zone, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Update the consent record
  UPDATE public.consents
  SET patient_signature_data = p_signature_data,
      signed_by_name = p_signed_by_name,
      signed_at = v_now,
      status = 'signed'
  WHERE share_token = p_token
    AND (share_expires_at IS NULL OR v_now <= share_expires_at)
    AND consents.status <> 'signed'  -- Explicitly qualify the status column
  RETURNING consents.id INTO v_id;

  -- Check if update was successful
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token, or already signed';
  END IF;

  -- Return the result with explicit column aliases
  RETURN QUERY SELECT v_id AS id, v_now AS signed_at, 'signed'::TEXT AS status;
END;
$function$;