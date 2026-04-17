UPDATE public.professional_signatures
SET professional_name = 'PIRA MENDEZ GISELLE SOFIA',
    updated_at = now()
WHERE professional_document = '1072428195';

UPDATE public.consents
SET professional_name = 'PIRA MENDEZ GISELLE SOFIA',
    updated_at = now()
WHERE professional_document = '1072428195'
   OR professional_name ILIKE 'PIRA MENDEZ GISEL SOFIA';