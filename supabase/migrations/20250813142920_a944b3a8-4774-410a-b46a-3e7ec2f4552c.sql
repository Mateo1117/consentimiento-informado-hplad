-- Create consents table to support shareable signing links
CREATE TABLE IF NOT EXISTS public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  patient_name TEXT NOT NULL,
  patient_document_type TEXT,
  patient_document_number TEXT,
  patient_email TEXT,
  patient_phone TEXT,
  consent_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'sent',
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  share_expires_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signed_by_name TEXT,
  patient_signature_data TEXT,
  pdf_url TEXT,
  pdf_size INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users owning the record
CREATE POLICY IF NOT EXISTS "Users can view their own consents"
ON public.consents FOR SELECT
USING (created_by IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY IF NOT EXISTS "Users can insert their own consents"
ON public.consents FOR INSERT
WITH CHECK (created_by IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY IF NOT EXISTS "Users can update their own consents"
ON public.consents FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY IF NOT EXISTS "Users can delete their own consents"
ON public.consents FOR DELETE
USING (auth.uid() = created_by);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_consents_updated_at ON public.consents;
CREATE TRIGGER update_consents_updated_at
BEFORE UPDATE ON public.consents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function: get consent by token (public, read-only)
CREATE OR REPLACE FUNCTION public.get_consent_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  consent_type TEXT,
  payload JSONB,
  patient_name TEXT,
  patient_document_type TEXT,
  patient_document_number TEXT,
  share_expires_at TIMESTAMPTZ,
  status TEXT,
  signed_at TIMESTAMPTZ,
  pdf_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.consent_type, c.payload, c.patient_name, c.patient_document_type, c.patient_document_number,
         c.share_expires_at, c.status, c.signed_at, c.pdf_url
  FROM public.consents c
  WHERE c.share_token = p_token
    AND (c.share_expires_at IS NULL OR now() <= c.share_expires_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_consent_by_token(TEXT) TO anon, authenticated;

-- Function: sign consent by token (public, write-only with token)
CREATE OR REPLACE FUNCTION public.sign_consent_by_token(
  p_token TEXT,
  p_signature_data TEXT,
  p_signed_by_name TEXT
)
RETURNS TABLE (
  id UUID,
  signed_at TIMESTAMPTZ,
  status TEXT
) AS $$
DECLARE
  v_id UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  UPDATE public.consents
  SET patient_signature_data = p_signature_data,
      signed_by_name = p_signed_by_name,
      signed_at = v_now,
      status = 'signed'
  WHERE share_token = p_token
    AND (share_expires_at IS NULL OR v_now <= share_expires_at)
    AND status <> 'signed'
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token, or already signed';
  END IF;

  RETURN QUERY SELECT v_id, v_now, 'signed'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.sign_consent_by_token(TEXT, TEXT, TEXT) TO anon, authenticated;