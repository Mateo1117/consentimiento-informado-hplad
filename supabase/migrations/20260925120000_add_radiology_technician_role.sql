-- Rol "Técnico de Radiología" para el servicio de Imágenes Diagnósticas.
--
-- Va solo en esta migración: Postgres no permite usar un valor de enum en la
-- misma transacción que lo crea, y la siguiente migración ya lo usa.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'radiology_technician';
