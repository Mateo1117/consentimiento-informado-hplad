
-- Allow admins to view ALL consents
CREATE POLICY "Admins can view all consents"
ON public.consents
FOR SELECT
USING (is_admin_role());

-- Allow admins to update ALL consents
CREATE POLICY "Admins can update all consents"
ON public.consents
FOR UPDATE
USING (is_admin_role());

-- Allow admins to delete ALL consents
CREATE POLICY "Admins can delete all consents"
ON public.consents
FOR DELETE
USING (is_admin_role());
