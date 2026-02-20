
-- ============================================================
-- FIX: Permitir que CUALQUIER usuario autenticado pueda
--       guardar consentimientos sin importar perfil/dispositivo
-- ============================================================

-- 1. Eliminar la política que bloquea TODO acceso público
--    (esta política con USING (false) bloquea TODOS los intentos
--     junto con otras políticas permissivas y causa conflictos)
DROP POLICY IF EXISTS "Deny direct public table access" ON public.consents;

-- 2. Asegurarse de que la política general de usuarios autenticados
--    exista correctamente (INSERT con created_by)
DROP POLICY IF EXISTS "Authenticated users access own consents" ON public.consents;

-- 3. Recrear política clara para SELECT
DROP POLICY IF EXISTS "Users can view their own consents" ON public.consents;
CREATE POLICY "Users can view their own consents"
  ON public.consents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- 4. Recrear política clara para INSERT — cualquier perfil autenticado
DROP POLICY IF EXISTS "Users can insert their own consents" ON public.consents;
CREATE POLICY "Users can insert their own consents"
  ON public.consents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IS NOT NULL
    AND auth.uid() = created_by
  );

-- 5. Recrear política clara para UPDATE
DROP POLICY IF EXISTS "Users can update their own consents" ON public.consents;
CREATE POLICY "Users can update their own consents"
  ON public.consents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- 6. Recrear política clara para DELETE
DROP POLICY IF EXISTS "Users can delete their own consents" ON public.consents;
CREATE POLICY "Users can delete their own consents"
  ON public.consents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- 7. Política para admins (SELECT, UPDATE, DELETE sobre todos)
DROP POLICY IF EXISTS "Admins can view all consents" ON public.consents;
CREATE POLICY "Admins can view all consents"
  ON public.consents
  FOR SELECT
  TO authenticated
  USING (public.is_admin_role());

DROP POLICY IF EXISTS "Admins can update all consents" ON public.consents;
CREATE POLICY "Admins can update all consents"
  ON public.consents
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_role());

DROP POLICY IF EXISTS "Admins can delete all consents" ON public.consents;
CREATE POLICY "Admins can delete all consents"
  ON public.consents
  FOR DELETE
  TO authenticated
  USING (public.is_admin_role());

-- 8. Permitir a la service role (edge functions) insertar/actualizar
--    sin restricción (para firmas públicas via edge function)
DROP POLICY IF EXISTS "Service role full access" ON public.consents;
CREATE POLICY "Service role full access"
  ON public.consents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
