CREATE OR REPLACE FUNCTION public.get_consent_dashboard_analytics(p_date_from timestamptz DEFAULT NULL, p_date_to timestamptz DEFAULT NULL)
RETURNS TABLE (
  month_start date,
  specialty text,
  professional_name text,
  eps text,
  healthcare_center text,
  consent_type text,
  total bigint,
  signed bigint,
  pending bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    date_trunc('month', c.created_at)::date AS month_start,
    CASE
      WHEN lower(c.consent_type) IN ('hiv', 'vih', 'venopuncion', 'carga_glucosa') THEN 'Laboratorio Clínico'
      WHEN lower(c.consent_type) = 'frotis_vaginal' THEN 'Ginecología / Laboratorio'
      WHEN lower(c.consent_type) = 'hemocomponentes' THEN 'Banco de Sangre / Medicina Transfusional'
      ELSE 'General'
    END AS specialty,
    COALESCE(NULLIF(trim(c.professional_name), ''), 'Sin profesional asignado') AS professional_name,
    COALESCE(
      NULLIF(trim(c.payload #>> '{patientData,eps}'), ''),
      NULLIF(trim(c.payload ->> 'eps'), ''),
      'Sin EPS registrada'
    ) AS eps,
    COALESCE(
      NULLIF(trim(c.payload #>> '{patientData,centroSalud}'), ''),
      NULLIF(trim(c.payload ->> 'centroSalud'), ''),
      'Sin sede asignada'
    ) AS healthcare_center,
    c.consent_type,
    count(*) AS total,
    count(*) FILTER (WHERE c.status = 'signed') AS signed,
    count(*) FILTER (WHERE c.status <> 'signed') AS pending
  FROM public.consents c
  WHERE (p_date_from IS NULL OR c.created_at >= p_date_from)
    AND (p_date_to IS NULL OR c.created_at <= p_date_to)
  GROUP BY 1, 2, 3, 4, 5, 6
  ORDER BY 1, 2, 3;
$$;

REVOKE ALL ON FUNCTION public.get_consent_dashboard_analytics(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_consent_dashboard_analytics(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_consent_dashboard_analytics(timestamptz, timestamptz) TO service_role;