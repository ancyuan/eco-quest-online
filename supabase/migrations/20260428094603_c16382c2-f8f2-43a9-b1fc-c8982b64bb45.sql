-- Phase 4.1 + 4.3: daily quests, login streaks, acorns currency

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS acorns integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_quests jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS streak_current integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_best integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_last_claim date;
