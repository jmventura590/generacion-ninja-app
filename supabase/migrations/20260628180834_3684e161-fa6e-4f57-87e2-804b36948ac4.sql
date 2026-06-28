REVOKE EXECUTE ON FUNCTION public.is_email_authorized(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_authorized(text) TO service_role;