ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;