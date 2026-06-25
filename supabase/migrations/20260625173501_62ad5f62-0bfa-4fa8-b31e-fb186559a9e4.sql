
-- Revoke execute from PUBLIC for trigger-only functions
REVOKE EXECUTE ON FUNCTION public.apply_attendance_xp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_student() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.belt_for_xp(INT) FROM PUBLIC, anon;

-- Keep has_role callable by authenticated users (used in RLS)
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
