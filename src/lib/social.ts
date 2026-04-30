import { supabase } from "@/integrations/supabase/client";

export const FRIEND_GIFT_AMOUNT = 5; // energy granted to receiver
export const FRIEND_GIFT_DAILY_CAP = 3; // max recipients per day
export const FRIEND_WATER_DAILY_CAP = 10;

export const WILD_GRID_SIZE = 20;
export const WILD_TILES = WILD_GRID_SIZE * WILD_GRID_SIZE;
export const WILD_PLANT_ENERGY = 5;
export const WILD_UPROOT_ENERGY = 5;
export const WILD_GROWTH_MS = 90_000; // 1.5 minutes per stage in shared map
export const WILD_OWNER_HARVEST = 28; // O₂ if planter harvests
export const WILD_VISITOR_HARVEST = 14; // O₂ if visitor harvests

export type WildTile = {
  tile_index: number;
  planter_id: string;
  kind: string;
  planted_at: string;
  growth_ms: number;
};

export type WildStage = "seed" | "sapling" | "mature";

export function wildStage(plantedAt: string, growthMs: number, now = Date.now()): WildStage {
  const age = now - new Date(plantedAt).getTime();
  if (age >= growthMs * 2) return "mature";
  if (age >= growthMs) return "sapling";
  return "seed";
}

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function findUserByUsername(username: string) {
  const clean = username.trim().toLowerCase();
  if (!clean) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, oxygen, trees_saved")
    .ilike("username", clean)
    .maybeSingle();
  return data;
}
