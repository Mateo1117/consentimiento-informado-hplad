-- Corregir todas las columnas faltantes y problemas en la tabla consents

-- Primero agregar las columnas que faltan
DO $$
BEGIN
  -- Agregar signature_data si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consents' AND column_name = 'signature_data') THEN
    ALTER TABLE consents ADD COLUMN signature_data text;
  END IF;
  
  -- Verificar si patient_photo_url ya existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consents' AND column_name = 'patient_photo_url') THEN
    ALTER TABLE consents ADD COLUMN patient_photo_url text;
  END IF;
END
$$;

-- Corregir las funciones RPC para usar las columnas correctas
DROP FUNCTION IF EXISTS get_consent_by_token_secure(text, text, text);
DROP FUNCTION IF EXISTS sign_consent_by_token_secure(text, text, text, text, text, text, text);

-- Función corregida para obtener consentimiento por token
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
SET search_path = public, extensions
AS $$
BEGIN
  -- Log del acceso (opcional, tabla puede no existir)
  BEGIN
    INSERT INTO consent_access_logs (share_token, ip_address, user_agent, accessed_at)
    VALUES (p_token, p_ip_address, p_user_agent, now())
    ON CONFLICT DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- Ignorar errores de log
      NULL;
  END;

  -- Retornar datos del consentimiento si es válido
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
END;
$$;

-- Función corregida para firmar consentimiento por token
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
SET search_path = public, extensions
AS $$
DECLARE
  v_consent_id uuid;
  v_current_status text;
  v_expires_at timestamptz;
BEGIN
  -- Verificar que el consentimiento existe y es válido
  SELECT c.id, c.status, c.share_expires_at
  INTO v_consent_id, v_current_status, v_expires_at
  FROM consents c
  WHERE c.share_token = p_token;

  -- Validaciones
  IF v_consent_id IS NULL THEN
    RAISE EXCEPTION 'Token de consentimiento no válido';
  END IF;

  IF v_current_status = 'signed' THEN
    RAISE EXCEPTION 'Este consentimiento ya ha sido firmado';
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RAISE EXCEPTION 'El enlace de consentimiento ha expirado';
  END IF;

  -- Actualizar el consentimiento con la firma usando las columnas correctas
  UPDATE consents
  SET 
    status = 'signed',
    signed_at = now(),
    signed_by_name = p_signed_by_name,
    signature_data = p_signature_data,  -- Usar signature_data
    patient_signature_data = p_signature_data,  -- También actualizar este por compatibilidad
    patient_photo_url = COALESCE(p_patient_photo_url, patient_photo_url),
    updated_at = now()
  WHERE share_token = p_token;

  -- Log de la firma (opcional)
  BEGIN
    INSERT INTO consent_signature_logs (
      consent_id, 
      signed_by_name, 
      ip_address, 
      user_agent, 
      signed_at
    )
    VALUES (
      v_consent_id, 
      p_signed_by_name, 
      p_ip_address, 
      p_user_agent, 
      now()
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Ignorar errores de log
      NULL;
  END;

  -- Retornar resultado
  RETURN QUERY
  SELECT 
    v_consent_id as id,
    'signed'::text as status,
    now() as signed_at;
END;
$$;

-- Función auxiliar para crear tablas de log si no existen
CREATE TABLE IF NOT EXISTS consent_signature_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  consent_id uuid REFERENCES consents(id),
  signed_by_name text NOT NULL,
  ip_address text,
  user_agent text,
  signed_at timestamptz DEFAULT now()
);

-- Verificar índices
CREATE INDEX IF NOT EXISTS idx_consent_signature_logs_consent_id ON consent_signature_logs(consent_id);