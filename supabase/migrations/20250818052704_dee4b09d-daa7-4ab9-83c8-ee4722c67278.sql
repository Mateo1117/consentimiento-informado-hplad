-- Eliminar todas las funciones duplicadas y crear versiones limpias

-- Eliminar TODAS las versiones existentes de las funciones
DROP FUNCTION IF EXISTS get_consent_by_token_secure(text, inet, text);
DROP FUNCTION IF EXISTS get_consent_by_token_secure(text, text, text);
DROP FUNCTION IF EXISTS sign_consent_by_token_secure(text, text, text, text, text, inet, text);
DROP FUNCTION IF EXISTS sign_consent_by_token_secure(text, text, text, text, text, text, text);

-- Crear versión única y limpia para obtener consentimiento
CREATE OR REPLACE FUNCTION get_consent_by_token_secure(
  p_token text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  patient_name text,
  patient_document_type text,
  patient_document_number text,
  patient_email text,
  patient_phone text,
  consent_type text,
  payload jsonb,
  status text,
  share_expires_at timestamptz,
  signed_at timestamptz,
  signed_by_name text,
  patient_photo_url text,
  professional_name text,
  professional_document text,
  professional_signature_data text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validar token
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RAISE EXCEPTION 'Token inválido';
  END IF;

  -- Retornar datos del consentimiento
  RETURN QUERY
  SELECT 
    c.id,
    c.patient_name,
    c.patient_document_type,
    c.patient_document_number,
    c.patient_email,
    c.patient_phone,
    c.consent_type,
    c.payload,
    c.status,
    c.share_expires_at,
    c.signed_at,
    c.signed_by_name,
    c.patient_photo_url,
    c.professional_name,
    c.professional_document,
    c.professional_signature_data
  FROM consents c
  WHERE c.share_token = p_token
    AND (c.share_expires_at IS NULL OR c.share_expires_at > now());
    
  -- Si no se encuentra, lanzar excepción
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consentimiento no encontrado o enlace expirado';
  END IF;
END;
$$;

-- Crear versión única y limpia para firmar consentimiento
CREATE OR REPLACE FUNCTION sign_consent_by_token_secure(
  p_token text,
  p_signature_data text,
  p_signed_by_name text,
  p_patient_photo_url text DEFAULT NULL,
  p_verification_code text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  status text,
  signed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consent_id uuid;
  v_current_status text;
  v_expires_at timestamptz;
BEGIN
  -- Validaciones de entrada
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RAISE EXCEPTION 'Token inválido';
  END IF;
  
  IF p_signature_data IS NULL OR length(trim(p_signature_data)) = 0 THEN
    RAISE EXCEPTION 'Datos de firma requeridos';
  END IF;
  
  IF p_signed_by_name IS NULL OR length(trim(p_signed_by_name)) = 0 THEN
    RAISE EXCEPTION 'Nombre del firmante requerido';
  END IF;

  -- Verificar que el consentimiento existe y es válido
  SELECT c.id, c.status, c.share_expires_at
  INTO v_consent_id, v_current_status, v_expires_at
  FROM consents c
  WHERE c.share_token = p_token;

  -- Validaciones del consentimiento
  IF v_consent_id IS NULL THEN
    RAISE EXCEPTION 'Token de consentimiento no válido';
  END IF;

  IF v_current_status = 'signed' THEN
    RAISE EXCEPTION 'Este consentimiento ya ha sido firmado';
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RAISE EXCEPTION 'El enlace de consentimiento ha expirado';
  END IF;

  -- Actualizar el consentimiento con la firma
  UPDATE consents
  SET 
    status = 'signed',
    signed_at = now(),
    signed_by_name = p_signed_by_name,
    signature_data = p_signature_data,
    patient_signature_data = p_signature_data, -- Por compatibilidad
    patient_photo_url = COALESCE(p_patient_photo_url, patient_photo_url),
    updated_at = now()
  WHERE share_token = p_token;

  -- Retornar resultado
  RETURN QUERY
  SELECT 
    v_consent_id as id,
    'signed'::text as status,
    now() as signed_at;
END;
$$;