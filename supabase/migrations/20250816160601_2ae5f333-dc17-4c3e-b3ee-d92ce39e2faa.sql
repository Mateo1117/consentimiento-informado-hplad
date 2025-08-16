-- Verificar y corregir la función sign_consent_by_token
DROP FUNCTION IF EXISTS public.sign_consent_by_token(text, text, text, text);

CREATE OR REPLACE FUNCTION public.sign_consent_by_token(
  p_token TEXT,
  p_signature_data TEXT,
  p_signed_by_name TEXT,
  p_patient_photo_url TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  status TEXT,
  signed_at TIMESTAMPTZ,
  signed_by_name TEXT,
  patient_photo_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  consent_record RECORD;
BEGIN
  -- Buscar el consentimiento por token
  SELECT * INTO consent_record 
  FROM consents 
  WHERE share_token = p_token
    AND share_expires_at > NOW()
    AND status = 'sent';
    
  -- Si no se encuentra el consentimiento
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consentimiento no encontrado, expirado o ya firmado';
  END IF;
  
  -- Actualizar el consentimiento con la firma
  UPDATE consents SET
    status = 'signed',
    signed_at = NOW(),
    signed_by_name = p_signed_by_name,
    patient_signature_data = p_signature_data,
    patient_photo_url = p_patient_photo_url,
    updated_at = NOW()
  WHERE share_token = p_token;
  
  -- Retornar los datos actualizados
  RETURN QUERY
  SELECT 
    consents.id,
    consents.status,
    consents.signed_at,
    consents.signed_by_name,
    consents.patient_photo_url
  FROM consents 
  WHERE share_token = p_token;
END;
$$;