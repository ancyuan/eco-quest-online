// Forest Guardian — game types, constants & progression rules

export type TreeKind =
  | "oak" | "pine" | "sakura" | "maple" | "mangrove" | "bamboo" | "cherry" | "eucalyptus";

export type GrowthStage = "seed" | "sapling" | "mature" | "ancient";
export type ThreatKind = "fire" | "logger" | "pest";
export type Biome = "rainforest" | "savanna" | "taiga";

export interface FeedLogEntry {
  // ms timestamps of feeds for ritual progress (Ancient Tree)
  feeds: number[];
}

export interface Tile {
  index: number;
  kind?: TreeKind;
  stage?: GrowthStage;
  plantedAt?: number;
  threat?: ThreatKind;
  threatExpiresAt?: number;
}

// ---------- Grid ----------
export const GRID_SIZES = [6, 7, 8, 9, 10] as const;
export const MAX_GRID = 10;
export const MAX_TILES = MAX_GRID * MAX_GRID; // pre-allocate so arrays don't resize destructively

// ---------- Costs & timings ----------
export const PLANT_COST = 2;
export const FEED_COST = 5;
export const ENERGY_MAX = 20;
export const ENERGY_REGEN_MS = 15_000;
export const THREAT_WINDOW_MS = 12_000;
export const THREAT_SPAWN_PROB = 0.06;
export const TICK_MS = 2_000;
export const AUTO_HARVEST_MS = 60_000;
export const OFFLINE_MAX_MS = 12 * 60 * 60_000;

// Ancient ritual: 3 feeds, each on a separate calendar day, while tree is mature
export const ANCIENT_FEEDS_REQUIRED = 3;
export const ANCIENT_FEED_COOLDOWN_MS = 20 * 60_000; // can't feed same tile twice within 20min (prevents same-day spam)

// ---------- Trees ----------
// growthMs = ms per stage (seed→sapling→mature). 4× that for ancient ritual visible in HUD.
export interface TreeDef {
  label: string;
  emoji: Record<GrowthStage, string>;
  oxygen: number;          // base O2 on mature harvest
  ancientOxygen: number;   // O2 on ancient harvest (huge)
  growthMs: number;        // ms per stage
  biomes: Biome[];         // which biomes can grow this species
}

export const TREES: Record<TreeKind, TreeDef> = {
  oak:        { label: "Oak",        emoji: { seed: "🌰", sapling: "🌿", mature: "🌳", ancient: "🌳" }, oxygen: 22, ancientOxygen: 110, growthMs: 30_000, biomes: ["rainforest","taiga"] },
  pine:       { label: "Pine",       emoji: { seed: "🌱", sapling: "🌿", mature: "🌲", ancient: "🌲" }, oxygen: 18, ancientOxygen:  90, growthMs: 25_000, biomes: ["taiga"] },
  sakura:     { label: "Sakura",     emoji: { seed: "🌱", sapling: "🌿", mature: "🌸", ancient: "🌸" }, oxygen: 15, ancientOxygen:  75, growthMs: 20_000, biomes: ["rainforest"] },
  maple:      { label: "Maple",      emoji: { seed: "🌱", sapling: "🌿", mature: "🍁", ancient: "🍁" }, oxygen: 28, ancientOxygen: 140, growthMs: 40_000, biomes: ["taiga"] },
  mangrove:   { label: "Mangrove",   emoji: { seed: "🌱", sapling: "🌿", mature: "🌴", ancient: "🌴" }, oxygen: 35, ancientOxygen: 180, growthMs: 50_000, biomes: ["rainforest"] },
  bamboo:     { label: "Bamboo",     emoji: { seed: "🌱", sapling: "🎋", mature: "🎋", ancient: "🎋" }, oxygen: 12, ancientOxygen:  60, growthMs: 12_000, biomes: ["rainforest","savanna"] },
  cherry:     { label: "Cherry",     emoji: { seed: "🌱", sapling: "🌿", mature: "🍒", ancient: "🍒" }, oxygen: 17, ancientOxygen:  85, growthMs: 22_000, biomes: ["rainforest","taiga"] },
  eucalyptus: { label: "Eucalyptus", emoji: { seed: "🌱", sapling: "🌿", mature: "🌿", ancient: "🌳" }, oxygen: 25, ancientOxygen: 125, growthMs: 35_000, biomes: ["savanna"] },
};

export const ALL_TREE_KINDS = Object.keys(TREES) as TreeKind[];

// ---------- Threats ----------
export const THREATS: Record<ThreatKind, { emoji: string; label: string }> = {
  fire:   { emoji: "🔥", label: "Fire" },
  logger: { emoji: "🪓", label: "Logger" },
  pest:   { emoji: "🐛", label: "Pest" },
};

// ---------- Biomes ----------
export interface BiomeDef {
  label: string;
  emoji: string;
  bg: string;             // tailwind classes for tile bg tint
  oxygenBonusPct: number; // % bonus on harvests in this biome
  description: string;
}

export const BIOMES: Record<Biome, BiomeDef> = {
  rainforest: { label: "Rainforest", emoji: "🌧️", bg: "bg-emerald-900/15", oxygenBonusPct: 15, description: "Lush canopy. +15% O₂ for trees grown here." },
  savanna:    { label: "Savanna",    emoji: "🌾", bg: "bg-amber-700/15",   oxygenBonusPct: 10, description: "Open grasslands. +10% O₂ for drought-tolerant species." },
  taiga:      { label: "Taiga",      emoji: "❄️", bg: "bg-sky-800/15",     oxygenBonusPct: 20, description: "Cold conifer forest. +20% O₂ but slower regen overall." },
};

export const ALL_BIOMES = Object.keys(BIOMES) as Biome[];

// ---------- Achievements ----------
export interface AchievementDef {
  id: string;
  label: string;
  emoji: string;
  description: string;
  // returns true if unlocked given the stats
  test: (s: AchievementStats) => boolean;
}

export interface AchievementStats {
  oxygen: number;
  treesSaved: number;
  ancientCount: number; // ancient trees grown (cumulative)
  speciesPlanted: Set<TreeKind>;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_steps",   label: "First Steps",   emoji: "🌱", description: "Reach 100 O₂",                 test: s => s.oxygen >= 100 },
  { id: "guardian",      label: "Guardian",      emoji: "🛡️", description: "Save 25 trees",                test: s => s.treesSaved >= 25 },
  { id: "botanist",      label: "Botanist",      emoji: "🌿", description: "Plant 4 different species",    test: s => s.speciesPlanted.size >= 4 },
  { id: "elder_keeper",  label: "Elder Keeper",  emoji: "🌳", description: "Grow your first Ancient Tree", test: s => s.ancientCount >= 1 },
  { id: "rainmaker",     label: "Rainmaker",     emoji: "🌧️", description: "Reach 1,000 O₂",               test: s => s.oxygen >= 1000 },
  { id: "ranger",        label: "Ranger",        emoji: "🏞️", description: "Save 100 trees",               test: s => s.treesSaved >= 100 },
  { id: "ancient_circle",label: "Ancient Circle",emoji: "🗿", description: "Grow 5 Ancient Trees",          test: s => s.ancientCount >= 5 },
];

// ---------- Unlock rules (Hybrid: Oxygen + Achievements) ----------
export interface TreeUnlockRule {
  kind: TreeKind;
  oxygen?: number;
  achievement?: string;
  description: string;
}

export const TREE_UNLOCKS: TreeUnlockRule[] = [
  { kind: "cherry",     oxygen: 250,  description: "250 O₂" },
  { kind: "maple",      oxygen: 500,  description: "500 O₂" },
  { kind: "bamboo",     achievement: "botanist", description: "earn 'Botanist' achievement" },
  { kind: "mangrove",   oxygen: 1500, description: "1,500 O₂" },
  { kind: "eucalyptus", achievement: "elder_keeper", description: "earn 'Elder Keeper' achievement" },
];

export interface GridUnlockRule { size: number; oxygen: number; }
export const GRID_UNLOCKS: GridUnlockRule[] = [
  { size: 7,  oxygen: 300 },
  { size: 8,  oxygen: 800 },
  { size: 9,  oxygen: 1800 },
  { size: 10, oxygen: 3500 },
];

export interface BiomeUnlockRule { biome: Biome; oxygen?: number; achievement?: string; description: string; }
export const BIOME_UNLOCKS: BiomeUnlockRule[] = [
  { biome: "savanna", oxygen: 600,  description: "600 O₂" },
  { biome: "taiga",   achievement: "guardian", description: "earn 'Guardian' achievement" },
];

// ---------- Eco facts ----------
export const ECO_FACTS = [
  "A mature oak absorbs about 22 kg of CO₂ per year.",
  "One tree can produce enough oxygen for two people in a single day.",
  "Mangroves store up to 4× more carbon per hectare than rainforests.",
  "Bamboo is the fastest-growing plant on Earth.",
  "Maple sap takes 40 liters to make 1 liter of syrup.",
  "Eucalyptus oil naturally repels many pests.",
  "Cherry blossoms bloom earlier each decade as climate warms.",
  "Pine cones can wait decades for fire before releasing seeds.",
  "Ancient trees store carbon for centuries in their heartwood.",
];

// ---------- Encyclopedia type ----------
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

// ---------- Helpers ----------
export function computeStage(plantedAt: number, now: number, kind: TreeKind, isAncient = false): GrowthStage {
  if (isAncient) return "ancient";
  const def = TREES[kind];
  const age = now - plantedAt;
  if (age >= def.growthMs * 2) return "mature";
  if (age >= def.growthMs) return "sapling";
  return "seed";
}

export function randomFact(): string {
  return ECO_FACTS[Math.floor(Math.random() * ECO_FACTS.length)];
}

export function randomThreat(): ThreatKind {
  const kinds: ThreatKind[] = ["fire", "logger", "pest"];
  return kinds[Math.floor(Math.random() * kinds.length)];
}

// Default biome layout: split the grid into 3 vertical bands (rainforest | savanna | taiga)
// but only assign biomes the player has unlocked. Unassigned tiles default to rainforest.
export function defaultBiomeZones(gridSize: number, unlocked: Biome[]): Record<number, Biome> {
  const zones: Record<number, Biome> = {};
  const order: Biome[] = ["rainforest", "savanna", "taiga"].filter(b => unlocked.includes(b as Biome)) as Biome[];
  if (order.length === 0) order.push("rainforest");
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const idx = r * gridSize + c;
      const band = Math.min(order.length - 1, Math.floor(c / Math.ceil(gridSize / order.length)));
      zones[idx] = order[band];
    }
  }
  return zones;
}

export function biomeForTile(zones: Record<number, Biome>, index: number): Biome {
  return zones[index] ?? "rainforest";
}

export function canPlantInBiome(kind: TreeKind, biome: Biome): boolean {
  return TREES[kind].biomes.includes(biome);
}

// Total O2 yield, applying biome bonus
export function harvestYield(kind: TreeKind, biome: Biome, isAncient: boolean): number {
  const base = isAncient ? TREES[kind].ancientOxygen : TREES[kind].oxygen;
  const bonus = 1 + BIOMES[biome].oxygenBonusPct / 100;
  return Math.round(base * bonus);
}

// ---------- Unlock check ----------
export interface UnlockState {
  unlocked_trees: TreeKind[];
  unlocked_grid_size: number;
  unlocked_biomes: Biome[];
  achievements: string[];
}

export interface UnlockChange {
  newTrees: TreeKind[];
  newGridSize?: number;
  newBiomes: Biome[];
  newAchievements: AchievementDef[];
}

export function evaluateUnlocks(stats: AchievementStats, current: UnlockState): UnlockChange {
  // Achievements first (unlocks may depend on them)
  const newAchievements: AchievementDef[] = ACHIEVEMENTS.filter(
    a => !current.achievements.includes(a.id) && a.test(stats)
  );
  const allAch = new Set([...current.achievements, ...newAchievements.map(a => a.id)]);

  const newTrees: TreeKind[] = [];
  for (const rule of TREE_UNLOCKS) {
    if (current.unlocked_trees.includes(rule.kind)) continue;
    const oxOk = rule.oxygen === undefined || stats.oxygen >= rule.oxygen;
    const achOk = !rule.achievement || allAch.has(rule.achievement);
    if (oxOk && achOk) newTrees.push(rule.kind);
  }

  const newBiomes: Biome[] = [];
  for (const rule of BIOME_UNLOCKS) {
    if (current.unlocked_biomes.includes(rule.biome)) continue;
    const oxOk = rule.oxygen === undefined || stats.oxygen >= rule.oxygen;
    const achOk = !rule.achievement || allAch.has(rule.achievement);
    if (oxOk && achOk) newBiomes.push(rule.biome);
  }

  let newGridSize: number | undefined;
  for (const rule of GRID_UNLOCKS) {
    if (rule.size > current.unlocked_grid_size && stats.oxygen >= rule.oxygen) {
      newGridSize = rule.size;
    }
  }

  return { newTrees, newGridSize, newBiomes, newAchievements };
}

// ---------- Ancient ritual logic ----------
export interface FeedLog { [tileIndex: number]: number[]; } // ts of feeds per tile

export function canFeed(log: FeedLog, tileIndex: number, now: number): boolean {
  const feeds = log[tileIndex] ?? [];
  const last = feeds[feeds.length - 1];
  if (last && now - last < ANCIENT_FEED_COOLDOWN_MS) return false;
  return feeds.length < ANCIENT_FEEDS_REQUIRED;
}

export function feedProgress(log: FeedLog, tileIndex: number): number {
  return Math.min(ANCIENT_FEEDS_REQUIRED, (log[tileIndex] ?? []).length);
}

export function isReadyForAncient(log: FeedLog, tileIndex: number): boolean {
  return (log[tileIndex] ?? []).length >= ANCIENT_FEEDS_REQUIRED;
}

// ============================================================
// PHASE 3: Weather, Synergy, Skill Tree, Companions
// ============================================================

// ---------- Weather ----------
export type Weather = "sunny" | "rain" | "fog" | "storm";

export interface WeatherDef {
  label: string;
  emoji: string;
  description: string;
  // multipliers
  growthMul: (biome: Biome) => number;
  harvestMul: number;
  threatProbMul: number;
}

export const WEATHERS: Record<Weather, WeatherDef> = {
  sunny: {
    label: "Sunny", emoji: "☀️",
    description: "+10% O₂ on harvest. A perfect day for the forest.",
    growthMul: () => 1, harvestMul: 1.10, threatProbMul: 1,
  },
  rain: {
    label: "Rain", emoji: "🌧️",
    description: "Rainforest grows +20% faster. Threats slightly less frequent.",
    growthMul: (b) => (b === "rainforest" ? 1.2 : 1.0),
    harvestMul: 1, threatProbMul: 0.7,
  },
  fog: {
    label: "Fog", emoji: "🌫️",
    description: "Mysterious calm. Ancient feed cooldown halved.",
    growthMul: () => 1, harvestMul: 1, threatProbMul: 0.5,
  },
  storm: {
    label: "Storm", emoji: "🌪️",
    description: "Loggers are bolder. +60% threat chance.",
    growthMul: () => 0.9, harvestMul: 1, threatProbMul: 1.6,
  },
};

export const WEATHER_CYCLE_MS = 5 * 60_000;

export interface WeatherState {
  weather: Weather;
  startedAt: number;
  durationMs: number;
}

export function pickWeather(seed: number): Weather {
  const order: Weather[] = ["sunny", "rain", "fog", "storm"];
  return order[Math.abs(seed) % order.length];
}

export function weatherRemainingMs(w: WeatherState, now: number): number {
  return Math.max(0, w.startedAt + w.durationMs - now);
}

// ---------- Skill Tree ----------
export type SkillPath = "cultivator" | "protector" | "naturalist";

export interface SkillNode {
  id: string;
  path: SkillPath;
  label: string;
  emoji: string;
  description: string;
  maxRank: number;
}

export const SKILL_TREE: SkillNode[] = [
  // Cultivator
  { id: "growth_speed", path: "cultivator", label: "Green Thumb",      emoji: "🌱", description: "+5% growth speed per rank", maxRank: 5 },
  { id: "oxygen_yield", path: "cultivator", label: "Photosynthesis",   emoji: "☀️", description: "+5% O₂ harvest per rank",   maxRank: 5 },
  // Protector
  { id: "threat_window",path: "protector",  label: "Watchful Eye",     emoji: "👁️", description: "+15% threat defend window per rank", maxRank: 5 },
  { id: "auto_defend",  path: "protector",  label: "Forest Wardens",   emoji: "🛡️", description: "1 auto-defend per minute per rank",  maxRank: 3 },
  // Naturalist
  { id: "max_energy",   path: "naturalist", label: "Endurance",        emoji: "💧", description: "+2 max energy per rank",     maxRank: 5 },
  { id: "feed_cost",    path: "naturalist", label: "Efficient Ritual", emoji: "🍯", description: "-1 feed cost per rank (min 1)", maxRank: 4 },
];

export type SkillRanks = Partial<Record<string, number>>;

export function xpForLevel(level: number): number {
  // 100, 250, 450, 700, 1000, ...
  return 100 + (level - 1) * 150 + Math.max(0, (level - 1) * (level - 1) * 25);
}

export function computeLevel(xp: number): { level: number; into: number; need: number } {
  let lvl = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(lvl)) {
    remaining -= xpForLevel(lvl);
    lvl++;
  }
  return { level: lvl, into: remaining, need: xpForLevel(lvl) };
}

export const XP_PLANT = 2;
export const XP_HARVEST = 5;
export const XP_HARVEST_ANCIENT = 25;
export const XP_DEFEND = 4;
export const XP_FEED = 3;

export function skillRank(skills: SkillRanks, id: string): number {
  return skills[id] ?? 0;
}

export function effectiveMaxEnergy(skills: SkillRanks): number {
  return ENERGY_MAX + 2 * skillRank(skills, "max_energy");
}

export function effectiveFeedCost(skills: SkillRanks): number {
  return Math.max(1, FEED_COST - skillRank(skills, "feed_cost"));
}

export function effectiveThreatWindowMs(skills: SkillRanks): number {
  return Math.round(THREAT_WINDOW_MS * (1 + 0.15 * skillRank(skills, "threat_window")));
}

// ---------- Synergy (adjacency) ----------
// Returns multiplier on harvest yield based on neighbors.
// +5% per same-species neighbor (max 4 = +20%), +3% per different-species neighbor (max 4 = +12%, growth-flavored small O₂ tip).
export function synergyMultiplier(tiles: Tile[], gridSize: number, index: number, kind: TreeKind): number {
  const r = Math.floor(index / gridSize);
  const c = index % gridSize;
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  let same = 0, diff = 0;
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= gridSize || nc >= gridSize) continue;
    const n = tiles[nr * gridSize + nc];
    if (!n || !n.kind) continue;
    if (n.kind === kind) same++;
    else diff++;
  }
  return 1 + same * 0.05 + diff * 0.03;
}

// ---------- Companions ----------
export type CompanionId = "butterfly" | "owl" | "panda" | "deer" | "fox" | "frog";

export interface CompanionDef {
  id: CompanionId;
  label: string;
  emoji: string;
  description: string;
  unlockSpecies: TreeKind;   // harvest 50 of this species
  unlockCount: number;
}

export const COMPANIONS: CompanionDef[] = [
  { id: "butterfly", label: "Sakura Butterfly", emoji: "🦋", description: "+10% harvest O₂",        unlockSpecies: "sakura",     unlockCount: 50 },
  { id: "owl",       label: "Oak Owl",          emoji: "🦉", description: "+1 energy regen tick",   unlockSpecies: "oak",        unlockCount: 50 },
  { id: "panda",     label: "Bamboo Panda",     emoji: "🐼", description: "−25% threat spawn rate", unlockSpecies: "bamboo",     unlockCount: 50 },
  { id: "deer",      label: "Maple Deer",       emoji: "🦌", description: "+5% growth speed",       unlockSpecies: "maple",      unlockCount: 50 },
  { id: "fox",       label: "Pine Fox",         emoji: "🦊", description: "1 auto-defend / 5min",   unlockSpecies: "pine",       unlockCount: 50 },
  { id: "frog",      label: "Mangrove Frog",    emoji: "🐸", description: "+10% O₂ in Rainforest",  unlockSpecies: "mangrove",   unlockCount: 50 },
];

export const MAX_ACTIVE_COMPANIONS = 3;

export interface CompanionEffects {
  harvestMul: number;
  growthMul: number;
  threatProbMul: number;
  rainforestBonus: number; // additive multiplier on rainforest harvests
  energyTickBonus: number; // extra +1 per regen tick per stack
  autoDefendPerMs: number; // 1 / interval
}

export function aggregateCompanionEffects(active: CompanionId[]): CompanionEffects {
  const eff: CompanionEffects = {
    harvestMul: 1, growthMul: 1, threatProbMul: 1,
    rainforestBonus: 0, energyTickBonus: 0, autoDefendPerMs: 0,
  };
  for (const id of active) {
    switch (id) {
      case "butterfly": eff.harvestMul *= 1.10; break;
      case "owl":       eff.energyTickBonus += 1; break;
      case "panda":     eff.threatProbMul *= 0.75; break;
      case "deer":      eff.growthMul *= 1.05; break;
      case "fox":       eff.autoDefendPerMs += 1 / (5 * 60_000); break;
      case "frog":      eff.rainforestBonus += 0.10; break;
    }
  }
  return eff;
}

// Combined harvest yield with biome + weather + companions + synergy + skills.
export function harvestYieldFull(params: {
  kind: TreeKind;
  biome: Biome;
  isAncient: boolean;
  weather: Weather;
  skills: SkillRanks;
  companions: CompanionId[];
  synergyMul: number;
}): number {
  const { kind, biome, isAncient, weather, skills, companions, synergyMul } = params;
  const base = isAncient ? TREES[kind].ancientOxygen : TREES[kind].oxygen;
  const biomeMul = 1 + BIOMES[biome].oxygenBonusPct / 100;
  const weatherMul = WEATHERS[weather].harvestMul;
  const skillMul = 1 + 0.05 * skillRank(skills, "oxygen_yield");
  const compEff = aggregateCompanionEffects(companions);
  const compMul = compEff.harvestMul * (biome === "rainforest" ? 1 + compEff.rainforestBonus : 1);
  return Math.round(base * biomeMul * weatherMul * skillMul * compMul * synergyMul);
}

// Effective growthMs given weather, skills, companions
export function effectiveGrowthMs(kind: TreeKind, biome: Biome, weather: Weather, skills: SkillRanks, companions: CompanionId[]): number {
  const base = TREES[kind].growthMs;
  const wMul = WEATHERS[weather].growthMul(biome);
  const sMul = 1 + 0.05 * skillRank(skills, "growth_speed");
  const cMul = aggregateCompanionEffects(companions).growthMul;
  return Math.round(base / (wMul * sMul * cMul));
}

// Stage with effective growth
export function computeStageEff(plantedAt: number, now: number, kind: TreeKind, biome: Biome, weather: Weather, skills: SkillRanks, companions: CompanionId[], isAncient = false): GrowthStage {
  if (isAncient) return "ancient";
  const ms = effectiveGrowthMs(kind, biome, weather, skills, companions);
  const age = now - plantedAt;
  if (age >= ms * 2) return "mature";
  if (age >= ms) return "sapling";
  return "seed";
}

// Tally helpers (track per-species harvest count for companion unlock)
export type HarvestTally = Partial<Record<TreeKind, number>>;

export function bumpTally(tally: HarvestTally, kind: TreeKind, by = 1): HarvestTally {
  return { ...tally, [kind]: (tally[kind] ?? 0) + by };
}

export function evaluateCompanionUnlocks(tally: HarvestTally, currentUnlocked: CompanionId[]): CompanionId[] {
  const out: CompanionId[] = [];
  for (const c of COMPANIONS) {
    if (currentUnlocked.includes(c.id)) continue;
    if ((tally[c.unlockSpecies] ?? 0) >= c.unlockCount) out.push(c.id);
  }
  return out;
}

export function totalSkillPointsSpent(skills: SkillRanks): number {
  return Object.values(skills).reduce<number>((a, b) => a + (b ?? 0), 0);
}
