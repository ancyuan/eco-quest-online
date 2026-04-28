// Phase 4.1 + 4.3 — Daily Quests & Login Streak

import type { TreeKind, Biome } from "./game";

// ---------- Quest types ----------
export type QuestEvent =
  | { type: "plant"; kind: TreeKind; biome: Biome }
  | { type: "harvest"; kind: TreeKind; biome: Biome; isAncient: boolean; oxygen: number }
  | { type: "defend" }
  | { type: "feed" }
  | { type: "ancient" };

export type QuestGoal =
  | { kind: "plant_species"; species: TreeKind; count: number }
  | { kind: "plant_any"; count: number }
  | { kind: "harvest_o2"; amount: number }
  | { kind: "defend"; count: number }
  | { kind: "feed"; count: number }
  | { kind: "plant_biomes"; count: number }
  | { kind: "ancient"; count: number };

export interface QuestDef {
  id: string;
  label: string;
  emoji: string;
  goal: QuestGoal;
  reward: { xp: number; acorns: number };
}

export interface QuestProgress {
  id: string;
  done: number;       // current progress
  target: number;
  claimed: boolean;
  // ancillary state, e.g. set of biomes seen
  meta?: Record<string, unknown>;
}

export interface DailyQuestState {
  date: string;       // YYYY-MM-DD (UTC)
  quests: QuestProgress[];
  defs: QuestDef[];
}

// ---------- Quest pool (mix of easy / med / hard) ----------
const POOL: QuestDef[] = [
  { id: "plant5_oak",     label: "Plant 5 Oak trees",         emoji: "🌳", goal: { kind: "plant_species", species: "oak", count: 5 },     reward: { xp: 30, acorns: 10 } },
  { id: "plant5_sakura",  label: "Plant 5 Sakura trees",      emoji: "🌸", goal: { kind: "plant_species", species: "sakura", count: 5 }, reward: { xp: 30, acorns: 10 } },
  { id: "plant5_pine",    label: "Plant 5 Pine trees",        emoji: "🌲", goal: { kind: "plant_species", species: "pine", count: 5 },   reward: { xp: 30, acorns: 10 } },
  { id: "plant10_any",    label: "Plant 10 trees",            emoji: "🌱", goal: { kind: "plant_any", count: 10 },                      reward: { xp: 40, acorns: 12 } },
  { id: "harvest_200",    label: "Harvest 200 O₂",            emoji: "💨", goal: { kind: "harvest_o2", amount: 200 },                   reward: { xp: 50, acorns: 15 } },
  { id: "harvest_500",    label: "Harvest 500 O₂",            emoji: "💨", goal: { kind: "harvest_o2", amount: 500 },                   reward: { xp: 90, acorns: 25 } },
  { id: "defend_8",       label: "Defend 8 threats",          emoji: "🛡️", goal: { kind: "defend", count: 8 },                          reward: { xp: 50, acorns: 15 } },
  { id: "defend_15",      label: "Defend 15 threats",         emoji: "🛡️", goal: { kind: "defend", count: 15 },                         reward: { xp: 90, acorns: 25 } },
  { id: "feed_2",         label: "Feed Ancient ritual 2×",    emoji: "🍯", goal: { kind: "feed", count: 2 },                            reward: { xp: 40, acorns: 12 } },
  { id: "biomes_2",       label: "Plant in 2 different biomes", emoji: "🗺️", goal: { kind: "plant_biomes", count: 2 },                  reward: { xp: 60, acorns: 18 } },
  { id: "biomes_3",       label: "Plant in 3 different biomes", emoji: "🗺️", goal: { kind: "plant_biomes", count: 3 },                  reward: { xp: 100, acorns: 30 } },
  { id: "ancient_1",      label: "Awaken 1 Ancient Tree",     emoji: "🌳", goal: { kind: "ancient", count: 1 },                          reward: { xp: 120, acorns: 40 } },
];

// ---------- Date helpers ----------
export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const da = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const db = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((db - da) / 86_400_000);
}

// Simple deterministic shuffle (mulberry32 + Fisher-Yates) seeded by user+date.
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDailyQuests(userId: string, date: string, count = 3): QuestDef[] {
  const r = rng(hashSeed(`${userId}:${date}`));
  const arr = [...POOL];
  // Fisher-Yates
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

export function makeFreshDailyState(userId: string, date = todayKey()): DailyQuestState {
  const defs = generateDailyQuests(userId, date);
  return {
    date,
    defs,
    quests: defs.map(d => ({
      id: d.id,
      done: 0,
      target: questTarget(d.goal),
      claimed: false,
      meta: d.goal.kind === "plant_biomes" ? { biomes: [] as string[] } : undefined,
    })),
  };
}

function questTarget(g: QuestGoal): number {
  switch (g.kind) {
    case "plant_species":
    case "plant_any":
    case "defend":
    case "feed":
    case "ancient": return g.count;
    case "plant_biomes": return g.count;
    case "harvest_o2": return g.amount;
  }
}

// Re-derive defs from stored quest IDs (so ALL game data isn't bloated in DB).
export function rehydrateDefs(state: { date: string; quests: QuestProgress[] }): QuestDef[] {
  return state.quests
    .map(q => POOL.find(d => d.id === q.id))
    .filter((d): d is QuestDef => !!d);
}

// Apply an event to current state, returning new state and any quest that just completed.
export function applyEvent(state: DailyQuestState, ev: QuestEvent): { state: DailyQuestState; completed: QuestDef[] } {
  const completed: QuestDef[] = [];
  const quests = state.quests.map((q) => {
    if (q.claimed || q.done >= q.target) return q;
    const def = state.defs.find(d => d.id === q.id);
    if (!def) return q;
    let inc = 0;
    let nextMeta = q.meta;
    switch (def.goal.kind) {
      case "plant_species":
        if (ev.type === "plant" && ev.kind === def.goal.species) inc = 1;
        break;
      case "plant_any":
        if (ev.type === "plant") inc = 1;
        break;
      case "harvest_o2":
        if (ev.type === "harvest") inc = ev.oxygen;
        break;
      case "defend":
        if (ev.type === "defend") inc = 1;
        break;
      case "feed":
        if (ev.type === "feed") inc = 1;
        break;
      case "ancient":
        if (ev.type === "ancient") inc = 1;
        break;
      case "plant_biomes": {
        if (ev.type === "plant") {
          const seen = new Set((q.meta?.biomes as string[]) ?? []);
          if (!seen.has(ev.biome)) {
            seen.add(ev.biome);
            nextMeta = { biomes: Array.from(seen) };
            return { ...q, meta: nextMeta, done: Math.min(q.target, seen.size) };
          }
        }
        break;
      }
    }
    if (inc <= 0) return q;
    const nextDone = Math.min(q.target, q.done + inc);
    const just = q.done < q.target && nextDone >= q.target;
    if (just) completed.push(def);
    return { ...q, done: nextDone, meta: nextMeta };
  });
  return { state: { ...state, quests }, completed };
}

export function claimQuest(state: DailyQuestState, id: string): { state: DailyQuestState; def: QuestDef | null } {
  const def = state.defs.find(d => d.id === id) ?? null;
  if (!def) return { state, def: null };
  const quests = state.quests.map(q =>
    q.id === id && q.done >= q.target && !q.claimed ? { ...q, claimed: true } : q
  );
  return { state: { ...state, quests }, def };
}

// Lightweight wire format (don't persist defs — re-derive from POOL by id)
export interface DailyQuestStateWire {
  date: string;
  quests: QuestProgress[];
}

export function toWire(s: DailyQuestState): DailyQuestStateWire {
  return { date: s.date, quests: s.quests };
}

export function fromWire(w: DailyQuestStateWire | null | undefined, userId: string): DailyQuestState {
  const today = todayKey();
  if (!w || !w.date || w.date !== today || !Array.isArray(w.quests) || w.quests.length === 0) {
    return makeFreshDailyState(userId, today);
  }
  const defs = rehydrateDefs(w);
  if (defs.length !== w.quests.length) return makeFreshDailyState(userId, today);
  return { date: w.date, quests: w.quests, defs };
}

// ============================================================
// Login Streak
// ============================================================

export interface StreakReward {
  day: number;          // streak day this reward unlocks at
  emoji: string;
  label: string;
  energy?: number;
  acorns?: number;
  xp?: number;
}

// 7-day cycle. Day 7 hits big; cycle repeats.
export const STREAK_REWARDS: StreakReward[] = [
  { day: 1, emoji: "💧", label: "+5 Energy",  energy: 5 },
  { day: 2, emoji: "🌰", label: "+8 Acorns",  acorns: 8 },
  { day: 3, emoji: "🌰", label: "+15 Acorns", acorns: 15 },
  { day: 4, emoji: "💧", label: "+10 Energy + 10 Acorns", energy: 10, acorns: 10 },
  { day: 5, emoji: "⭐", label: "+50 XP",     xp: 50 },
  { day: 6, emoji: "🌰", label: "+25 Acorns", acorns: 25 },
  { day: 7, emoji: "🎁", label: "Jackpot: +50 Acorns + 100 XP + 10 Energy", acorns: 50, xp: 100, energy: 10 },
];

export interface StreakState {
  current: number;        // current streak length (after today's claim, or before if not claimed yet today)
  best: number;
  lastClaim: string | null; // YYYY-MM-DD or null
}

export interface StreakClaimResult {
  state: StreakState;
  reward: StreakReward;
  isNewRecord: boolean;
}

// Computes what would happen if user claims today.
// Rules: gap of 0 days from lastClaim → already claimed today (no-op).
// gap of 1 → streak += 1.
// gap of 2 or more → streak resets to 1 (today counts as fresh start).
// null lastClaim → streak = 1.
export function canClaimToday(s: StreakState): boolean {
  return s.lastClaim !== todayKey();
}

export function previewNextStreak(s: StreakState): number {
  if (!canClaimToday(s)) return s.current;
  if (!s.lastClaim) return 1;
  const gap = daysBetween(s.lastClaim, todayKey());
  if (gap === 1) return s.current + 1;
  return 1; // gap >= 2 OR weird
}

export function rewardForStreak(streak: number): StreakReward {
  // Cycle every 7 days
  const idx = ((streak - 1) % STREAK_REWARDS.length + STREAK_REWARDS.length) % STREAK_REWARDS.length;
  return STREAK_REWARDS[idx];
}

export function claimStreak(s: StreakState): StreakClaimResult {
  const next = previewNextStreak(s);
  const reward = rewardForStreak(next);
  const best = Math.max(s.best, next);
  return {
    state: { current: next, best, lastClaim: todayKey() },
    reward,
    isNewRecord: next > s.best,
  };
}