CREATE TABLE public.journey_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  level_id text NOT NULL DEFAULT 'level-1',
  activity_id text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  day_dates text[] NOT NULL DEFAULT '{}'::text[],
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, activity_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_progress TO authenticated;
GRANT ALL ON public.journey_progress TO service_role;

ALTER TABLE public.journey_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own journey progress"
ON public.journey_progress FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER journey_progress_updated_at
BEFORE UPDATE ON public.journey_progress
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.journey_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  level_id text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, level_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_levels TO authenticated;
GRANT ALL ON public.journey_levels TO service_role;

ALTER TABLE public.journey_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own journey levels"
ON public.journey_levels FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER journey_levels_updated_at
BEFORE UPDATE ON public.journey_levels
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();