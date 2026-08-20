DROP INDEX IF EXISTS public.notification_history_unique_per_local_day;
CREATE UNIQUE INDEX IF NOT EXISTS notification_history_unique_slot
  ON public.notification_history (user_id, notification_id, local_date);
GRANT ALL ON public.notification_history TO service_role;