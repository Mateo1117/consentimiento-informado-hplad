
-- Allow admins to manage professional signatures for any user
CREATE POLICY "Admins can insert professional signatures"
ON public.professional_signatures
FOR INSERT TO authenticated
WITH CHECK (public.is_admin_role());

CREATE POLICY "Admins can update professional signatures"
ON public.professional_signatures
FOR UPDATE TO authenticated
USING (public.is_admin_role());

CREATE POLICY "Admins can delete professional signatures"
ON public.professional_signatures
FOR DELETE TO authenticated
USING (public.is_admin_role());

CREATE POLICY "Admins can view all professional signatures"
ON public.professional_signatures
FOR SELECT TO authenticated
USING (public.is_admin_role());
