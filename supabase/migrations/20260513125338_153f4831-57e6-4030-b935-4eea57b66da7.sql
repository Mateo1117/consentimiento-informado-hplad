DROP POLICY IF EXISTS "Staff can view all consents" ON public.consents;

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
    OR public.user_has_permission('view_own_consents')
  );