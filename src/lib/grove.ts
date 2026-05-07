import { supabase } from "@/integrations/supabase/client";

// Untyped RPC helpers (functions added in Phase S-2 migration; types regenerate later).
const rpc = (name: string, args?: Record<string, unknown>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any).rpc(name, args);

export const PRESET_EMOTES = [
  "🌸 Nice work!",
  "🌳 Let's plant more!",
  "🛡️ I'll defend tonight",
  "💧 Watering round",
  "🔥 Heads up — threats!",
  "🌟 Quest almost done",
  "🍃 GG team",
  "🌰 Saving acorns",
] as const;

export type Grove = {
  id: string;
  name: string;
  emoji: string;
  owner_id: string;
  xp: number;
  level: number;
  member_count: number;
};

export type GrovePost = {
  id: string;
  grove_id: string;
  author_id: string;
  kind: "preset" | "free";
  content: string;
  created_at: string;
};

export type GroveQuest = {
  id: string;
  grove_id: string;
  week_start: string;
  kind: string;
  label: string;
  target: number;
  progress: number;
  reward_xp: number;
  reward_acorns: number;
  completed_at: string | null;
};

export type GroveMember = {
  grove_id: string;
  user_id: string;
  contribution: number;
  joined_at: string;
};

export const createGrove = (name: string, emoji: string) =>
  rpc("create_grove", { _name: name, _emoji: emoji });
export const joinGrove = (groveId: string) => rpc("join_grove", { _grove: groveId });
export const leaveGrove = (groveId: string) => rpc("leave_grove", { _grove: groveId });
export const postGroveMessage = (groveId: string, kind: "preset" | "free", content: string) =>
  rpc("post_grove_message", { _grove: groveId, _kind: kind, _content: content });
export const ensureWeeklyQuest = (groveId: string) =>
  rpc("ensure_weekly_quest", { _grove: groveId });

// Fire-and-forget — feeds the player's grove weekly quest. Safe no-op when not in a grove.
export function contributeToGroveQuest(kind: "plant_trees" | "harvest_o2" | "defend_threats", amount = 1) {
  if (amount <= 0) return;
  rpc("contribute_grove_quest", { _kind: kind, _amount: amount }).then?.(() => {}, () => {});
}