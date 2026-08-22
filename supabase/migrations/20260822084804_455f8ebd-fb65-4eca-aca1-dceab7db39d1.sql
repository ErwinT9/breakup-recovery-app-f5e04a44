UPDATE public.profiles
SET notification_prefs = jsonb_build_object(
      'morning', COALESCE((notification_prefs->>'morning')::boolean, true),
      'evening', COALESCE((notification_prefs->>'evening')::boolean, true),
      'reminder', COALESCE((notification_prefs->>'reminder')::boolean, true),
      'motivation', COALESCE((notification_prefs->>'motivation')::boolean, true)
    ),
    notifications_enabled = true
WHERE notification_prefs IS NULL
   OR NOT (notification_prefs ? 'morning' AND notification_prefs ? 'evening'
           AND notification_prefs ? 'reminder' AND notification_prefs ? 'motivation')
   OR notifications_enabled = false;

ALTER TABLE public.profiles
  ALTER COLUMN notification_prefs
  SET DEFAULT '{"morning": true, "evening": true, "reminder": true, "motivation": true}'::jsonb;