
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS audio_music int NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS audio_sfx int NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS audio_muted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'id',
  ADD COLUMN IF NOT EXISTS last_haiku_day date,
  ADD COLUMN IF NOT EXISTS last_recap_week date;

CREATE TABLE IF NOT EXISTS public.tree_memorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL,
  birth_at timestamptz NOT NULL,
  died_at timestamptz NOT NULL DEFAULT now(),
  cause text NOT NULL DEFAULT 'threat',
  threats_survived int NOT NULL DEFAULT 0,
  o2_produced int NOT NULL DEFAULT 0,
  tile_index int,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tree_memorials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own memorials" ON public.tree_memorials
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own memorials" ON public.tree_memorials
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_memorials_user_died
  ON public.tree_memorials(user_id, died_at DESC);

CREATE TABLE IF NOT EXISTS public.daily_haikus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day date NOT NULL,
  text text NOT NULL,
  language text NOT NULL DEFAULT 'id',
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);
ALTER TABLE public.daily_haikus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own haikus" ON public.daily_haikus
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.weekly_recaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  text text NOT NULL,
  language text NOT NULL DEFAULT 'id',
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);
ALTER TABLE public.weekly_recaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own recaps" ON public.weekly_recaps
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
