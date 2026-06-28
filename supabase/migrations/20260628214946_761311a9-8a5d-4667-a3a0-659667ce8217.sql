
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings readable by all" ON public.app_settings;
CREATE POLICY "settings readable by all" ON public.app_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "settings writable by coach" ON public.app_settings;
CREATE POLICY "settings writable by coach" ON public.app_settings
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'coach'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'coach'::public.app_role));

INSERT INTO public.app_settings (key, value) VALUES
  ('belt_thresholds',
   '{"white":11,"green":16,"blue":21,"red":26,"black":31}'::jsonb),
  ('birthday_messages',
   '[
     "¡Feliz cumple, ninja! Hoy el gimnasio entero festeja con vos.",
     "Un año más fuerte, más rápido, más vos. ¡Feliz cumpleaños!",
     "Hoy no hay obstáculo que se te resista. ¡Feliz cumple, campeón!",
     "Otro año de garra y constancia. ¡Que lo festejes a lo grande!",
     "Hoy es tu día, ninja. Disfrutalo a pleno, te lo ganaste.",
     "Un año más cerca de tu próxima muñequera. ¡Feliz cumpleaños!",
     "Que este nuevo año venga con más saltos, más fuerza y más logros.",
     "¡Feliz cumple! Hoy el circuito de obstáculos te aplaude.",
     "Cada vez más fuerte, cada vez más ninja. ¡Feliz cumpleaños!",
     "Hoy festejamos no solo tu cumple, también tu esfuerzo de todo el año.",
     "¡Feliz cumpleaños! Que este año esté lleno de nuevos desafíos.",
     "Un año más grande, un ninja más fuerte. ¡Que lo disfrutes!",
     "Hoy te toca a vos brillar. ¡Feliz cumpleaños, campeón!",
     "Gracias por tu constancia este año. ¡Feliz cumple, ninja!",
     "Que la energía de hoy te acompañe en cada entrenamiento del año que empieza.",
     "¡Feliz cumpleaños! Seguí entrenando con esa garra que te caracteriza.",
     "Hoy el gimnasio se viste de fiesta por vos. ¡Feliz cumple!",
     "Un año más de aventuras, obstáculos y logros. ¡Felicidades, ninja!",
     "Que cumplas muchos años más, y todos entrenando con esta misma energía.",
     "¡Feliz cumpleaños! Hoy celebramos lo lejos que llegaste, y lo lejos que vas a llegar."
   ]'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.belt_for_xp(_xp integer)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  lvl integer := public.level_for_xp(_xp);
  th  jsonb;
  t_white int; t_green int; t_blue int; t_red int; t_black int;
BEGIN
  SELECT value INTO th FROM public.app_settings WHERE key = 'belt_thresholds';
  IF th IS NULL THEN
    th := '{"white":11,"green":16,"blue":21,"red":26,"black":31}'::jsonb;
  END IF;
  t_white := COALESCE((th->>'white')::int, 11);
  t_green := COALESCE((th->>'green')::int, 16);
  t_blue  := COALESCE((th->>'blue')::int,  21);
  t_red   := COALESCE((th->>'red')::int,   26);
  t_black := COALESCE((th->>'black')::int, 31);
  RETURN CASE
    WHEN lvl >= t_black THEN 'black'
    WHEN lvl >= t_red   THEN 'red'
    WHEN lvl >= t_blue  THEN 'blue'
    WHEN lvl >= t_green THEN 'green'
    WHEN lvl >= t_white THEN 'white'
    ELSE 'none'
  END;
END;
$$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.student_profiles LOOP
    PERFORM public.recompute_student_xp(r.id);
  END LOOP;
END $$;
