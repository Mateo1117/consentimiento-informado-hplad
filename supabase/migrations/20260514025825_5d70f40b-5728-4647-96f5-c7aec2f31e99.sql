
-- 1. Photos bucket: remove dangerous anon UPDATE/DELETE and duplicate policies
DROP POLICY IF EXISTS "Anyone can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Public update access for photos" ON storage.objects;
DROP POLICY IF EXISTS "Public delete access for photos" ON storage.objects;
DROP POLICY IF EXISTS "Public upload access for photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for photos" ON storage.objects;

-- Keep a single anon INSERT policy (needed by public consent signing flow) and rely on upsert:false
-- Keep "Anyone can upload photos" / "Anyone can view photos" / "Authenticated users can delete photos"
-- (already present)

-- 2. Roles table: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view active roles" ON public.roles;
CREATE POLICY "Authenticated can view active roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (is_active = true OR is_admin_role());

-- 3. Fix privilege escalation in is_admin_user(): delegate to is_admin_role()
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin_role();
$$;
