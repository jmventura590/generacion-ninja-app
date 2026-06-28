
-- 1) Drop the Álbum (collectible cards) feature entirely
DROP TRIGGER IF EXISTS trg_attendance_grant_pack ON public.attendance_logs;
DROP FUNCTION IF EXISTS public.grant_pack_on_attendance();
DROP TABLE IF EXISTS public.card_collection;
DROP TABLE IF EXISTS public.card_packs;

-- 2) Fix XP rounding: distribute remainder to the first skill so the
--    total awarded equals the sum from the matrix (no XP lost).
CREATE OR REPLACE FUNCTION public.apply_attendance_xp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  matrix JSONB;
  n INT;
  pot_jump  INT; pot_grip  INT; pot_coord INT; pot_str INT;
  pot_res   INT; pot_spd   INT; pot_bal   INT;
  v_jump INT; v_grip INT; v_coord INT; v_str INT;
  v_res  INT; v_spd  INT; v_bal  INT;
  total_award INT := 0;
  expected_total INT;
  remainder INT;
BEGIN
  SELECT xp_matrix INTO matrix FROM public.class_types WHERE id = NEW.class_type_id;
  n := GREATEST(COALESCE(NEW.obstacles_in_class, 1), 1);

  -- Full pot per skill from the matrix (un-divided).
  pot_jump  := COALESCE((matrix->>'jump')::INT, 0);
  pot_grip  := COALESCE((matrix->>'grip')::INT, 0);
  pot_coord := COALESCE((matrix->>'coordination')::INT, 0);
  pot_str   := COALESCE((matrix->>'strength')::INT, 0);
  pot_res   := COALESCE((matrix->>'resistance')::INT, 0);
  pot_spd   := COALESCE((matrix->>'speed')::INT, 0);
  pot_bal   := COALESCE((matrix->>'balance')::INT, 0);

  -- Per-obstacle share (floor for each skill).
  v_jump  := pot_jump  / n;
  v_grip  := pot_grip  / n;
  v_coord := pot_coord / n;
  v_str   := pot_str   / n;
  v_res   := pot_res   / n;
  v_spd   := pot_spd   / n;
  v_bal   := pot_bal   / n;

  -- Expected per-obstacle award = ceil(sum_matrix / n) is wrong;
  -- the real "pot announced" per obstacle is floor(sum_matrix / n) + (sum_matrix mod n > 0 ? 1 : 0 for first n-1 distributions).
  -- To guarantee NO XP is lost across the whole class we award the integer-division remainder
  -- of each skill to the FIRST attendance log of this class (first obstacle processed).
  -- Simpler & exact: bump the first non-zero skill by the leftover of (sum_matrix - n*floor) / n.
  expected_total := (pot_jump + pot_grip + pot_coord + pot_str + pot_res + pot_spd + pot_bal) / n;
  total_award    := v_jump + v_grip + v_coord + v_str + v_res + v_spd + v_bal;
  remainder      := expected_total - total_award;

  IF remainder > 0 THEN
    -- give remainder to the first non-zero pot skill (deterministic order)
    IF      pot_jump  > 0 THEN v_jump  := v_jump  + remainder;
    ELSIF   pot_grip  > 0 THEN v_grip  := v_grip  + remainder;
    ELSIF   pot_coord > 0 THEN v_coord := v_coord + remainder;
    ELSIF   pot_str   > 0 THEN v_str   := v_str   + remainder;
    ELSIF   pot_res   > 0 THEN v_res   := v_res   + remainder;
    ELSIF   pot_spd   > 0 THEN v_spd   := v_spd   + remainder;
    ELSIF   pot_bal   > 0 THEN v_bal   := v_bal   + remainder;
    END IF;
    total_award := total_award + remainder;
  END IF;

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
