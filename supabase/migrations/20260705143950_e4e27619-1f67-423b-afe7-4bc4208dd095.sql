
-- Default: alumnos nuevos empiezan sin pulsera hasta ganarla.
ALTER TABLE public.student_profiles ALTER COLUMN current_belt_color SET DEFAULT 'none';

-- Recalcular todos los alumnos existentes en base a su XP real.
UPDATE public.student_profiles SET current_belt_color = public.belt_for_xp(COALESCE(total_xp, 0));
