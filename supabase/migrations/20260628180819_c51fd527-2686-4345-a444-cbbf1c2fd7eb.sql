
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS family_google_email text,
  ADD COLUMN IF NOT EXISTS family_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_family_email_uidx
  ON public.student_profiles ((lower(family_google_email)))
  WHERE family_google_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS student_profiles_family_user_id_idx
  ON public.student_profiles (family_user_id);

-- Expandir RLS de lectura para incluir al familiar autorizado
DROP POLICY IF EXISTS "students parent read" ON public.student_profiles;
CREATE POLICY "students parent read" ON public.student_profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR family_user_id = auth.uid()
    OR private.has_role(auth.uid(), 'coach'::app_role)
  );

DROP POLICY IF EXISTS "skill_bars read" ON public.skill_bars;
CREATE POLICY "skill_bars read" ON public.skill_bars
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.id = skill_bars.student_id
      AND (sp.user_id = auth.uid() OR sp.family_user_id = auth.uid() OR private.has_role(auth.uid(), 'coach'::app_role))
  ));

DROP POLICY IF EXISTS "attendance read" ON public.attendance_logs;
CREATE POLICY "attendance read" ON public.attendance_logs
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'coach'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = attendance_logs.student_id
        AND (sp.user_id = auth.uid() OR sp.family_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "avatars read" ON public.avatars;
CREATE POLICY "avatars read" ON public.avatars
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.student_profiles sp
    WHERE sp.id = avatars.student_id
      AND (sp.user_id = auth.uid() OR sp.family_user_id = auth.uid() OR private.has_role(auth.uid(), 'coach'::app_role))
  ));

DROP POLICY IF EXISTS "unlocked read" ON public.unlocked_items;
CREATE POLICY "unlocked read" ON public.unlocked_items
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'coach'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = unlocked_items.student_id
        AND (sp.user_id = auth.uid() OR sp.family_user_id = auth.uid())
    )
  );

-- Helper para chequear si un email puede ingresar
CREATE OR REPLACE FUNCTION public.is_email_authorized(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_profiles
    WHERE lower(family_google_email) = lower(_email)
  ) OR EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.user_roles r ON r.user_id = u.id
    WHERE lower(u.email) = lower(_email)
      AND r.role = 'coach'::public.app_role
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_email_authorized(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_email_authorized(text) TO authenticated, service_role;
