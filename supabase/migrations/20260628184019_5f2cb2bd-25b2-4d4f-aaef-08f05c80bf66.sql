
ALTER TABLE public.student_profiles DROP COLUMN IF EXISTS family_google_email;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS family_username text;
CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_family_username_uniq ON public.student_profiles (lower(family_username)) WHERE family_username IS NOT NULL;
DROP FUNCTION IF EXISTS public.is_email_authorized(text);
