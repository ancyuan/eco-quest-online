-- ===== Phase S-1: Visit Interaktif & Co-op Care =====

-- 1. visit_log: tracks who visited whom today (capping & display)
CREATE TABLE public.visit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL,
  host_id uuid NOT NULL,
  day date NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date),
  defend_count integer NOT NULL DEFAULT 0,
  last_visit_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visitor_id, host_id, day)
);
CREATE INDEX idx_visit_log_host_day ON public.visit_log(host_id, day);
CREATE INDEX idx_visit_log_visitor_day ON public.visit_log(visitor_id, day);

ALTER TABLE public.visit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visit log readable by participants"
  ON public.visit_log FOR SELECT TO authenticated
  USING (auth.uid() = visitor_id OR auth.uid() = host_id);

CREATE POLICY "Visitors can insert their own visit"
  ON public.visit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = visitor_id AND visitor_id <> host_id);

CREATE POLICY "Visitors can update their own visit row"
  ON public.visit_log FOR UPDATE TO authenticated
  USING (auth.uid() = visitor_id);

-- 2. forest_signs: emote stickers left in friend's forest (24h TTL)
CREATE TABLE public.forest_signs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  host_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX idx_forest_signs_host ON public.forest_signs(host_id, expires_at);

ALTER TABLE public.forest_signs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signs readable by host and sender"
  ON public.forest_signs FOR SELECT TO authenticated
  USING (auth.uid() = host_id OR auth.uid() = sender_id);

-- (insert handled via security-definer function for cap enforcement)

-- 3. RPC: defend_friend_threat — visitor removes a threat on host's tile
CREATE OR REPLACE FUNCTION public.defend_friend_threat(_host_id uuid, _tile_index integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _visitor uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _vrow public.visit_log%ROWTYPE;
  _host_total integer;
  _forest jsonb;
  _new_tiles jsonb;
  _found boolean := false;
BEGIN
  IF _visitor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;
  IF _visitor = _host_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot defend own forest');
  END IF;

  -- visitor cap: 5/day
  SELECT COALESCE(SUM(defend_count), 0) INTO _host_total
    FROM public.visit_log
    WHERE visitor_id = _visitor AND day = _today;
  IF _host_total >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'daily defend cap reached (5)');
  END IF;

  -- per-host cap: 3/day
  SELECT * INTO _vrow FROM public.visit_log
    WHERE visitor_id = _visitor AND host_id = _host_id AND day = _today;
  IF FOUND AND _vrow.defend_count >= 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'per-friend defend cap reached (3)');
  END IF;

  -- load host's forest tiles
  SELECT tiles INTO _forest FROM public.forest_states WHERE user_id = _host_id;
  IF _forest IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forest not found');
  END IF;

  -- remove threat fields from matching tile
  SELECT jsonb_agg(
    CASE WHEN (elem->>'index')::int = _tile_index AND elem ? 'threat'
      THEN (elem - 'threat' - 'threatExpiresAt')
      ELSE elem
    END
  ) INTO _new_tiles
  FROM jsonb_array_elements(_forest) elem;

  -- check if a threat actually existed
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(_forest) e
    WHERE (e->>'index')::int = _tile_index AND e ? 'threat'
  ) INTO _found;

  IF NOT _found THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no threat on that tile');
  END IF;

  UPDATE public.forest_states SET tiles = _new_tiles, updated_at = now()
    WHERE user_id = _host_id;

  -- upsert visit_log
  INSERT INTO public.visit_log (visitor_id, host_id, day, defend_count, last_visit_at)
    VALUES (_visitor, _host_id, _today, 1, now())
    ON CONFLICT (visitor_id, host_id, day)
    DO UPDATE SET defend_count = public.visit_log.defend_count + 1, last_visit_at = now();

  -- award visitor: +10 XP, +1 acorn
  UPDATE public.profiles
    SET xp = COALESCE(xp, 0) + 10,
        acorns = COALESCE(acorns, 0) + 1
    WHERE id = _visitor;

  RETURN jsonb_build_object('ok', true, 'xp', 10, 'acorns', 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.defend_friend_threat(uuid, integer) TO authenticated;

-- 4. RPC: leave_forest_sign — visitor leaves emote (cap 1/host/day)
CREATE OR REPLACE FUNCTION public.leave_forest_sign(_host_id uuid, _emoji text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender uuid := auth.uid();
  _existing integer;
  _allowed text[] := ARRAY['🌸','🍂','⭐','💚','🌟','🍃','🌻','🌈'];
BEGIN
  IF _sender IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;
  IF _sender = _host_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot sign own forest');
  END IF;
  IF NOT (_emoji = ANY(_allowed)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid emoji');
  END IF;

  SELECT COUNT(*) INTO _existing FROM public.forest_signs
    WHERE sender_id = _sender AND host_id = _host_id
      AND created_at >= (now() - interval '24 hours');
  IF _existing >= 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already left a sign today');
  END IF;

  INSERT INTO public.forest_signs (sender_id, host_id, emoji)
    VALUES (_sender, _host_id, _emoji);

  -- mark visit
  INSERT INTO public.visit_log (visitor_id, host_id, day, last_visit_at)
    VALUES (_sender, _host_id, (now() AT TIME ZONE 'UTC')::date, now())
    ON CONFLICT (visitor_id, host_id, day)
    DO UPDATE SET last_visit_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_forest_sign(uuid, text) TO authenticated;

-- 5. RPC: water_friend_tree_boost — applies +20% growth boost (subtract 20% of growth time from earliest growing tile)
CREATE OR REPLACE FUNCTION public.water_friend_tree_boost(_host_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _visitor uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _existing integer;
  _forest jsonb;
  _new_tiles jsonb;
  _target_index integer;
  _planted_at_ms bigint;
  _now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
  _boost_ms bigint := 30000; -- ~30s shave (~+20% on a 150s growth phase)
BEGIN
  IF _visitor IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated'); END IF;
  IF _visitor = _host_id THEN RETURN jsonb_build_object('ok', false, 'error', 'self'); END IF;

  -- daily cap: 1 water per host per day
  SELECT COUNT(*) INTO _existing FROM public.friend_actions
    WHERE actor_id = _visitor AND target_id = _host_id AND day = _today AND kind = 'water';
  IF _existing >= 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already watered today');
  END IF;

  SELECT tiles INTO _forest FROM public.forest_states WHERE user_id = _host_id;
  IF _forest IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'forest not found'); END IF;

  -- find first growing (non-mature, non-ancient) planted tile
  SELECT (elem->>'index')::int, (elem->>'plantedAt')::bigint
    INTO _target_index, _planted_at_ms
  FROM jsonb_array_elements(_forest) elem
  WHERE elem ? 'plantedAt'
    AND COALESCE(elem->>'stage','') NOT IN ('mature','ancient')
  ORDER BY (elem->>'plantedAt')::bigint ASC
  LIMIT 1;

  IF _target_index IS NOT NULL THEN
    SELECT jsonb_agg(
      CASE WHEN (elem->>'index')::int = _target_index
        THEN jsonb_set(elem, '{plantedAt}', to_jsonb((COALESCE((elem->>'plantedAt')::bigint, _now_ms) - _boost_ms)))
        ELSE elem
      END
    ) INTO _new_tiles
    FROM jsonb_array_elements(_forest) elem;

    UPDATE public.forest_states SET tiles = _new_tiles, updated_at = now()
      WHERE user_id = _host_id;
  END IF;

  INSERT INTO public.friend_actions (actor_id, target_id, kind, day)
    VALUES (_visitor, _host_id, 'water', _today);

  -- visitor xp
  UPDATE public.profiles SET xp = COALESCE(xp, 0) + 5 WHERE id = _visitor;

  -- log visit
  INSERT INTO public.visit_log (visitor_id, host_id, day, last_visit_at)
    VALUES (_visitor, _host_id, _today, now())
    ON CONFLICT (visitor_id, host_id, day)
    DO UPDATE SET last_visit_at = now();

  RETURN jsonb_build_object('ok', true, 'tile_boosted', _target_index);
END;
$$;

GRANT EXECUTE ON FUNCTION public.water_friend_tree_boost(uuid) TO authenticated;
