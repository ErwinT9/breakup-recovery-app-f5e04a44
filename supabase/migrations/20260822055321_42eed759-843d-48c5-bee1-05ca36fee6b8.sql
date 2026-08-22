CREATE TABLE IF NOT EXISTS public.app_streaks (
  user_id uuid PRIMARY KEY,
  start_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  last_active_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  current_day integer NOT NULL DEFAULT 1,
  best_day integer NOT NULL DEFAULT 1,
  coloring_unlocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_streaks TO authenticated;
GRANT ALL ON public.app_streaks TO service_role;

ALTER TABLE public.app_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own app streak" ON public.app_streaks;
CREATE POLICY "Users manage their own app streak"
  ON public.app_streaks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS app_streaks_updated_at ON public.app_streaks;
CREATE TRIGGER app_streaks_updated_at BEFORE UPDATE ON public.app_streaks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();