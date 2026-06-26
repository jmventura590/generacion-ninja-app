
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "user_roles coach read" ON public.user_roles;
CREATE POLICY "user_roles coach read" ON public.user_roles FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'coach'::public.app_role) OR user_id = auth.uid());

DROP POLICY IF EXISTS "students parent read" ON public.student_profiles;
CREATE POLICY "students parent read" ON public.student_profiles FOR SELECT TO authenticated
USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'coach'::public.app_role));

DROP POLICY IF EXISTS "skill_bars read" ON public.skill_bars;
CREATE POLICY "skill_bars read" ON public.skill_bars FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = skill_bars.student_id AND (sp.user_id = auth.uid() OR private.has_role(auth.uid(), 'coach'::public.app_role))));

DROP POLICY IF EXISTS "attendance read" ON public.attendance_logs;
CREATE POLICY "attendance read" ON public.attendance_logs FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'coach'::public.app_role) OR EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = attendance_logs.student_id AND sp.user_id = auth.uid()));

DROP POLICY IF EXISTS "attendance coach insert" ON public.attendance_logs;
CREATE POLICY "attendance coach insert" ON public.attendance_logs FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'coach'::public.app_role) AND coach_id = auth.uid());

DROP POLICY IF EXISTS "unlocked read" ON public.unlocked_items;
CREATE POLICY "unlocked read" ON public.unlocked_items FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'coach'::public.app_role) OR EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = unlocked_items.student_id AND sp.user_id = auth.uid()));

DROP POLICY IF EXISTS "avatars read" ON public.avatars;
CREATE POLICY "avatars read" ON public.avatars FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = avatars.student_id AND (sp.user_id = auth.uid() OR private.has_role(auth.uid(), 'coach'::public.app_role))));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
