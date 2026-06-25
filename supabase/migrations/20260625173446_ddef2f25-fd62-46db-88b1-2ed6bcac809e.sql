
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('coach', 'student_parent');

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles self upsert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- =========================================================
-- USER ROLES
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Allow coaches to read all roles (for roster)
CREATE POLICY "user_roles coach read" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coach'));

-- =========================================================
-- STUDENT PROFILES
-- =========================================================
CREATE TABLE public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  age INT NOT NULL CHECK (age BETWEEN 4 AND 18),
  total_xp INT NOT NULL DEFAULT 0,
  current_belt_color TEXT NOT NULL DEFAULT 'white',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.student_profiles TO authenticated;
GRANT ALL ON public.student_profiles TO service_role;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students parent read" ON public.student_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'coach'));
CREATE POLICY "students parent update own" ON public.student_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- =========================================================
-- SKILL BARS
-- =========================================================
CREATE TABLE public.skill_bars (
  student_id UUID PRIMARY KEY REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  jump_xp INT NOT NULL DEFAULT 0,
  grip_xp INT NOT NULL DEFAULT 0,
  coordination_xp INT NOT NULL DEFAULT 0,
  agility_xp INT NOT NULL DEFAULT 0,
  strength_xp INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.skill_bars TO authenticated;
GRANT ALL ON public.skill_bars TO service_role;
ALTER TABLE public.skill_bars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skill_bars read" ON public.skill_bars FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = student_id AND (sp.user_id = auth.uid() OR public.has_role(auth.uid(), 'coach'))
    )
  );

-- =========================================================
-- CLASS TYPES (seeded)
-- =========================================================
CREATE TABLE public.class_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  xp_matrix JSONB NOT NULL  -- {"jump":50,"strength":50}
);
GRANT SELECT ON public.class_types TO authenticated;
GRANT ALL ON public.class_types TO service_role;
ALTER TABLE public.class_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "class_types read" ON public.class_types FOR SELECT TO authenticated USING (true);

INSERT INTO public.class_types (name, xp_matrix) VALUES
  ('Muro Curvado',   '{"jump":50,"strength":50}'::jsonb),
  ('Pasamanos',      '{"grip":50,"coordination":50}'::jsonb),
  ('Puente Colgante','{"agility":50,"coordination":50}'::jsonb);

-- =========================================================
-- ATTENDANCE LOGS
-- =========================================================
CREATE TABLE public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  class_type_id UUID NOT NULL REFERENCES public.class_types(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  coach_id UUID REFERENCES auth.users(id),
  xp_awarded INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, date, class_type_id)
);
GRANT SELECT, INSERT ON public.attendance_logs TO authenticated;
GRANT ALL ON public.attendance_logs TO service_role;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance read" ON public.attendance_logs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'coach') OR
    EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = student_id AND sp.user_id = auth.uid())
  );
CREATE POLICY "attendance coach insert" ON public.attendance_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'coach') AND coach_id = auth.uid());

-- =========================================================
-- UNLOCKED ITEMS
-- =========================================================
CREATE TABLE public.unlocked_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('pin','belt')),
  item_name TEXT NOT NULL,
  purchased_status BOOLEAN NOT NULL DEFAULT false,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, item_type, item_name)
);
GRANT SELECT, INSERT, UPDATE ON public.unlocked_items TO authenticated;
GRANT ALL ON public.unlocked_items TO service_role;
ALTER TABLE public.unlocked_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unlocked read" ON public.unlocked_items FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'coach') OR
    EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = student_id AND sp.user_id = auth.uid())
  );
CREATE POLICY "unlocked parent insert" ON public.unlocked_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = student_id AND sp.user_id = auth.uid())
  );

-- =========================================================
-- AVATARS
-- =========================================================
CREATE TABLE public.avatars (
  student_id UUID PRIMARY KEY REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  gender TEXT NOT NULL DEFAULT 'boy' CHECK (gender IN ('boy','girl')),
  skin TEXT NOT NULL DEFAULT 'light',
  hair TEXT NOT NULL DEFAULT 'short',
  hair_color TEXT NOT NULL DEFAULT 'brown',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.avatars TO authenticated;
GRANT ALL ON public.avatars TO service_role;
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avatars read" ON public.avatars FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = student_id AND (sp.user_id = auth.uid() OR public.has_role(auth.uid(),'coach')))
  );
CREATE POLICY "avatars parent upsert" ON public.avatars FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = student_id AND sp.user_id = auth.uid())
  );
CREATE POLICY "avatars parent update" ON public.avatars FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = student_id AND sp.user_id = auth.uid())
  );

-- =========================================================
-- BELT RECOMPUTE
-- =========================================================
CREATE OR REPLACE FUNCTION public.belt_for_xp(_xp INT) RETURNS TEXT
LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE
    WHEN _xp >= 4000 THEN 'black'
    WHEN _xp >= 2000 THEN 'red'
    WHEN _xp >= 1000 THEN 'blue'
    WHEN _xp >= 400  THEN 'green'
    ELSE 'white'
  END
$$;

-- =========================================================
-- ATTENDANCE → XP TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION public.apply_attendance_xp()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  matrix JSONB;
  total_award INT := 0;
  v_jump INT := 0; v_grip INT := 0; v_coord INT := 0; v_agi INT := 0; v_str INT := 0;
BEGIN
  SELECT xp_matrix INTO matrix FROM public.class_types WHERE id = NEW.class_type_id;
  v_jump  := COALESCE((matrix->>'jump')::INT, 0);
  v_grip  := COALESCE((matrix->>'grip')::INT, 0);
  v_coord := COALESCE((matrix->>'coordination')::INT, 0);
  v_agi   := COALESCE((matrix->>'agility')::INT, 0);
  v_str   := COALESCE((matrix->>'strength')::INT, 0);
  total_award := v_jump + v_grip + v_coord + v_agi + v_str;

  NEW.xp_awarded := total_award;

  -- ensure skill_bars row exists
  INSERT INTO public.skill_bars (student_id) VALUES (NEW.student_id)
    ON CONFLICT (student_id) DO NOTHING;

  UPDATE public.skill_bars SET
    jump_xp = jump_xp + v_jump,
    grip_xp = grip_xp + v_grip,
    coordination_xp = coordination_xp + v_coord,
    agility_xp = agility_xp + v_agi,
    strength_xp = strength_xp + v_str
  WHERE student_id = NEW.student_id;

  UPDATE public.student_profiles
  SET total_xp = total_xp + total_award,
      current_belt_color = public.belt_for_xp(total_xp + total_award)
  WHERE id = NEW.student_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_attendance_xp
BEFORE INSERT ON public.attendance_logs
FOR EACH ROW EXECUTE FUNCTION public.apply_attendance_xp();

-- =========================================================
-- AUTO PROFILE ON SIGN-UP
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  -- default role is student_parent unless metadata says coach
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE WHEN NEW.raw_user_meta_data->>'role' = 'coach' THEN 'coach'::public.app_role
         ELSE 'student_parent'::public.app_role END
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- AUTO SKILL_BARS ROW WHEN STUDENT CREATED
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_student()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.skill_bars (student_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_student
AFTER INSERT ON public.student_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_student();
