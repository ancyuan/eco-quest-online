import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  PLANT_COST, FEED_COST, ENERGY_MAX, ENERGY_REGEN_MS,
  THREAT_WINDOW_MS, THREAT_SPAWN_PROB, TICK_MS,
  AUTO_HARVEST_MS, OFFLINE_MAX_MS, ANCIENT_FEEDS_REQUIRED,
  TREES, THREATS, BIOMES, ALL_TREE_KINDS,
  computeStage, randomFact, randomThreat,
  defaultBiomeZones, biomeForTile, canPlantInBiome, harvestYield,
  evaluateUnlocks, canFeed, feedProgress, isReadyForAncient,
  type Tile, type TreeKind, type Biome, type FeedLog, type AchievementStats,
  // Phase 3
  computeStageEff, harvestYieldFull, synergyMultiplier,
  effectiveMaxEnergy, effectiveFeedCost, effectiveThreatWindowMs,
  computeLevel, XP_PLANT, XP_HARVEST, XP_HARVEST_ANCIENT, XP_DEFEND, XP_FEED,
  SKILL_TREE, aggregateCompanionEffects, evaluateCompanionUnlocks, bumpTally,
  WEATHERS,
  type SkillRanks, type CompanionId, type HarvestTally,
} from "@/lib/game";
import { usePreferences, ensureNotificationPermission, notify } from "@/lib/preferences";
import { Confetti } from "@/components/Confetti";
import { Tutorial } from "@/components/Tutorial";
import { Encyclopedia } from "@/components/Encyclopedia";
import { SkillTree } from "@/components/SkillTree";
import { CompanionPicker } from "@/components/CompanionPicker";
import { useWeather } from "@/lib/weather";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play — Forest Guardian" },
      { name: "description", content: "Tend your forest. Plant, grow, and defend trees against threats." },
    ],
  }),
  component: PlayPage,
});

interface ProgressionState {
  unlocked_trees: TreeKind[];
  unlocked_grid_size: number;
  unlocked_biomes: Biome[];
  achievements: string[];
  ancient_count: number;
}

function PlayPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { prefs, update: updatePrefs } = usePreferences();
  const weatherState = useWeather();
  const weather = weatherState.weather;

  const [gridSize, setGridSize] = useState(6);
  const [biomeZones, setBiomeZones] = useState<Record<number, Biome>>({});
  const [feedLog, setFeedLog] = useState<FeedLog>({});
  const [tiles, setTiles] = useState<Tile[]>(() =>
    Array.from({ length: 36 }, (_, i) => ({ index: i }))
  );
  const [energy, setEnergy] = useState(10);
  const [oxygen, setOxygen] = useState(0);
  const [treesSaved, setTreesSaved] = useState(0);
  const [progression, setProgression] = useState<ProgressionState>({
    unlocked_trees: ["oak", "pine", "sakura"],
    unlocked_grid_size: 6,
    unlocked_biomes: ["rainforest"],
    achievements: [],
    ancient_count: 0,
  });
  const [selectedKind, setSelectedKind] = useState<TreeKind>("oak");
  const [fact, setFact] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const lastEnergyTickRef = useRef<number>(Date.now());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoHarvestRef = useRef<number>(Date.now());
  const lastNotifiedRef = useRef<Record<number, number>>({});
  const speciesPlantedRef = useRef<Set<TreeKind>>(new Set());
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [animatingTiles, setAnimatingTiles] = useState<Record<number, "pop" | "harvest" | "ancient">>({});
  const [showTutorial, setShowTutorial] = useState(false);
  const [showEncyclopedia, setShowEncyclopedia] = useState(false);
  const [feedingMode, setFeedingMode] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [showCompanions, setShowCompanions] = useState(false);

  // Phase 3 player progression
  const [xp, setXp] = useState(0);
  const [skillPoints, setSkillPoints] = useState(0);
  const [skills, setSkills] = useState<SkillRanks>({});
  const [unlockedCompanions, setUnlockedCompanions] = useState<CompanionId[]>([]);
  const [activeCompanions, setActiveCompanions] = useState<CompanionId[]>([]);
  const [harvestTally, setHarvestTally] = useState<HarvestTally>({});
  const lastAutoDefendRef = useRef<number>(Date.now());
  const lastLevelRef = useRef<number>(1);

  const levelInfo = useMemo(() => computeLevel(xp), [xp]);
  const maxEnergy = useMemo(() => effectiveMaxEnergy(skills), [skills]);
  const feedCost = useMemo(() => effectiveFeedCost(skills), [skills]);
  const compEff = useMemo(() => aggregateCompanionEffects(activeCompanions), [activeCompanions]);

  // Tutorial gate
  useEffect(() => {
    if (hydrated && !prefs.tutorial_done) setShowTutorial(true);
  }, [hydrated, prefs.tutorial_done]);

  // Auth gate
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  // Load
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: forest }, { data: profile }] = await Promise.all([
        supabase.from("forest_states")
          .select("energy, tiles, last_tick, grid_size, biome_zones, feed_log")
          .eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles")
          .select("oxygen, trees_saved, unlocked_trees, unlocked_grid_size, unlocked_biomes, achievements, xp, skill_points, skills, unlocked_companions, active_companions, harvest_tally")
          .eq("id", user.id).maybeSingle(),
      ]);

      let prog: ProgressionState = {
        unlocked_trees: ["oak", "pine", "sakura"],
        unlocked_grid_size: 6,
        unlocked_biomes: ["rainforest"],
        achievements: [],
        ancient_count: 0,
      };
      if (profile) {
        setOxygen(profile.oxygen);
        setTreesSaved(profile.trees_saved);
        prog = {
          unlocked_trees: (profile.unlocked_trees ?? ["oak", "pine", "sakura"]) as TreeKind[],
          unlocked_grid_size: profile.unlocked_grid_size ?? 6,
          unlocked_biomes: (profile.unlocked_biomes ?? ["rainforest"]) as Biome[],
          achievements: profile.achievements ?? [],
          ancient_count: 0,
        };
        setProgression(prog);
        if (!prog.unlocked_trees.includes(selectedKind)) {
          setSelectedKind(prog.unlocked_trees[0] ?? "oak");
        }
        // Phase 3 fields
        const pAny = profile as Record<string, unknown>;
        setXp(Number(pAny.xp ?? 0));
        setSkillPoints(Number(pAny.skill_points ?? 0));
        setSkills((pAny.skills as SkillRanks) ?? {});
        setUnlockedCompanions(((pAny.unlocked_companions as string[]) ?? []) as CompanionId[]);
        setActiveCompanions(((pAny.active_companions as string[]) ?? []) as CompanionId[]);
        setHarvestTally((pAny.harvest_tally as HarvestTally) ?? {});
        lastLevelRef.current = computeLevel(Number(pAny.xp ?? 0)).level;
      }

      const activeGrid = forest?.grid_size ?? prog.unlocked_grid_size ?? 6;
      setGridSize(activeGrid);

      const zonesObj = (forest?.biome_zones && typeof forest.biome_zones === "object")
        ? (forest.biome_zones as Record<string, Biome>)
        : {};
      const parsedZones: Record<number, Biome> = {};
      for (const [k, v] of Object.entries(zonesObj)) parsedZones[Number(k)] = v as Biome;
      setBiomeZones(
        Object.keys(parsedZones).length > 0
          ? parsedZones
          : defaultBiomeZones(activeGrid, prog.unlocked_biomes)
      );

      const feedObj = (forest?.feed_log && typeof forest.feed_log === "object")
        ? (forest.feed_log as Record<string, number[]>)
        : {};
      const parsedFeed: FeedLog = {};
      for (const [k, v] of Object.entries(feedObj)) parsedFeed[Number(k)] = v;
      setFeedLog(parsedFeed);

      if (forest) {
        const lastTickMs = forest.last_tick ? new Date(forest.last_tick).getTime() : Date.now();
        const now = Date.now();
        const offlineMs = Math.max(0, Math.min(now - lastTickMs, OFFLINE_MAX_MS));
        const energyGained = Math.floor(offlineMs / ENERGY_REGEN_MS);
        setEnergy(Math.min(ENERGY_MAX, forest.energy + energyGained));

        const loaded = (forest.tiles as unknown as Tile[] | null) ?? [];
        const fresh: Tile[] = Array.from({ length: activeGrid * activeGrid }, (_, i) => {
          const found = loaded.find((t) => t.index === i);
          if (!found || !found.kind || !found.plantedAt) return { index: i };
          const threatExpired = found.threat && found.threatExpiresAt && found.threatExpiresAt <= now;
          if (threatExpired) return { index: i };
          const isAncient = found.stage === "ancient";
          return {
            index: i,
            kind: found.kind,
            plantedAt: found.plantedAt,
            stage: computeStage(found.plantedAt, now, found.kind, isAncient),
            threat: found.threat,
            threatExpiresAt: found.threat ? found.threatExpiresAt : undefined,
          };
        });
        setTiles(fresh);

        // count ancients alive (used for achievements as a proxy minimum)
        const ancientsNow = fresh.filter(t => t.stage === "ancient").length;
        prog.ancient_count = Math.max(prog.ancient_count, ancientsNow);
        setProgression({ ...prog });

        // seed speciesPlanted for achievements
        fresh.forEach(t => { if (t.kind) speciesPlantedRef.current.add(t.kind); });

        if (energyGained > 0) {
          toast.success(`Welcome back! +${energyGained} 💧 energy regenerated while away`);
        }
      }
      setHydrated(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Persist
  const persist = useCallback(
    (
      nextTiles: Tile[],
      nextEnergy: number,
      nextOxygen: number,
      nextSaved: number,
      nextGrid: number,
      nextZones: Record<number, Biome>,
      nextFeed: FeedLog,
      nextProg: ProgressionState,
      nextXp: number,
      nextSkillPoints: number,
      nextSkills: SkillRanks,
      nextUnlockedComps: CompanionId[],
      nextActiveComps: CompanionId[],
      nextTally: HarvestTally
    ) => {
      if (!user || !hydrated) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const stripped = nextTiles
          .filter((t) => t.kind)
          .map((t) => ({
            index: t.index,
            kind: t.kind,
            stage: t.stage,
            plantedAt: t.plantedAt,
            threat: t.threat,
            threatExpiresAt: t.threatExpiresAt,
          }));
        await Promise.all([
          supabase.from("forest_states").upsert({
            user_id: user.id,
            energy: nextEnergy,
            tiles: stripped as unknown as never,
            last_tick: new Date().toISOString(),
            grid_size: nextGrid,
            biome_zones: nextZones as unknown as never,
            feed_log: nextFeed as unknown as never,
          }),
          supabase.from("profiles").update({
            oxygen: nextOxygen,
            trees_saved: nextSaved,
            unlocked_trees: nextProg.unlocked_trees,
            unlocked_grid_size: nextProg.unlocked_grid_size,
            unlocked_biomes: nextProg.unlocked_biomes,
            achievements: nextProg.achievements,
            xp: nextXp,
            level: computeLevel(nextXp).level,
            skill_points: nextSkillPoints,
            skills: nextSkills as unknown as never,
            unlocked_companions: nextUnlockedComps,
            active_companions: nextActiveComps,
            harvest_tally: nextTally as unknown as never,
          }).eq("id", user.id),
        ]);
      }, 800);
    },
    [user, hydrated]
  );

  // Re-evaluate unlocks whenever stats change
  useEffect(() => {
    if (!hydrated) return;
    const stats: AchievementStats = {
      oxygen,
      treesSaved,
      ancientCount: progression.ancient_count,
      speciesPlanted: speciesPlantedRef.current,
    };
    const change = evaluateUnlocks(stats, progression);
    if (change.newTrees.length === 0 && change.newBiomes.length === 0 &&
        change.newAchievements.length === 0 && !change.newGridSize) return;

    setProgression(prev => {
      const next: ProgressionState = {
        ...prev,
        unlocked_trees: [...prev.unlocked_trees, ...change.newTrees],
        unlocked_biomes: [...prev.unlocked_biomes, ...change.newBiomes],
        achievements: [...prev.achievements, ...change.newAchievements.map(a => a.id)],
        unlocked_grid_size: change.newGridSize ?? prev.unlocked_grid_size,
      };
      return next;
    });

    change.newAchievements.forEach(a =>
      toast.success(`${a.emoji} Achievement: ${a.label}`, { description: a.description })
    );
    change.newTrees.forEach(k =>
      toast.success(`🌱 New species unlocked: ${TREES[k].label}!`)
    );
    change.newBiomes.forEach(b =>
      toast.success(`${BIOMES[b].emoji} New biome: ${BIOMES[b].label}!`, {
        description: "Reset your forest to apply the new biome layout.",
      })
    );
    if (change.newGridSize) {
      toast.success(`🗺️ Grid expanded to ${change.newGridSize}×${change.newGridSize}!`, {
        description: "Use the Expand button to apply.",
      });
    }
  }, [oxygen, treesSaved, progression.ancient_count, hydrated]); // eslint-disable-line

  // Tick
  useEffect(() => {
    if (!hydrated) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const threatWindow = effectiveThreatWindowMs(skills);
      const threatProb = THREAT_SPAWN_PROB * WEATHERS[weather].threatProbMul * compEff.threatProbMul;
      setTiles((prev) => {
        const next = prev.map((t) => {
          if (!t.kind || !t.plantedAt) return t;
          if (t.threat && t.threatExpiresAt && t.threatExpiresAt <= now) return { index: t.index };
          const isAncient = t.stage === "ancient";
          const biome = biomeForTile(biomeZones, t.index);
          const stage = computeStageEff(t.plantedAt, now, t.kind, biome, weather, skills, activeCompanions, isAncient);
          let updated: Tile = { ...t, stage };
          if ((stage === "mature" || stage === "ancient") && !t.threat && Math.random() < threatProb) {
            const newThreat = randomThreat();
            updated = { ...updated, threat: newThreat, threatExpiresAt: now + threatWindow };
            if (prefs.notifications_enabled && (now - (lastNotifiedRef.current[t.index] ?? 0)) > 30_000) {
              lastNotifiedRef.current[t.index] = now;
              notify("🌳 Forest Guardian", `${THREATS[newThreat].emoji} ${THREATS[newThreat].label} attacking your tree!`);
            }
          }
          return updated;
        });
        return next;
      });

      if (now - lastEnergyTickRef.current >= ENERGY_REGEN_MS) {
        lastEnergyTickRef.current = now;
        setEnergy((e) => Math.min(maxEnergy, e + 1 + compEff.energyTickBonus));
      }

      // Companion auto-defend (Pine Fox + Protector skill stacks)
      const autoDefendInterval = compEff.autoDefendPerMs > 0 ? 1 / compEff.autoDefendPerMs : 0;
      const protectorAuto = (skills["auto_defend"] ?? 0) > 0 ? 60_000 / (skills["auto_defend"] ?? 1) : 0;
      const interval2 = autoDefendInterval && protectorAuto ? Math.min(autoDefendInterval, protectorAuto)
                       : autoDefendInterval || protectorAuto;
      if (interval2 > 0 && now - lastAutoDefendRef.current >= interval2) {
        setTiles(prev => {
          const idx = prev.findIndex(t => t.threat);
          if (idx === -1) return prev;
          lastAutoDefendRef.current = now;
          setTreesSaved(s => s + 1);
          setXp(x => x + XP_DEFEND);
          toast.success("🛡️ Auto-defend triggered");
          return prev.map((t, i) => i === idx ? { ...t, threat: undefined, threatExpiresAt: undefined } : t);
        });
      }

      if (prefs.auto_harvest && now - lastAutoHarvestRef.current >= AUTO_HARVEST_MS) {
        lastAutoHarvestRef.current = now;
        setTiles((prev) => {
          let oxygenGained = 0;
          let energyGained = 0;
          const next = prev.map((t) => {
            if (t.kind && (t.stage === "mature" || t.stage === "ancient") && !t.threat) {
              const biome = biomeForTile(biomeZones, t.index);
              const synergy = synergyMultiplier(prev, gridSize, t.index, t.kind);
              const yld = harvestYieldFull({
                kind: t.kind, biome, isAncient: t.stage === "ancient",
                weather, skills, companions: activeCompanions, synergyMul: synergy,
              });
              oxygenGained += Math.floor(yld / 2);
              energyGained += 1;
              return { index: t.index };
            }
            return t;
          });
          if (oxygenGained > 0) {
            setOxygen((o) => o + oxygenGained);
            setEnergy((e) => Math.min(maxEnergy, e + energyGained));
          }
          return next;
        });
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [hydrated, prefs.auto_harvest, prefs.notifications_enabled, biomeZones, weather, skills, activeCompanions, gridSize, maxEnergy, compEff]);

  // Persist on changes
  useEffect(() => {
    persist(tiles, energy, oxygen, treesSaved, gridSize, biomeZones, feedLog, progression,
            xp, skillPoints, skills, unlockedCompanions, activeCompanions, harvestTally);
  }, [tiles, energy, oxygen, treesSaved, gridSize, biomeZones, feedLog, progression,
      xp, skillPoints, skills, unlockedCompanions, activeCompanions, harvestTally, persist]);

  // Actions
  const handleTileClick = (tile: Tile) => {
    // feeding mode: only mature trees, costs FEED_COST
    if (feedingMode) {
      if (!tile.kind || tile.stage !== "mature") {
        toast.error("Feed only works on mature trees");
        return;
      }
      if (energy < feedCost) { toast.error(`Need ${feedCost} 💧 to feed`); return; }
      if (!canFeed(feedLog, tile.index, Date.now())) {
        toast.error("This tree was fed recently. Wait a bit.");
        return;
      }
      const now = Date.now();
      setEnergy(e => e - feedCost);
      setXp(x => x + XP_FEED);
      setFeedLog(prev => {
        const next = { ...prev, [tile.index]: [...(prev[tile.index] ?? []), now] };
        // promote to ancient if ritual complete
        if (isReadyForAncient(next, tile.index)) {
          setTiles(ts => ts.map(t => t.index === tile.index ? { ...t, stage: "ancient" } : t));
          setProgression(p => ({ ...p, ancient_count: p.ancient_count + 1 }));
          setAnimatingTiles(a => ({ ...a, [tile.index]: "ancient" }));
          setConfettiTrigger(Date.now());
          toast.success("🌳 Ancient Tree awakened!", { description: "Massive O₂ on next harvest!" });
          setTimeout(() => setAnimatingTiles(a => { const { [tile.index]: _, ...r } = a; return r; }), 600);
        } else {
          const p = feedProgress(next, tile.index);
          toast.success(`Fed (${p}/${ANCIENT_FEEDS_REQUIRED})`);
        }
        return next;
      });
      return;
    }

    // 1) defend threat
    if (tile.threat) {
      setTiles(prev => prev.map(t =>
        t.index === tile.index ? { ...t, threat: undefined, threatExpiresAt: undefined } : t
      ));
      setTreesSaved(s => s + 1);
      setXp(x => x + XP_DEFEND);
      toast.success(`Saved your tree from ${THREATS[tile.threat].label.toLowerCase()}!`);
      return;
    }

    // 2) harvest mature/ancient
    if (tile.kind && (tile.stage === "mature" || tile.stage === "ancient")) {
      const biome = biomeForTile(biomeZones, tile.index);
      const isAncient = tile.stage === "ancient";
      const synergy = synergyMultiplier(tiles, gridSize, tile.index, tile.kind);
      const gain = harvestYieldFull({
        kind: tile.kind, biome, isAncient,
        weather, skills, companions: activeCompanions, synergyMul: synergy,
      });
      setOxygen(o => o + gain);
      setEnergy(e => Math.min(maxEnergy, e + (isAncient ? 5 : 2)));
      setXp(x => x + (isAncient ? XP_HARVEST_ANCIENT : XP_HARVEST));
      // tally for companion unlocks
      const harvestedKind = tile.kind;
      setHarvestTally(prev => bumpTally(prev, harvestedKind, 1));
      setAnimatingTiles(a => ({ ...a, [tile.index]: "harvest" }));
      setConfettiTrigger(Date.now());
      setTimeout(() => setAnimatingTiles(a => { const { [tile.index]: _, ...r } = a; return r; }), 400);
      setTiles(prev => prev.map(t => t.index === tile.index ? { index: t.index } : t));
      // clear feed log for that tile
      setFeedLog(prev => { const { [tile.index]: _, ...r } = prev; return r; });
      setFact(randomFact());
      toast.success(`+${gain} 💨 oxygen${isAncient ? " (Ancient!)" : ""} • ${synergy > 1 ? `+${Math.round((synergy-1)*100)}% synergy` : ""}`);
      return;
    }

    // 3) plant on empty
    if (!tile.kind) {
      const biome = biomeForTile(biomeZones, tile.index);
      if (!canPlantInBiome(selectedKind, biome)) {
        toast.error(`${TREES[selectedKind].label} can't grow in ${BIOMES[biome].label}`);
        return;
      }
      if (energy < PLANT_COST) { toast.error("Not enough energy 💧"); return; }
      const now = Date.now();
      setEnergy(e => e - PLANT_COST);
      setXp(x => x + XP_PLANT);
      speciesPlantedRef.current.add(selectedKind);
      setAnimatingTiles(a => ({ ...a, [tile.index]: "pop" }));
      setTimeout(() => setAnimatingTiles(a => { const { [tile.index]: _, ...r } = a; return r; }), 350);
      setTiles(prev => prev.map(t =>
        t.index === tile.index
          ? { index: t.index, kind: selectedKind, plantedAt: now, stage: "seed" }
          : t
      ));
    }
  };

  const handleQuickPlant = () => {
    const empty = tiles.filter(t => !t.kind);
    if (empty.length === 0) return toast.error("Forest is full!");
    if (energy < PLANT_COST) return toast.error("Not enough energy");
    // try to find a tile whose biome accepts the selected kind
    const compatible = empty.filter(t => canPlantInBiome(selectedKind, biomeForTile(biomeZones, t.index)));
    const pool = compatible.length > 0 ? compatible : empty;
    const target = pool[Math.floor(Math.random() * pool.length)];
    const biome = biomeForTile(biomeZones, target.index);
    const kind = canPlantInBiome(selectedKind, biome)
      ? selectedKind
      : (progression.unlocked_trees.find(k => canPlantInBiome(k, biome)) ?? selectedKind);
    setEnergy(e => e - PLANT_COST);
    speciesPlantedRef.current.add(kind);
    const now = Date.now();
    setTiles(prev => prev.map(t =>
      t.index === target.index
        ? { index: t.index, kind, plantedAt: now, stage: "seed" }
        : t
    ));
  };

  const handleExpandGrid = () => {
    if (progression.unlocked_grid_size <= gridSize) {
      toast.error("No bigger grid unlocked yet");
      return;
    }
    const newSize = progression.unlocked_grid_size;
    if (!confirm(`Expand grid to ${newSize}×${newSize}? Existing trees stay in place.`)) return;
    const newCount = newSize * newSize;
    setTiles(prev => {
      const arr: Tile[] = Array.from({ length: newCount }, (_, i) => {
        const old = prev.find(t => t.index === i);
        return old ?? { index: i };
      });
      return arr;
    });
    setGridSize(newSize);
    setBiomeZones(defaultBiomeZones(newSize, progression.unlocked_biomes));
    toast.success(`🗺️ Forest expanded to ${newSize}×${newSize}`);
  };

  const plantableTrees = useMemo(() =>
    ALL_TREE_KINDS.filter(k => progression.unlocked_trees.includes(k)),
    [progression.unlocked_trees]
  );

  if (loading || !user) {
    return <div className="p-10 text-center text-muted-foreground">Loading your forest…</div>;
  }

  const canExpand = progression.unlocked_grid_size > gridSize;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-6">
      <div className="mx-auto max-w-3xl">
        {/* HUD */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <Stat icon="💧" label="Energy" value={`${energy}/${ENERGY_MAX}`} tooltip="Spend on planting & feeding. +1 every 15s." />
          <Stat icon="💨" label="Oxygen" value={oxygen} tooltip="Lifetime score from harvests." />
          <Stat icon="🌳" label="Saved" value={treesSaved} tooltip="Trees defended from threats." />
        </div>

        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-accent transition-all duration-500"
               style={{ width: `${(energy / ENERGY_MAX) * 100}%` }} />
        </div>

        {/* Tree picker */}
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-card)]">
          <span className="px-2 text-xs font-medium text-muted-foreground">Plant:</span>
          {plantableTrees.map(k => {
            const t = TREES[k];
            const active = selectedKind === k;
            return (
              <button
                key={k}
                onClick={() => setSelectedKind(k)}
                className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-all ${
                  active ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                         : "text-muted-foreground hover:bg-secondary"
                }`}
                title={`${t.label} • +${t.oxygen} O₂ • biomes: ${t.biomes.join(", ")}`}
              >
                <span className="text-lg">{t.emoji.mature}</span>
                <span className="text-xs opacity-70">+{t.oxygen}</span>
              </button>
            );
          })}
          {plantableTrees.length < ALL_TREE_KINDS.length && (
            <span className="ml-auto px-2 text-[11px] text-muted-foreground">
              🔒 {ALL_TREE_KINDS.length - plantableTrees.length} locked
            </span>
          )}
        </div>

        {/* Biome legend */}
        <div className="mb-3 flex flex-wrap gap-2">
          {progression.unlocked_biomes.map(b => (
            <span key={b}
              className={`inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs ${BIOMES[b].bg}`}
              title={BIOMES[b].description}>
              {BIOMES[b].emoji} {BIOMES[b].label} <span className="opacity-60">+{BIOMES[b].oxygenBonusPct}%</span>
            </span>
          ))}
        </div>

        {/* Grid */}
        <div
          className="daynight-bg grid gap-1.5 rounded-2xl border border-border p-3 shadow-[var(--shadow-card)]"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
        >
          {tiles.map(tile => {
            const biome = biomeForTile(biomeZones, tile.index);
            return (
              <TileButton
                key={tile.index}
                tile={tile}
                biome={biome}
                feedCount={feedProgress(feedLog, tile.index)}
                feedingMode={feedingMode}
                animation={animatingTiles[tile.index]}
                onClick={() => handleTileClick(tile)}
              />
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={handleQuickPlant} disabled={energy < PLANT_COST}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            🌱 Quick plant ({PLANT_COST} 💧)
          </button>
          <button onClick={() => setFeedingMode(f => !f)}
            className={`rounded-lg border border-border px-3 py-2.5 text-sm font-semibold transition-colors ${
              feedingMode ? "bg-amber-500 text-white" : "bg-card text-foreground hover:bg-secondary"
            }`}
            title={`Feed mature trees ${ANCIENT_FEEDS_REQUIRED}× (${FEED_COST} 💧 each, 20-min cooldown) to evolve into Ancient Tree`}>
            {feedingMode ? "✓ Feeding" : "🍯 Feed"}
          </button>
          {canExpand && (
            <button onClick={handleExpandGrid}
              className="rounded-lg border border-primary bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20">
              🗺️ Expand → {progression.unlocked_grid_size}×{progression.unlocked_grid_size}
            </button>
          )}
          <button onClick={() => setShowEncyclopedia(true)}
            className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-semibold hover:bg-secondary" title="Encyclopedia">
            📚
          </button>
          <Link to="/leaderboard"
            className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-semibold hover:bg-secondary">
            🏆
          </Link>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          {feedingMode
            ? `Feeding mode: tap a mature tree to feed (${FEED_COST} 💧). After ${ANCIENT_FEEDS_REQUIRED} feeds it becomes Ancient!`
            : "Tap empty tile to plant • Tap mature 🌳 to harvest • Tap threats fast to defend"}
        </p>

        {/* Quick toggles */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
          <button onClick={() => updatePrefs({ auto_harvest: !prefs.auto_harvest })}
            className={`rounded-full border border-border px-3 py-1 ${
              prefs.auto_harvest ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            }`}>
            {prefs.auto_harvest ? "✓ Auto-harvest on" : "Auto-harvest off"}
          </button>
          <button onClick={async () => {
              if (!prefs.notifications_enabled) {
                const ok = await ensureNotificationPermission();
                if (!ok) { toast.error("Browser notifications blocked"); return; }
              }
              updatePrefs({ notifications_enabled: !prefs.notifications_enabled });
            }}
            className={`rounded-full border border-border px-3 py-1 ${
              prefs.notifications_enabled ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            }`}>
            {prefs.notifications_enabled ? "🔔 Notifs on" : "🔕 Notifs off"}
          </button>
          <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
            🗺️ {gridSize}×{gridSize}
          </span>
        </div>
      </div>

      {fact && (
        <div className="fixed bottom-6 left-1/2 z-50 w-[min(90%,28rem)] -translate-x-1/2 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] animate-in fade-in slide-in-from-bottom-2"
             onClick={() => setFact(null)}>
          <div className="flex items-start gap-3">
            <div className="text-2xl">🌍</div>
            <div className="flex-1">
              <p className="text-sm">{fact}</p>
              <button onClick={() => setFact(null)} className="mt-1 text-xs font-medium text-primary hover:underline">Got it</button>
            </div>
          </div>
        </div>
      )}

      <Confetti trigger={confettiTrigger} />

      {showTutorial && (
        <Tutorial onDone={() => { setShowTutorial(false); updatePrefs({ tutorial_done: true }); }} />
      )}

      <Encyclopedia open={showEncyclopedia} onOpenChange={setShowEncyclopedia} unlockedTrees={progression.unlocked_trees} />
    </main>
  );
}

function Stat({ icon, label, value, tooltip }: { icon: string; label: string; value: string | number; tooltip?: string }) {
  return (
    <div className="group relative rounded-xl border border-border bg-card px-3 py-2 text-center shadow-[var(--shadow-card)]" title={tooltip}>
      <div className="text-lg">{icon}</div>
      <div className="text-base font-bold tabular-nums text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function TileButton({
  tile, biome, feedCount, feedingMode, onClick, animation,
}: {
  tile: Tile; biome: Biome; feedCount: number; feedingMode: boolean;
  onClick: () => void; animation?: "pop" | "harvest" | "ancient";
}) {
  const empty = !tile.kind;
  const threatened = !!tile.threat;
  const mature = tile.stage === "mature";
  const ancient = tile.stage === "ancient";

  let content: React.ReactNode = null;
  if (tile.kind && tile.stage) {
    const emoji = TREES[tile.kind].emoji[tile.stage];
    const animClass = animation === "pop" ? "tile-pop"
                    : animation === "harvest" ? "tile-harvest"
                    : animation === "ancient" ? "tile-pop" : "";
    const sizeClass = ancient ? "text-3xl sm:text-4xl"
                    : mature ? "text-2xl sm:text-3xl"
                    : "text-xl sm:text-2xl";
    content = (
      <span className={`${sizeClass} inline-block ${animClass} ${ancient ? "drop-shadow-[0_0_6px_rgba(255,200,80,0.7)]" : ""}`}>
        {emoji}
      </span>
    );
  }

  const ringClass = threatened ? "ring-2 ring-destructive animate-pulse"
                  : ancient ? "ring-2 ring-amber-400/70"
                  : (mature ? "ring-2 ring-primary/30" : "");

  return (
    <button
      onClick={onClick}
      className={`group relative aspect-square rounded-lg border border-border/60 transition-all duration-200 active:scale-95 ${BIOMES[biome].bg} ${ringClass} ${
        feedingMode && mature ? "outline outline-2 outline-amber-400/60" : ""
      } hover:bg-background/30`}
      aria-label={empty ? "Empty" : threatened ? "Threat" : "Tree"}
    >
      <div className="flex h-full w-full items-center justify-center">{content}</div>
      {threatened && (
        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs shadow-[var(--shadow-soft)]">
          {THREATS[tile.threat!].emoji}
        </div>
      )}
      {mature && feedCount > 0 && (
        <div className="absolute left-0.5 top-0.5 rounded-full bg-amber-400/90 px-1 text-[9px] font-bold text-amber-950">
          🍯{feedCount}/{ANCIENT_FEEDS_REQUIRED}
        </div>
      )}
      {ancient && (
        <div className="absolute right-0.5 top-0.5 text-[10px]">✨</div>
      )}
      {empty && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg opacity-0 transition-opacity group-hover:opacity-40">+</span>
      )}
    </button>
  );
}
