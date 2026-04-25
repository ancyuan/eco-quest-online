// Forest Guardian — game types and constants

export type TreeKind = "oak" | "pine" | "sakura";
export type GrowthStage = "seed" | "sapling" | "mature";
export type ThreatKind = "fire" | "logger" | "pest";

export interface Tile {
  index: number;
  kind?: TreeKind;
  stage?: GrowthStage;
  plantedAt?: number; // ms
  threat?: ThreatKind;
  threatExpiresAt?: number; // ms
}

export const GRID_SIZE = 36; // 6x6
export const PLANT_COST = 2;
export const STAGE_MS = 30_000; // 30s per growth stage
export const ENERGY_MAX = 20;
export const ENERGY_REGEN_MS = 15_000; // +1 every 15s
export const THREAT_WINDOW_MS = 12_000;
export const THREAT_SPAWN_PROB = 0.06; // per tick per mature tree
export const TICK_MS = 2_000;
export const AUTO_HARVEST_MS = 60_000; // auto-harvest mature trees every minute when enabled
export const OFFLINE_MAX_MS = 12 * 60 * 60_000; // cap offline catch-up at 12h

export const TREES: Record<TreeKind, { emoji: Record<GrowthStage, string>; oxygen: number; label: string }> = {
  oak:    { emoji: { seed: "🌰", sapling: "🌿", mature: "🌳" }, oxygen: 22, label: "Oak" },
  pine:   { emoji: { seed: "🌱", sapling: "🌿", mature: "🌲" }, oxygen: 18, label: "Pine" },
  sakura: { emoji: { seed: "🌱", sapling: "🌿", mature: "🌸" }, oxygen: 15, label: "Sakura" },
};

export const THREATS: Record<ThreatKind, { emoji: string; label: string }> = {
  fire:   { emoji: "🔥", label: "Fire" },
  logger: { emoji: "🪓", label: "Logger" },
  pest:   { emoji: "🐛", label: "Pest" },
};

export const ECO_FACTS = [
  "A mature oak absorbs about 22 kg of CO₂ per year.",
  "One tree can produce enough oxygen for two people in a single day.",
  "Forests cover 31% of the world's land surface.",
  "Trees can lower nearby air temperature by up to 8°C.",
  "A single tree can be home to hundreds of species.",
  "Reforestation is one of the most effective climate solutions known.",
  "Pine forests store carbon for centuries in their soil and roots.",
  "Sakura blossoms signal a healthy, balanced ecosystem.",
];

export interface EncyclopediaEntry {
  tree_kind: TreeKind;
  label: string;
  emoji: string;
  oxygen_yield: number;
  lore: string;
  facts: string[];
  habitat: string;
  impact: string;
}

export function computeStage(plantedAt: number, now: number): GrowthStage {
  const age = now - plantedAt;
  if (age >= STAGE_MS * 2) return "mature";
  if (age >= STAGE_MS) return "sapling";
  return "seed";
}

export function randomFact(): string {
  return ECO_FACTS[Math.floor(Math.random() * ECO_FACTS.length)];
}

export function randomTreeKind(): TreeKind {
  const kinds: TreeKind[] = ["oak", "pine", "sakura"];
  return kinds[Math.floor(Math.random() * kinds.length)];
}

export function randomThreat(): ThreatKind {
  const kinds: ThreatKind[] = ["fire", "logger", "pest"];
  return kinds[Math.floor(Math.random() * kinds.length)];
}