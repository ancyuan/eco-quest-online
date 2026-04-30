-- 1. Profiles: username + wild garden opt-in
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS wild_garden_optin boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- 2. Friendships (one row per direction; "accepted" implies reciprocal row exists)
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id),
  CHECK (user_id <> friend_id)
);
CREATE INDEX IF NOT EXISTS friendships_user_idx ON public.friendships (user_id);
CREATE INDEX IF NOT EXISTS friendships_friend_idx ON public.friendships (friend_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Friendships viewable by participants"
  ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create their own friendships"
  ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their incoming friendships"
  ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = friend_id OR auth.uid() = user_id);

CREATE POLICY "Users can delete their own friendships"
  ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 3. Friend actions (water & gift, daily-capped client-side)
CREATE TABLE IF NOT EXISTS public.friend_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  target_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('water', 'gift')),
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, target_id, kind, day)
);
CREATE INDEX IF NOT EXISTS friend_actions_actor_day_idx ON public.friend_actions (actor_id, day);
CREATE INDEX IF NOT EXISTS friend_actions_target_idx ON public.friend_actions (target_id, day);

ALTER TABLE public.friend_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Friend actions viewable by participants"
  ON public.friend_actions FOR SELECT TO authenticated
  USING (auth.uid() = actor_id OR auth.uid() = target_id);

CREATE POLICY "Users can create their own friend actions"
  ON public.friend_actions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- 4. Wild garden (shared 20x20 board)
CREATE TABLE IF NOT EXISTS public.wild_garden (
  tile_index integer PRIMARY KEY CHECK (tile_index >= 0 AND tile_index < 400),
  planter_id uuid NOT NULL,
  kind text NOT NULL,
  planted_at timestamptz NOT NULL DEFAULT now(),
  growth_ms integer NOT NULL DEFAULT 30000,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wild_garden_planter_idx ON public.wild_garden (planter_id);

ALTER TABLE public.wild_garden ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wild garden is public"
  ON public.wild_garden FOR SELECT TO authenticated
  USING (true);

-- Only opted-in users can plant on empty tiles
CREATE POLICY "Opted-in users can plant in wild garden"
  ON public.wild_garden FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = planter_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.wild_garden_optin = true
    )
  );

-- Anyone opted-in can delete (uproot or harvest)
CREATE POLICY "Opted-in users can uproot/harvest wild garden"
  ON public.wild_garden FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.wild_garden_optin = true
    )
  );

-- updated_at trigger
DROP TRIGGER IF EXISTS wild_garden_set_updated_at ON public.wild_garden;
CREATE TRIGGER wild_garden_set_updated_at
  BEFORE UPDATE ON public.wild_garden
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.wild_garden;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_actions;