
-- 1) consent-pdfs: quitar acceso público a remote_signed
DROP POLICY IF EXISTS "Public can read remote signed PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload remote signed PDFs" ON storage.objects;

-- 2) photos: quitar acceso anónimo de escritura y políticas débiles
DROP POLICY IF EXISTS "Anyone can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;

CREATE POLICY "Authenticated can upload photos in own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can update photos in own folder"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can delete photos in own folder"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3) SECURITY DEFINER: revocar EXECUTE de anon en todas las funciones internas
REVOKE EXECUTE ON FUNCTION public.add_role_permission(app_role, text, text, boolean) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_user_roles(uuid, app_role[]) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_role(text, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_role(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_role_permission(app_role, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_all_roles() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_role_permissions(app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_users_with_roles() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_role() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_role(uuid, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_role_permission(app_role, text, boolean) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_permission(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_consent_dashboard_analytics(timestamptz, timestamptz) FROM anon, PUBLIC;

-- 4) Funciones internas del sistema: solo service_role
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.insert_audit_log(uuid, text, text, inet, text, boolean, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sign_consent_by_token(text, text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sign_consent_by_token(text, text, text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sign_consent_by_token_secure(text, text, text, text, text, text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_consent_by_token(text) FROM anon, authenticated, PUBLIC;

-- 5) Única función pública necesaria para el enlace de firma remota
GRANT EXECUTE ON FUNCTION public.get_consent_by_token_secure(text, text, text) TO anon, authenticated, service_role;
