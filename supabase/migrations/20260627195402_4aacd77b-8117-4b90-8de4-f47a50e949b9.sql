
-- 1) skill_bars: drop agility, add resistance/speed/balance
ALTER TABLE public.skill_bars DROP COLUMN IF EXISTS agility_xp;
ALTER TABLE public.skill_bars
  ADD COLUMN IF NOT EXISTS resistance_xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS speed_xp      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_xp    integer NOT NULL DEFAULT 0;

-- 2) Exponential level formula
CREATE OR REPLACE FUNCTION public.xp_required_for_level(level_n integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ROUND(100 * POWER(1.15, level_n))::integer;
$$;
REVOKE EXECUTE ON FUNCTION public.xp_required_for_level(integer) FROM PUBLIC, anon, authenticated;

-- Cumulative level for a given XP total
CREATE OR REPLACE FUNCTION public.level_for_xp(_xp integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  lvl integer := 0;
  acc integer := 0;
  step integer;
BEGIN
  IF _xp IS NULL OR _xp <= 0 THEN RETURN 0; END IF;
  LOOP
    step := public.xp_required_for_level(lvl + 1);
    IF acc + step > _xp THEN
      RETURN lvl;
    END IF;
    acc := acc + step;
    lvl := lvl + 1;
    IF lvl > 200 THEN RETURN lvl; END IF; -- safety cap
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.level_for_xp(integer) FROM PUBLIC, anon, authenticated;

-- Replace belt_for_xp to be level-based
CREATE OR REPLACE FUNCTION public.belt_for_xp(_xp integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.level_for_xp(_xp) >= 20 THEN 'black'
    WHEN public.level_for_xp(_xp) >= 15 THEN 'red'
    WHEN public.level_for_xp(_xp) >= 10 THEN 'blue'
    WHEN public.level_for_xp(_xp) >= 5  THEN 'green'
    ELSE 'white'
  END
$$;

-- 3) Replace class_types with the 9 official obstacles
-- Repoint attendance_logs to new rows by name after re-seed.
DELETE FROM public.attendance_logs; -- demo data; matrix changed so recompute would be ambiguous
DELETE FROM public.class_types;

INSERT INTO public.class_types (name, xp_matrix) VALUES
  ('5 Escalones',         '{"jump":100}'::jsonb),
  ('Pasamanos',           '{"grip":50,"resistance":50}'::jsonb),
  ('Pegboard',            '{"grip":50,"strength":50}'::jsonb),
  ('Pelotas Colgantes',   '{"balance":100}'::jsonb),
  ('Tronco Giratorio',    '{"coordination":100}'::jsonb),
  ('Muro Curvado',        '{"jump":50,"strength":50}'::jsonb),
  ('Puente Colgante',     '{"balance":50,"jump":50}'::jsonb),
  ('Escalera Invertida',  '{"coordination":50,"speed":50}'::jsonb),
  ('Palestra',            '{"strength":50,"resistance":50}'::jsonb);

-- Reset existing skill_bars XP since matrix changed
UPDATE public.skill_bars SET
  jump_xp = 0, grip_xp = 0, coordination_xp = 0, strength_xp = 0,
  resistance_xp = 0, speed_xp = 0, balance_xp = 0;
UPDATE public.student_profiles SET total_xp = 0, current_belt_color = 'white';

-- 4) Update trigger to read the 7 new skill keys
CREATE OR REPLACE FUNCTION public.apply_attendance_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matrix JSONB;
  total_award INT := 0;
  v_jump INT := 0; v_grip INT := 0; v_coord INT := 0; v_str INT := 0;
  v_res  INT := 0; v_spd  INT := 0; v_bal  INT := 0;
BEGIN
  SELECT xp_matrix INTO matrix FROM public.class_types WHERE id = NEW.class_type_id;
  v_jump  := COALESCE((matrix->>'jump')::INT, 0);
  v_grip  := COALESCE((matrix->>'grip')::INT, 0);
  v_coord := COALESCE((matrix->>'coordination')::INT, 0);
  v_str   := COALESCE((matrix->>'strength')::INT, 0);
  v_res   := COALESCE((matrix->>'resistance')::INT, 0);
  v_spd   := COALESCE((matrix->>'speed')::INT, 0);
  v_bal   := COALESCE((matrix->>'balance')::INT, 0);
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
$$;
REVOKE EXECUTE ON FUNCTION public.apply_attendance_xp() FROM PUBLIC, anon, authenticated;

-- Ensure the trigger is actually attached (in case it was missing)
DROP TRIGGER IF EXISTS trg_apply_attendance_xp ON public.attendance_logs;
CREATE TRIGGER trg_apply_attendance_xp
  BEFORE INSERT ON public.attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.apply_attendance_xp();
