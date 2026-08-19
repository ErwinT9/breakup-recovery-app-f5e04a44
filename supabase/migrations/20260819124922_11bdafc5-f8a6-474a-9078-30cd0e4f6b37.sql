CREATE TABLE public.worry_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  worry_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worry_entries TO authenticated;
GRANT ALL ON public.worry_entries TO service_role;
ALTER TABLE public.worry_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own worries" ON public.worry_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER worry_entries_updated_at BEFORE UPDATE ON public.worry_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.gratitude_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  gratitude_text text NOT NULL DEFAULT '',
  item_type text NOT NULL DEFAULT 'heart',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gratitude_entries TO authenticated;
GRANT ALL ON public.gratitude_entries TO service_role;
ALTER TABLE public.gratitude_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gratitude" ON public.gratitude_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER gratitude_entries_updated_at BEFORE UPDATE ON public.gratitude_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();