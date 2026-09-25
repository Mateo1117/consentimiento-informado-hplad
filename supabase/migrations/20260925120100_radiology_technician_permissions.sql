-- Permisos del rol "Técnico de Radiología", calcados de los de laboratorio
-- (create_lab_consents / view_lab_consents / take_samples / view_patient_history)
-- pero para Imágenes Diagnósticas.

INSERT INTO public.roles (name, display_name, description, is_system) VALUES
  ('radiology_technician', 'Técnico de Radiología', 'Acceso a funciones de imágenes diagnósticas', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_key, permission_label, is_enabled) VALUES
  ('radiology_technician', 'create_imaging_consents', 'Crear consentimientos de imágenes diagnósticas', true),
  ('radiology_technician', 'view_imaging_consents', 'Ver consentimientos de imágenes diagnósticas', true),
  ('radiology_technician', 'take_images', 'Tomar estudios de imagen', true),
  ('radiology_technician', 'view_patient_history', 'Ver historial de pacientes', true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Quién ve consentimientos: se añade view_imaging_consents. Sin esto el técnico
-- de radiología sólo vería los que él mismo creó, a diferencia del de
-- laboratorio. Misma política que 20260513125338, más ese permiso.
DROP POLICY IF EXISTS "Permitted roles can view consents" ON public.consents;

CREATE POLICY "Permitted roles can view consents"
  ON public.consents
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_role()
    OR auth.uid() = created_by
    OR public.user_has_permission('view_all_consents')
    OR public.user_has_permission('view_consents')
    OR public.user_has_permission('view_consent_status')
    OR public.user_has_permission('view_lab_consents')
    OR public.user_has_permission('view_imaging_consents')
    OR public.user_has_permission('view_own_consents')
  );

-- Lo mismo para los PDF firmados a distancia. Misma política que
-- 20260813204948, más view_imaging_consents.
DROP POLICY IF EXISTS "Staff can read remote signed PDFs" ON storage.objects;

CREATE POLICY "Staff can read remote signed PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'consent-pdfs'
  AND (storage.foldername(name))[1] = 'remote_signed'
  AND (
    public.is_admin_role()
    OR public.user_has_permission('view_all_consents')
    OR public.user_has_permission('view_consents')
    OR public.user_has_permission('view_consent_status')
    OR public.user_has_permission('view_lab_consents')
    OR public.user_has_permission('view_imaging_consents')
    OR public.user_has_permission('view_own_consents')
  )
);
