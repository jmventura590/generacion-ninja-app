
-- 1) Recompute function: rebuilds skill_bars + total_xp + belt from all attendance_logs for one student.
CREATE OR REPLACE FUNCTION public.recompute_student_xp(_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s_jump INT := 0; s_grip INT := 0; s_coord INT := 0; s_str INT := 0;
  s_res INT := 0; s_spd INT := 0; s_bal INT := 0;
  s_total INT := 0;
BEGIN
  IF _student_id IS NULL THEN RETURN; END IF;

  SELECT
    COALESCE(SUM( COALESCE((ct.xp_matrix->>'jump')::int,0)         / GREATEST(COALESCE(al.obstacles_in_class,1),1) ),0),
    COALESCE(SUM( COALESCE((ct.xp_matrix->>'grip')::int,0)         / GREATEST(COALESCE(al.obstacles_in_class,1),1) ),0),
    COALESCE(SUM( COALESCE((ct.xp_matrix->>'coordination')::int,0) / GREATEST(COALESCE(al.obstacles_in_class,1),1) ),0),
    COALESCE(SUM( COALESCE((ct.xp_matrix->>'strength')::int,0)     / GREATEST(COALESCE(al.obstacles_in_class,1),1) ),0),
    COALESCE(SUM( COALESCE((ct.xp_matrix->>'resistance')::int,0)   / GREATEST(COALESCE(al.obstacles_in_class,1),1) ),0),
    COALESCE(SUM( COALESCE((ct.xp_matrix->>'speed')::int,0)        / GREATEST(COALESCE(al.obstacles_in_class,1),1) ),0),
    COALESCE(SUM( COALESCE((ct.xp_matrix->>'balance')::int,0)      / GREATEST(COALESCE(al.obstacles_in_class,1),1) ),0),
    COALESCE(SUM(al.xp_awarded),0)
  INTO s_jump, s_grip, s_coord, s_str, s_res, s_spd, s_bal, s_total
  FROM public.attendance_logs al
  JOIN public.class_types ct ON ct.id = al.class_type_id
  WHERE al.student_id = _student_id;

  INSERT INTO public.skill_bars (student_id) VALUES (_student_id) ON CONFLICT DO NOTHING;
  UPDATE public.skill_bars
     SET jump_xp = s_jump, grip_xp = s_grip, coordination_xp = s_coord,
         strength_xp = s_str, resistance_xp = s_res, speed_xp = s_spd, balance_xp = s_bal
   WHERE student_id = _student_id;

  UPDATE public.student_profiles
     SET total_xp = s_total,
         current_belt_color = public.belt_for_xp(s_total)
   WHERE id = _student_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recompute_student_xp(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_student_xp(uuid) TO service_role;

-- 2) Replace apply_attendance_xp: only computes xp_awarded for the new row (no incremental updates).
CREATE OR REPLACE FUNCTION public.apply_attendance_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matrix JSONB;
  n INT;
  pot_jump INT; pot_grip INT; pot_coord INT; pot_str INT;
  pot_res INT; pot_spd INT; pot_bal INT;
  v_jump INT; v_grip INT; v_coord INT; v_str INT;
  v_res INT; v_spd INT; v_bal INT;
  total_award INT := 0;
  expected_total INT;
  remainder INT;
BEGIN
  SELECT xp_matrix INTO matrix FROM public.class_types WHERE id = NEW.class_type_id;
  n := GREATEST(COALESCE(NEW.obstacles_in_class, 1), 1);

  pot_jump  := COALESCE((matrix->>'jump')::INT, 0);
  pot_grip  := COALESCE((matrix->>'grip')::INT, 0);
  pot_coord := COALESCE((matrix->>'coordination')::INT, 0);
  pot_str   := COALESCE((matrix->>'strength')::INT, 0);
  pot_res   := COALESCE((matrix->>'resistance')::INT, 0);
  pot_spd   := COALESCE((matrix->>'speed')::INT, 0);
  pot_bal   := COALESCE((matrix->>'balance')::INT, 0);

  v_jump  := pot_jump  / n;
  v_grip  := pot_grip  / n;
  v_coord := pot_coord / n;
  v_str   := pot_str   / n;
  v_res   := pot_res   / n;
  v_spd   := pot_spd   / n;
  v_bal   := pot_bal   / n;

  expected_total := (pot_jump + pot_grip + pot_coord + pot_str + pot_res + pot_spd + pot_bal) / n;
  total_award    := v_jump + v_grip + v_coord + v_str + v_res + v_spd + v_bal;
  remainder      := expected_total - total_award;

  IF remainder > 0 THEN
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
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_attendance_xp() FROM public, anon, authenticated;

-- 3) Recompute trigger function (AFTER INS/UPD/DEL).
CREATE OR REPLACE FUNCTION public.attendance_recompute_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_student_xp(OLD.student_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.recompute_student_xp(NEW.student_id);
    IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
      PERFORM public.recompute_student_xp(OLD.student_id);
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public.recompute_student_xp(NEW.student_id);
    RETURN NEW;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.attendance_recompute_trigger() FROM public, anon, authenticated;

-- 4) Wire triggers (drop first to be idempotent).
DROP TRIGGER IF EXISTS attendance_xp_calc ON public.attendance_logs;
DROP TRIGGER IF EXISTS attendance_recompute ON public.attendance_logs;

CREATE TRIGGER attendance_xp_calc
  BEFORE INSERT OR UPDATE OF class_type_id, obstacles_in_class ON public.attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.apply_attendance_xp();

CREATE TRIGGER attendance_recompute
  AFTER INSERT OR UPDATE OR DELETE ON public.attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.attendance_recompute_trigger();

-- 5) Coach edit/delete policies on attendance_logs (read + insert already exist).
DROP POLICY IF EXISTS "attendance coach update" ON public.attendance_logs;
CREATE POLICY "attendance coach update"
  ON public.attendance_logs
  FOR UPDATE
  USING (private.has_role(auth.uid(), 'coach'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'coach'::public.app_role));

DROP POLICY IF EXISTS "attendance coach delete" ON public.attendance_logs;
CREATE POLICY "attendance coach delete"
  ON public.attendance_logs
  FOR DELETE
  USING (private.has_role(auth.uid(), 'coach'::public.app_role));

-- 6) Backfill: recompute every student once so totals match the new (no-double-count) logic.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.student_profiles LOOP
    PERFORM public.recompute_student_xp(r.id);
  END LOOP;
END$$;
