
-- 1. Class groups (13 fixed groups)
CREATE TABLE public.class_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  days_label text NOT NULL,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  sort_order int NOT NULL
);
GRANT SELECT ON public.class_groups TO authenticated;
GRANT ALL ON public.class_groups TO service_role;
ALTER TABLE public.class_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "class_groups read" ON public.class_groups FOR SELECT TO authenticated USING (true);

INSERT INTO public.class_groups (code, days_label, starts_at, ends_at, sort_order) VALUES
  ('LMV-1','Lun/Mié/Vie','16:00','17:00',1),
  ('LMV-2','Lun/Mié/Vie','17:00','18:00',2),
  ('LMV-3','Lun/Mié/Vie','18:00','19:00',3),
  ('LMV-4','Lun/Mié/Vie','19:00','20:00',4),
  ('LMV-5','Lun/Mié/Vie','20:00','21:00',5),
  ('MJ-1','Mar/Jue','16:00','17:00',6),
  ('MJ-2','Mar/Jue','17:00','18:00',7),
  ('MJ-3','Mar/Jue','18:00','19:00',8),
  ('MJ-4','Mar/Jue','19:00','20:00',9),
  ('MJ-5','Mar/Jue','20:00','21:00',10),
  ('SAB-1','Sábado','09:00','10:30',11),
  ('SAB-2','Sábado','10:30','12:00',12),
  ('SAB-3','Sábado','12:00','13:30',13);

-- 2. Add group_id to student_profiles
ALTER TABLE public.student_profiles
  ADD COLUMN group_id uuid REFERENCES public.class_groups(id) ON DELETE SET NULL;

-- 3. Add obstacles_in_class to attendance_logs (XP denominator for the class)
ALTER TABLE public.attendance_logs
  ADD COLUMN obstacles_in_class int NOT NULL DEFAULT 1 CHECK (obstacles_in_class >= 1);

-- 4. Rewrite XP trigger: each row gets matrix[skill] / N, where N = obstacles_in_class.
--    xp_matrix already sums to 100, so total awarded per row = 100/N.
CREATE OR REPLACE FUNCTION public.apply_attendance_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  matrix JSONB;
  n INT;
  total_award INT := 0;
  v_jump INT := 0; v_grip INT := 0; v_coord INT := 0; v_str INT := 0;
  v_res  INT := 0; v_spd  INT := 0; v_bal  INT := 0;
BEGIN
  SELECT xp_matrix INTO matrix FROM public.class_types WHERE id = NEW.class_type_id;
  n := GREATEST(COALESCE(NEW.obstacles_in_class, 1), 1);

  -- Each skill share for THIS obstacle = matrix[skill] / n (integer floor).
  v_jump  := FLOOR(COALESCE((matrix->>'jump')::NUMERIC, 0)         / n)::INT;
  v_grip  := FLOOR(COALESCE((matrix->>'grip')::NUMERIC, 0)         / n)::INT;
  v_coord := FLOOR(COALESCE((matrix->>'coordination')::NUMERIC, 0) / n)::INT;
  v_str   := FLOOR(COALESCE((matrix->>'strength')::NUMERIC, 0)     / n)::INT;
  v_res   := FLOOR(COALESCE((matrix->>'resistance')::NUMERIC, 0)   / n)::INT;
  v_spd   := FLOOR(COALESCE((matrix->>'speed')::NUMERIC, 0)        / n)::INT;
  v_bal   := FLOOR(COALESCE((matrix->>'balance')::NUMERIC, 0)      / n)::INT;
  total_award := v_jump + v_grip + v_coord + v_str + v_res + v_spd + v_bal;

  NEW.xp_awarded := total_award;

  INSERT INTO public.skill_bars (student_id) VALUES (NEW.student_id)
    ON CONFLICT (student_id) DO NOTHING;

  UPDATE public.skill_bars SET
    jump_xp         = jump_xp + v_jump,
    grip_xp         = grip_xp + v_grip,
    coordination_xp = coordination_xp + v_coord,
    strength_xp     = strength_xp + v_str,
    resistance_xp   = resistance_xp + v_res,
    speed_xp        = speed_xp + v_spd,
    balance_xp      = balance_xp + v_bal
  WHERE student_id = NEW.student_id;

  UPDATE public.student_profiles
  SET total_xp = total_xp + total_award,
      current_belt_color = public.belt_for_xp(total_xp + total_award)
  WHERE id = NEW.student_id;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.apply_attendance_xp() FROM PUBLIC, anon, authenticated;
