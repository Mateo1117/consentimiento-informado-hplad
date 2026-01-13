-- Create a roles table to store dynamic roles
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for roles table
CREATE POLICY "Anyone can view active roles"
  ON public.roles FOR SELECT
  USING (is_active = true OR is_admin_role());

CREATE POLICY "Only admins can insert roles"
  ON public.roles FOR INSERT
  WITH CHECK (is_admin_role() AND is_system = false);

CREATE POLICY "Only admins can update non-system roles"
  ON public.roles FOR UPDATE
  USING (is_admin_role() AND is_system = false);

CREATE POLICY "Only admins can delete non-system roles"
  ON public.roles FOR DELETE
  USING (is_admin_role() AND is_system = false);

-- Insert default system roles (matching the enum)
INSERT INTO public.roles (name, display_name, description, is_system) VALUES
  ('admin', 'Administrador', 'Acceso completo al sistema', true),
  ('doctor', 'Médico', 'Puede crear y gestionar consentimientos', true),
  ('lab_technician', 'Técnico de Laboratorio', 'Acceso a funciones de laboratorio', true),
  ('receptionist', 'Recepcionista', 'Gestión de pacientes y citas', true),
  ('viewer', 'Visualizador', 'Solo lectura de información', true)
ON CONFLICT (name) DO NOTHING;

-- Function to get all roles
CREATE OR REPLACE FUNCTION public.get_all_roles()
RETURNS TABLE (
  id uuid,
  name text,
  display_name text,
  description text,
  is_system boolean,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.name, r.display_name, r.description, r.is_system, r.is_active
  FROM public.roles r
  WHERE r.is_active = true OR is_admin_role()
  ORDER BY r.is_system DESC, r.display_name;
$$;

-- Function to create a new role
CREATE OR REPLACE FUNCTION public.create_role(
  p_name text,
  p_display_name text,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
BEGIN
  IF NOT is_admin_role() THEN
    RAISE EXCEPTION 'Solo los administradores pueden crear roles';
  END IF;

  INSERT INTO public.roles (name, display_name, description, is_system)
  VALUES (lower(replace(p_name, ' ', '_')), p_display_name, p_description, false)
  RETURNING id INTO v_role_id;

  RETURN v_role_id;
END;
$$;

-- Function to update a role
CREATE OR REPLACE FUNCTION public.update_role(
  p_role_id uuid,
  p_display_name text,
  p_description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_role() THEN
    RAISE EXCEPTION 'Solo los administradores pueden modificar roles';
  END IF;

  UPDATE public.roles
  SET display_name = p_display_name,
      description = p_description,
      updated_at = now()
  WHERE id = p_role_id AND is_system = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se puede modificar un rol del sistema';
  END IF;
END;
$$;

-- Function to delete a role
CREATE OR REPLACE FUNCTION public.delete_role(p_role_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_role() THEN
    RAISE EXCEPTION 'Solo los administradores pueden eliminar roles';
  END IF;

  DELETE FROM public.roles
  WHERE id = p_role_id AND is_system = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se puede eliminar un rol del sistema';
  END IF;
END;
$$;