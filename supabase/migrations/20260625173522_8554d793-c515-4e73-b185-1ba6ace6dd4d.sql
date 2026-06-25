
REVOKE EXECUTE ON FUNCTION public.belt_for_xp(INT) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.belt_for_xp(_xp INT) RETURNS TEXT
LANGUAGE SQL IMMUTABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT CASE
    WHEN _xp >= 4000 THEN 'black'
    WHEN _xp >= 2000 THEN 'red'
    WHEN _xp >= 1000 THEN 'blue'
    WHEN _xp >= 400  THEN 'green'
    ELSE 'white'
  END
$$;
