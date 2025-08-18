-- Habilitar RLS en consent_signature_logs y corregir problemas de seguridad

-- Habilitar RLS en la tabla consent_signature_logs
ALTER TABLE consent_signature_logs ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para consent_signature_logs
CREATE POLICY "Only admins can view signature logs"
  ON consent_signature_logs
  FOR SELECT
  USING (is_admin_user());

CREATE POLICY "Only system can insert signature logs"
  ON consent_signature_logs
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No updates on signature logs"
  ON consent_signature_logs
  FOR UPDATE
  USING (false);

CREATE POLICY "No deletes on signature logs"
  ON consent_signature_logs
  FOR DELETE
  USING (false);