
-- Fix professional names to correct format (APELLIDOS NOMBRES) based on actual records
UPDATE public.professional_signatures SET professional_name = 'BARRERO BELLIZZIA CLAUDIA VALERIA' WHERE professional_document = '1022443844';
UPDATE public.professional_signatures SET professional_name = 'BARRETO GONZALEZ LINDA LORENA' WHERE professional_document = '1073630416';
UPDATE public.professional_signatures SET professional_name = 'COLLAZOS QUINTERO KAREN SOFIA' WHERE professional_document = '1077721710';
UPDATE public.professional_signatures SET professional_name = 'HERRERA GARCIA LUDIS MARIA' WHERE professional_document = '1084790666';
UPDATE public.professional_signatures SET professional_name = 'GIL YAÑEZ DINA MAYERLY' WHERE professional_document = '52616941';
UPDATE public.professional_signatures SET professional_name = 'PIRA MENDEZ GISEL SOFIA' WHERE professional_document = '1072428195';
UPDATE public.professional_signatures SET professional_name = 'BENITO BARRERA MARIA NATHALY' WHERE professional_name ILIKE '%BENITO BARRERA%';
UPDATE public.professional_signatures SET professional_name = 'BARROS COGOLLO LIRIS SOFIA' WHERE professional_name ILIKE '%BARROS COGOLLO%';
UPDATE public.professional_signatures SET professional_name = 'ROOSBELTH GAONA LOPEZ' WHERE professional_name ILIKE '%GAONA%' OR professional_name ILIKE '%ROOSBELTH%';
UPDATE public.professional_signatures SET professional_name = 'CORREA ALDANA ALEJANDRA' WHERE professional_document = '1000939905';
UPDATE public.professional_signatures SET professional_name = 'MATEO LOPEZ' WHERE professional_document = '1015435249';

-- Sync consents table
UPDATE public.consents c
SET professional_name = ps.professional_name
FROM public.professional_signatures ps
WHERE c.professional_document = ps.professional_document
  AND c.professional_name IS NOT NULL
  AND c.professional_name != ps.professional_name;
