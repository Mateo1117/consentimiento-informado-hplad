-- Corregir la función para obtener datos por separado
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
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_now timestamptz := now();
  v_prof_signature text;
  v_prof_name text;
BEGIN
  -- Primero verificar que el consentimiento existe y no está firmado
  SELECT c.id INTO v_id
  FROM consents c
  WHERE c.share_token = p_token
    AND (c.share_expires_at IS NULL OR v_now <= c.share_expires_at)
    AND c.status <> 'signed';

  -- Verificar si se encontró el consentimiento
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Token inválido, expirado o ya firmado';
  END IF;

  -- Obtener la firma profesional si existe
  SELECT ps.signature_data, ps.professional_name
  INTO v_prof_signature, v_prof_name
  FROM consents c
  LEFT JOIN professional_signatures ps ON ps.created_by = c.created_by
  WHERE c.id = v_id;

  -- Actualizar el consentimiento con todos los datos de firma
  UPDATE consents
  SET patient_signature_data = p_signature_data,
      signed_by_name = p_signed_by_name,
      signed_at = v_now,
      status = 'signed',
      patient_photo_url = p_patient_photo_url,
      professional_signature_data = COALESCE(v_prof_signature, professional_signature_data),
      professional_name = COALESCE(v_prof_name, professional_name),
      updated_at = v_now
  WHERE id = v_id;

  -- Retornar los datos actualizados
  RETURN QUERY
  SELECT 
    v_id,
    'signed'::text,
    v_now,
    p_signed_by_name,
    p_patient_photo_url;
END;
$$;