UPDATE public.profiles
SET notification_prefs = jsonb_build_object(
  'morning', COALESCE((notification_prefs->>'morning')::boolean, morning_reminder, true),
  'evening', COALESCE((notification_prefs->>'evening')::boolean, evening_reminder, true),
  'reminder', true,
  'motivation', true
);

ALTER TABLE public.profiles
  ALTER COLUMN notification_prefs SET DEFAULT '{"morning": true, "evening": true, "reminder": true, "motivation": true}'::jsonb;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS morning_reminder;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS evening_reminder;