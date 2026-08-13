
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
    OR public.user_has_permission('view_own_consents')
  )
);
