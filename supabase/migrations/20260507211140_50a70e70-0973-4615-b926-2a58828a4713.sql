
-- =========================================
-- Phase S-2: Groves & Co-op Weekly Quests
-- =========================================

CREATE TABLE public.groves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🌳',
  owner_id uuid NOT NULL,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  member_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT grove_name_len CHECK (char_length(name) BETWEEN 2 AND 24),
  CONSTRAINT grove_emoji_len CHECK (char_length(emoji) BETWEEN 1 AND 4)
);

CREATE UNIQUE INDEX idx_groves_name_lower ON public.groves (lower(name));

CREATE TABLE public.grove_members (
  grove_id uuid NOT NULL REFERENCES public.groves(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  contribution integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (grove_id, user_id)
);

CREATE INDEX idx_grove_members_user ON public.grove_members(user_id);

CREATE TABLE public.grove_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grove_id uuid NOT NULL REFERENCES public.groves(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('preset','free')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_content_len CHECK (char_length(content) BETWEEN 1 AND 80)
);

CREATE INDEX idx_grove_posts_grove_time ON public.grove_posts(grove_id, created_at DESC);

CREATE TABLE public.grove_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grove_id uuid NOT NULL REFERENCES public.groves(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  kind text NOT NULL,
  label text NOT NULL,
  target integer NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  reward_xp integer NOT NULL DEFAULT 100,
  reward_acorns integer NOT NULL DEFAULT 30,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grove_id, week_start)
);

-- =========================================
-- Helpers
-- =========================================

CREATE OR REPLACE FUNCTION public.is_grove_member(_grove uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.grove_members
    WHERE grove_id = _grove AND user_id = _user
  );
$$;

CREATE OR REPLACE FUNCTION public.iso_week_start(_d date)
RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT (_d - ((EXTRACT(ISODOW FROM _d)::int - 1)))::date;
$$;

-- =========================================
-- RLS
-- =========================================

ALTER TABLE public.groves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grove_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grove_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grove_quests ENABLE ROW LEVEL SECURITY;

-- Groves: public browse (name/level), no direct writes (RPC only)
CREATE POLICY "Groves are browsable" ON public.groves FOR SELECT TO authenticated USING (true);

-- Members: visible to anyone who is in the grove or to self
CREATE POLICY "Members visible to self or co-members" ON public.grove_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_grove_member(grove_id, auth.uid())
  );

-- Posts: only members can read
CREATE POLICY "Posts readable by members" ON public.grove_posts
  FOR SELECT TO authenticated
  USING (public.is_grove_member(grove_id, auth.uid()));

-- Quests: only members can read
CREATE POLICY "Quests readable by members" ON public.grove_quests
  FOR SELECT TO authenticated
  USING (public.is_grove_member(grove_id, auth.uid()));

-- (No direct INSERT/UPDATE/DELETE policies — all writes go through SECURITY DEFINER RPCs.)

-- =========================================
-- RPCs
-- =========================================

CREATE OR REPLACE FUNCTION public.create_grove(_name text, _emoji text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _o2 integer;
  _new_id uuid;
  _name_clean text := btrim(_name);
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated'); END IF;
  IF char_length(_name_clean) < 2 OR char_length(_name_clean) > 24 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'name must be 2-24 chars');
  END IF;
  IF _emoji IS NULL OR char_length(_emoji) < 1 OR char_length(_emoji) > 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid emoji');
  END IF;

  IF EXISTS (SELECT 1 FROM public.grove_members WHERE user_id = _uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already in a grove');
  END IF;

  IF EXISTS (SELECT 1 FROM public.groves WHERE lower(name) = lower(_name_clean)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'name taken');
  END IF;

  SELECT oxygen INTO _o2 FROM public.profiles WHERE id = _uid;
  IF COALESCE(_o2, 0) < 50 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'need 50 O2');
  END IF;

  UPDATE public.profiles SET oxygen = oxygen - 50 WHERE id = _uid;

  INSERT INTO public.groves(name, emoji, owner_id) VALUES (_name_clean, _emoji, _uid)
    RETURNING id INTO _new_id;
  INSERT INTO public.grove_members(grove_id, user_id) VALUES (_new_id, _uid);

  RETURN jsonb_build_object('ok', true, 'grove_id', _new_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.join_grove(_grove uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _count integer;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated'); END IF;
  IF EXISTS (SELECT 1 FROM public.grove_members WHERE user_id = _uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already in a grove');
  END IF;
  SELECT member_count INTO _count FROM public.groves WHERE id = _grove FOR UPDATE;
  IF _count IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'grove not found'); END IF;
  IF _count >= 8 THEN RETURN jsonb_build_object('ok', false, 'error', 'grove full'); END IF;

  INSERT INTO public.grove_members(grove_id, user_id) VALUES (_grove, _uid);
  UPDATE public.groves SET member_count = member_count + 1, updated_at = now() WHERE id = _grove;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_grove(_grove uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _owner uuid;
  _count integer;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated'); END IF;
  SELECT owner_id, member_count INTO _owner, _count FROM public.groves WHERE id = _grove FOR UPDATE;
  IF _owner IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'grove not found'); END IF;

  IF _owner = _uid AND _count > 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'owner cannot leave with members present');
  END IF;

  DELETE FROM public.grove_members WHERE grove_id = _grove AND user_id = _uid;

  IF _count <= 1 THEN
    DELETE FROM public.groves WHERE id = _grove;
  ELSE
    UPDATE public.groves SET member_count = member_count - 1, updated_at = now() WHERE id = _grove;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.post_grove_message(_grove uuid, _kind text, _content text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _free_today integer;
  _preset_today integer;
  _clean text := btrim(_content);
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated'); END IF;
  IF NOT public.is_grove_member(_grove, _uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not a member');
  END IF;
  IF _kind NOT IN ('preset','free') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid kind');
  END IF;
  IF char_length(_clean) < 1 OR char_length(_clean) > 80 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'content length 1-80');
  END IF;

  IF _kind = 'free' THEN
    SELECT count(*) INTO _free_today FROM public.grove_posts
      WHERE author_id = _uid AND kind = 'free'
      AND created_at >= (_today::timestamptz);
    IF _free_today >= 1 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'free-text limit: 1/day');
    END IF;
  ELSE
    SELECT count(*) INTO _preset_today FROM public.grove_posts
      WHERE author_id = _uid AND kind = 'preset'
      AND created_at >= (_today::timestamptz);
    IF _preset_today >= 30 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'preset limit: 30/day');
    END IF;
  END IF;

  INSERT INTO public.grove_posts(grove_id, author_id, kind, content)
    VALUES (_grove, _uid, _kind, _clean);

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_weekly_quest(_grove uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _week date := public.iso_week_start((now() AT TIME ZONE 'UTC')::date);
  _existing record;
  _kinds text[] := ARRAY['plant_trees','harvest_o2','defend_threats'];
  _labels text[] := ARRAY['Plant 100 trees together','Harvest 2000 O₂ together','Defend 50 threats together'];
  _targets integer[] := ARRAY[100, 2000, 50];
  _idx int;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated'); END IF;
  IF NOT public.is_grove_member(_grove, _uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not a member');
  END IF;

  SELECT * INTO _existing FROM public.grove_quests
    WHERE grove_id = _grove AND week_start = _week;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'quest_id', _existing.id, 'created', false);
  END IF;

  -- deterministic per-grove-per-week pick
  _idx := (abs(hashtext(_grove::text || _week::text)) % 3) + 1;

  INSERT INTO public.grove_quests(grove_id, week_start, kind, label, target, reward_xp, reward_acorns)
    VALUES (_grove, _week, _kinds[_idx], _labels[_idx], _targets[_idx], 100, 30);

  RETURN jsonb_build_object('ok', true, 'created', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.contribute_grove_quest(_kind text, _amount integer)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _grove uuid;
  _week date := public.iso_week_start((now() AT TIME ZONE 'UTC')::date);
  _q record;
  _new_progress integer;
  _just_done boolean := false;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated'); END IF;
  IF _amount <= 0 THEN RETURN jsonb_build_object('ok', true, 'noop', true); END IF;

  SELECT grove_id INTO _grove FROM public.grove_members WHERE user_id = _uid LIMIT 1;
  IF _grove IS NULL THEN RETURN jsonb_build_object('ok', true, 'noop', true); END IF;

  SELECT * INTO _q FROM public.grove_quests
    WHERE grove_id = _grove AND week_start = _week AND kind = _kind
    FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', true, 'noop', true); END IF;
  IF _q.completed_at IS NOT NULL THEN RETURN jsonb_build_object('ok', true, 'already_done', true); END IF;

  _new_progress := LEAST(_q.target, _q.progress + _amount);
  _just_done := _q.progress < _q.target AND _new_progress >= _q.target;

  UPDATE public.grove_quests
    SET progress = _new_progress,
        completed_at = CASE WHEN _just_done THEN now() ELSE completed_at END
    WHERE id = _q.id;

  UPDATE public.grove_members SET contribution = contribution + _amount
    WHERE grove_id = _grove AND user_id = _uid;

  IF _just_done THEN
    -- award all members
    UPDATE public.profiles p
      SET xp = COALESCE(xp,0) + _q.reward_xp,
          acorns = COALESCE(acorns,0) + _q.reward_acorns
      FROM public.grove_members m
      WHERE m.grove_id = _grove AND m.user_id = p.id;

    UPDATE public.groves SET xp = xp + _q.reward_xp,
                             level = GREATEST(1, ((xp + _q.reward_xp) / 500) + 1),
                             updated_at = now()
      WHERE id = _grove;
  END IF;

  RETURN jsonb_build_object('ok', true, 'progress', _new_progress, 'completed', _just_done);
END;
$$;
