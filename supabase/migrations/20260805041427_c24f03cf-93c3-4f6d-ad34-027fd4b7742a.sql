REVOKE ALL ON FUNCTION public.get_consent_dashboard_analytics(timestamptz, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.get_consent_dashboard_analytics(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_consent_dashboard_analytics(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_consent_dashboard_analytics(timestamptz, timestamptz) TO service_role;