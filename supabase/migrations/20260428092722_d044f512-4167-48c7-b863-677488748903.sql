-- Phase 3: Depth & Strategy

-- 1. Extend profiles with XP, level, skill points, skills, companions, harvest tally
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS skill_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skills jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS unlocked_companions text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS active_companions text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS harvest_tally jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Global weather state (single row, server-driven, fair for all players)
CREATE TABLE IF NOT EXISTS public.weather_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  weather text NOT NULL DEFAULT 'sunny',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  duration_ms integer NOT NULL DEFAULT 300000,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.weather_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weather is public"
  ON public.weather_state FOR SELECT
  USING (true);

-- Seed initial row
INSERT INTO public.weather_state (id, weather, started_at, duration_ms)
VALUES (1, 'sunny', now(), 300000)
ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER update_weather_state_updated_at
  BEFORE UPDATE ON public.weather_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();