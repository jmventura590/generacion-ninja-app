-- Álbum Ninja: card packs + collection

CREATE TABLE public.card_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  attendance_log_id uuid REFERENCES public.attendance_logs(id) ON DELETE SET NULL,
  opened_at timestamptz,
  cards jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_card_packs_student ON public.card_packs(student_id);
CREATE INDEX idx_card_packs_pending ON public.card_packs(student_id) WHERE opened_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.card_packs TO authenticated;
GRANT ALL ON public.card_packs TO service_role;

ALTER TABLE public.card_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students read own packs" ON public.card_packs FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = student_id AND sp.user_id = auth.uid())
  OR private.has_role(auth.uid(), 'coach')
);
CREATE POLICY "students open own packs" ON public.card_packs FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = student_id AND sp.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = student_id AND sp.user_id = auth.uid()));
CREATE POLICY "coach inserts packs" ON public.card_packs FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'coach'));

-- Collection table
CREATE TABLE public.card_collection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  card_id text NOT NULL,
  count_common int NOT NULL DEFAULT 0,
  count_gold int NOT NULL DEFAULT 0,
  first_obtained_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, card_id)
);
CREATE INDEX idx_card_collection_student ON public.card_collection(student_id);

GRANT SELECT, INSERT, UPDATE ON public.card_collection TO authenticated;
GRANT ALL ON public.card_collection TO service_role;

ALTER TABLE public.card_collection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students read own collection" ON public.card_collection FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = student_id AND sp.user_id = auth.uid())
  OR private.has_role(auth.uid(), 'coach')
);
CREATE POLICY "students write own collection" ON public.card_collection FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = student_id AND sp.user_id = auth.uid()));
CREATE POLICY "students update own collection" ON public.card_collection FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = student_id AND sp.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.student_profiles sp WHERE sp.id = student_id AND sp.user_id = auth.uid()));

-- Trigger: each attendance log → 1 pending pack for that student
CREATE OR REPLACE FUNCTION public.grant_pack_on_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.card_packs (student_id, attendance_log_id) VALUES (NEW.student_id, NEW.id);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.grant_pack_on_attendance() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_attendance_grant_pack ON public.attendance_logs;
CREATE TRIGGER trg_attendance_grant_pack
AFTER INSERT ON public.attendance_logs
FOR EACH ROW EXECUTE FUNCTION public.grant_pack_on_attendance();

-- Backfill: 1 pack for every historical attendance that doesn't have one yet
INSERT INTO public.card_packs (student_id, attendance_log_id)
SELECT al.student_id, al.id
FROM public.attendance_logs al
LEFT JOIN public.card_packs cp ON cp.attendance_log_id = al.id
WHERE cp.id IS NULL;