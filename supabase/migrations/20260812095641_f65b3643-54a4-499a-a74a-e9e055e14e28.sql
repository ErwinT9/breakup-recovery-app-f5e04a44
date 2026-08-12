ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS notifications_permission_granted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS permission_synced_at timestamptz;

CREATE TABLE IF NOT EXISTS public.notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  notification_id integer NOT NULL,
  local_date date NOT NULL,
  scheduled_local_time text NOT NULL DEFAULT '16:30',
  device_id text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_history_unique_per_local_day
  ON public.notification_history (user_id, category, local_date);

CREATE INDEX IF NOT EXISTS notification_history_user_idx
  ON public.notification_history (user_id, sent_at DESC);

GRANT SELECT ON public.notification_history TO authenticated;
GRANT ALL ON public.notification_history TO service_role;

ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notification history"
  ON public.notification_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER notification_history_updated_at
  BEFORE UPDATE ON public.notification_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();