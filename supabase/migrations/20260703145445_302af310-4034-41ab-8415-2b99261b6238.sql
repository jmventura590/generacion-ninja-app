-- Add piloto flag to student_profiles (marks students shown in DEMO shortcuts)
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS piloto BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS student_profiles_piloto_idx
  ON public.student_profiles (piloto) WHERE piloto = TRUE;

-- Mark the current demo pilot students so DEMO section keeps working after switch to dynamic filter
UPDATE public.student_profiles
   SET piloto = TRUE
 WHERE lower(username) IN ('benja','cata','morena','bauti','fran','coach');
