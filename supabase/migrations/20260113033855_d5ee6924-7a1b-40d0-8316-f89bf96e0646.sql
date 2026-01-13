-- Función para asignar roles que bypassea RLS
CREATE OR REPLACE FUNCTION public.assign_user_roles(
  p_user_id uuid,
  p_roles app_role[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el usuario que ejecuta es admin
  IF NOT is_admin_role() THEN
    RAISE EXCEPTION 'Solo los administradores pueden asignar roles';
  END IF;

  -- Eliminar roles existentes del usuario
  DELETE FROM public.user_roles WHERE user_id = p_user_id;

  -- Insertar nuevos roles
  IF array_length(p_roles, 1) > 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT p_user_id, unnest(p_roles);
  END IF;
END;
$$;

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.assign_user_roles(uuid, app_role[]) TO authenticated;