
-- Allow any authenticated user with specific roles to view ALL consents
-- (for the consent management panel to show all pending/signed consents)
CREATE POLICY "Staff can view all consents"
  ON public.consents FOR SELECT TO authenticated
  USING (
    is_admin_role()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('doctor', 'lab_technician', 'receptionist')
    )
    OR auth.uid() = created_by
  );
