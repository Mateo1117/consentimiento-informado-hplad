-- Asignar rol de admin al usuario existente
INSERT INTO user_roles (user_id, role) 
VALUES ('29031127-4ee1-4dcf-9cd5-6ec7e0bf9d8e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;