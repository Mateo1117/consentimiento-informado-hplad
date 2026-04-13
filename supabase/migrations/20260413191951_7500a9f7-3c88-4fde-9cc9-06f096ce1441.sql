
-- Automatically reorder professional names from "NOMBRE1 NOMBRE2 APELLIDO1 APELLIDO2" to "APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2"
-- For 4-word names: swap first 2 and last 2
-- For 3-word names: move last 2 to front
-- For 2-word names: swap the two words
-- Skip names that are already in correct format (like CORREA ALDANA ALEJANDRA)
-- Also convert to UPPERCASE

UPDATE public.professional_signatures
SET professional_name = UPPER(
  CASE 
    WHEN array_length(string_to_array(trim(professional_name), ' '), 1) = 4 THEN
      -- 4 words: "Nombre1 Nombre2 Apellido1 Apellido2" -> "APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2"
      (string_to_array(trim(professional_name), ' '))[3] || ' ' ||
      (string_to_array(trim(professional_name), ' '))[4] || ' ' ||
      (string_to_array(trim(professional_name), ' '))[1] || ' ' ||
      (string_to_array(trim(professional_name), ' '))[2]
    WHEN array_length(string_to_array(trim(professional_name), ' '), 1) = 3 THEN
      -- 3 words: "Nombre1 Apellido1 Apellido2" -> "APELLIDO1 APELLIDO2 NOMBRE1"
      -- But skip if already looks correct (all uppercase = already processed)
      (string_to_array(trim(professional_name), ' '))[2] || ' ' ||
      (string_to_array(trim(professional_name), ' '))[3] || ' ' ||
      (string_to_array(trim(professional_name), ' '))[1]
    WHEN array_length(string_to_array(trim(professional_name), ' '), 1) = 2 THEN
      -- 2 words: "Nombre Apellido" -> "APELLIDO NOMBRE"
      (string_to_array(trim(professional_name), ' '))[2] || ' ' ||
      (string_to_array(trim(professional_name), ' '))[1]
    ELSE
      UPPER(trim(professional_name))
  END
)
WHERE professional_name != UPPER(professional_name)
   OR professional_name NOT LIKE '%[A-Z]%';

-- Also update the consents table professional_name to match
UPDATE public.consents c
SET professional_name = ps.professional_name
FROM public.professional_signatures ps
WHERE c.professional_document = ps.professional_document
  AND c.professional_name IS NOT NULL
  AND c.professional_name != ps.professional_name;
