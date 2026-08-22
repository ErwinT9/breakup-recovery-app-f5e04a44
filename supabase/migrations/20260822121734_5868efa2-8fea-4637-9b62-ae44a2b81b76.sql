GRANT SELECT ON public.motivation_guides TO authenticated;

CREATE POLICY "Authenticated can read published motivation guides"
  ON public.motivation_guides
  FOR SELECT
  TO authenticated
  USING (is_published = true);