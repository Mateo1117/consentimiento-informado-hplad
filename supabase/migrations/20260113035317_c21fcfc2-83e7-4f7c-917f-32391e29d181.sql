-- Crear tabla para almacenar permisos configurables por rol
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_key TEXT NOT NULL,
  permission_label TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, permission_key)
);

-- Habilitar RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas: solo admins pueden ver y modificar permisos
CREATE POLICY "Admins can view role permissions"
  ON public.role_permissions FOR SELECT
  USING (is_admin_role());

CREATE POLICY "Admins can insert role permissions"
  ON public.role_permissions FOR INSERT
  WITH CHECK (is_admin_role());

CREATE POLICY "Admins can update role permissions"
  ON public.role_permissions FOR UPDATE
  USING (is_admin_role());

CREATE POLICY "Admins can delete role permissions"
  ON public.role_permissions FOR DELETE
  USING (is_admin_role());

-- Trigger para actualizar updated_at
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar permisos por defecto para cada rol
INSERT INTO public.role_permissions (role, permission_key, permission_label, is_enabled) VALUES
-- Admin
('admin', 'manage_users', 'Gestionar usuarios', true),
('admin', 'assign_roles', 'Asignar roles', true),
('admin', 'view_all_consents', 'Ver todos los consentimientos', true),
('admin', 'delete_consents', 'Eliminar consentimientos', true),
('admin', 'configure_system', 'Configurar sistema', true),
('admin', 'view_reports', 'Ver reportes', true),
('admin', 'export_data', 'Exportar datos', true),
('admin', 'manage_webhooks', 'Gestionar webhooks', true),
('admin', 'configure_api', 'Configurar API', true),
-- Doctor
('doctor', 'create_consents', 'Crear consentimientos', true),
('doctor', 'view_own_consents', 'Ver sus consentimientos', true),
('doctor', 'edit_own_consents', 'Editar sus consentimientos', true),
('doctor', 'send_consents', 'Enviar consentimientos', true),
('doctor', 'view_own_reports', 'Ver reportes propios', true),
-- Lab Technician
('lab_technician', 'create_lab_consents', 'Crear consentimientos de laboratorio', true),
('lab_technician', 'view_lab_consents', 'Ver consentimientos de laboratorio', true),
('lab_technician', 'take_samples', 'Tomar muestras', true),
('lab_technician', 'view_patient_history', 'Ver historial de pacientes', true),
-- Receptionist
('receptionist', 'register_patients', 'Registrar pacientes', true),
('receptionist', 'view_patient_info', 'Ver información de pacientes', true),
('receptionist', 'send_consents', 'Enviar consentimientos', true),
('receptionist', 'view_consent_status', 'Ver estado de consentimientos', true),
-- Viewer
('viewer', 'view_consents', 'Ver consentimientos', true),
('viewer', 'view_reports', 'Ver reportes', true);

-- Función para obtener permisos de un rol
CREATE OR REPLACE FUNCTION public.get_role_permissions(p_role app_role)
RETURNS TABLE(permission_key TEXT, permission_label TEXT, is_enabled BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rp.permission_key, rp.permission_label, rp.is_enabled
  FROM public.role_permissions rp
  WHERE rp.role = p_role
  ORDER BY rp.permission_label;
$$;

-- Función para verificar si un usuario tiene un permiso específico
CREATE OR REPLACE FUNCTION public.user_has_permission(p_permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = auth.uid()
      AND rp.permission_key = p_permission_key
      AND rp.is_enabled = true
  )
$$;

-- Función para actualizar permisos de un rol (solo admins)
CREATE OR REPLACE FUNCTION public.update_role_permission(
  p_role app_role,
  p_permission_key TEXT,
  p_is_enabled BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_role() THEN
    RAISE EXCEPTION 'Solo los administradores pueden modificar permisos';
  END IF;

  UPDATE public.role_permissions
  SET is_enabled = p_is_enabled, updated_at = now()
  WHERE role = p_role AND permission_key = p_permission_key;
END;
$$;

-- Función para agregar un nuevo permiso a un rol
CREATE OR REPLACE FUNCTION public.add_role_permission(
  p_role app_role,
  p_permission_key TEXT,
  p_permission_label TEXT,
  p_is_enabled BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_role() THEN
    RAISE EXCEPTION 'Solo los administradores pueden agregar permisos';
  END IF;

  INSERT INTO public.role_permissions (role, permission_key, permission_label, is_enabled)
  VALUES (p_role, p_permission_key, p_permission_label, p_is_enabled)
  ON CONFLICT (role, permission_key) DO UPDATE
  SET permission_label = p_permission_label, is_enabled = p_is_enabled, updated_at = now();
END;
$$;

-- Función para eliminar un permiso de un rol
CREATE OR REPLACE FUNCTION public.delete_role_permission(
  p_role app_role,
  p_permission_key TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_role() THEN
    RAISE EXCEPTION 'Solo los administradores pueden eliminar permisos';
  END IF;

  DELETE FROM public.role_permissions
  WHERE role = p_role AND permission_key = p_permission_key;
END;
$$;

-- Permisos de ejecución
GRANT EXECUTE ON FUNCTION public.get_role_permissions(app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_role_permission(app_role, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_role_permission(app_role, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_role_permission(app_role, TEXT) TO authenticated;