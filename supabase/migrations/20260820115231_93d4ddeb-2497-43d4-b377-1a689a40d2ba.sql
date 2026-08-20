CREATE TABLE IF NOT EXISTS public.notification_history_archive (LIKE public.notification_history INCLUDING DEFAULTS);
GRANT ALL ON public.notification_history_archive TO service_role;
ALTER TABLE public.notification_history_archive ENABLE ROW LEVEL SECURITY;

INSERT INTO public.notification_history_archive SELECT * FROM public.notification_history;

DELETE FROM public.notification_history;

SELECT cron.unschedule('evening-reminders-16-30');