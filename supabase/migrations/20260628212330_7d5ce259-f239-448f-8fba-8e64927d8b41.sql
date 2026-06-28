
CREATE OR REPLACE FUNCTION public.attendance_streak_weeks(_student_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  tz CONSTANT text := 'America/Argentina/Buenos_Aires';
  current_week date;
  streak integer := 0;
  has_row boolean;
BEGIN
  IF _student_id IS NULL THEN RETURN 0; END IF;

  current_week := date_trunc('week', (now() AT TIME ZONE tz))::date;

  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM public.attendance_logs al
      WHERE al.student_id = _student_id
        AND date_trunc('week', (al.date::timestamp))::date = current_week
    ) INTO has_row;

    IF NOT has_row THEN
      EXIT;
    END IF;

    streak := streak + 1;
    current_week := current_week - INTERVAL '7 days';

    IF streak > 520 THEN EXIT; END IF;
  END LOOP;

  RETURN streak;
END;
$$;

REVOKE ALL ON FUNCTION public.attendance_streak_weeks(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendance_streak_weeks(uuid) TO authenticated, service_role;
