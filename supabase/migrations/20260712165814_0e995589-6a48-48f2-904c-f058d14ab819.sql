
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'age_band') THEN
    CREATE TYPE public.age_band AS ENUM ('kids','mid','teens');
  END IF;
END $$;

ALTER TABLE public.class_groups
  ADD COLUMN IF NOT EXISTS age_band public.age_band;

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS avatar_id text;

-- Backfill unambiguous groups
UPDATE public.class_groups SET age_band = 'teens'
  WHERE code IN ('LMV-5','MJ-5','SAB-3') AND age_band IS NULL;
