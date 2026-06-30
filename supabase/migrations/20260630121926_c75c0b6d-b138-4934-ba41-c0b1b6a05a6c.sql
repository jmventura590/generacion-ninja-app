
-- skill_bars: restrict writes to coaches only (clients shouldn't write directly; triggers use SECURITY DEFINER)
CREATE POLICY "skill_bars coach insert" ON public.skill_bars
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'coach'::app_role));

CREATE POLICY "skill_bars coach update" ON public.skill_bars
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'coach'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'coach'::app_role));

-- student_profiles: only coaches can create students
CREATE POLICY "students coach insert" ON public.student_profiles
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'coach'::app_role));

-- avatars: delete restricted to owning parent or coach
CREATE POLICY "avatars parent delete" ON public.avatars
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = avatars.student_id
        AND (sp.user_id = auth.uid() OR private.has_role(auth.uid(), 'coach'::app_role))
    )
  );

-- unlocked_items: update + delete restricted to owning parent or coach
CREATE POLICY "unlocked parent update" ON public.unlocked_items
  FOR UPDATE TO authenticated
  USING (
    private.has_role(auth.uid(), 'coach'::app_role) OR EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = unlocked_items.student_id AND sp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    private.has_role(auth.uid(), 'coach'::app_role) OR EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = unlocked_items.student_id AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "unlocked parent delete" ON public.unlocked_items
  FOR DELETE TO authenticated
  USING (
    private.has_role(auth.uid(), 'coach'::app_role) OR EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.id = unlocked_items.student_id AND sp.user_id = auth.uid()
    )
  );
