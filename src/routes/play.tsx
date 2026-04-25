import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  GRID_SIZE,
  PLANT_COST,
  ENERGY_MAX,
  ENERGY_REGEN_MS,
  STAGE_MS,
  THREAT_WINDOW_MS,
  THREAT_SPAWN_PROB,
  TICK_MS,
  TREES,
  THREATS,
  computeStage,
  randomFact,
  randomTreeKind,
  randomThreat,
  type Tile,
  type TreeKind,
} from "@/lib/game";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play — Forest Guardian" },
      { name: "description", content: "Tend your forest. Plant, grow, and defend trees against threats." },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [tiles, setTiles] = useState<Tile[]>(() =>
    Array.from({ length: GRID_SIZE }, (_, i) => ({ index: i }))
  );
  const [energy, setEnergy] = useState(10);
  const [oxygen, setOxygen] = useState(0);
  const [treesSaved, setTreesSaved] = useState(0);
  const [selectedKind, setSelectedKind] = useState<TreeKind>("oak");
  const [fact, setFact] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const lastEnergyTickRef = useRef<number>(Date.now());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ----- Auth gate -----
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  // ----- Load saved state -----
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: forest }, { data: profile }] = await Promise.all([
        supabase.from("forest_states").select("energy, tiles, last_tick").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("oxygen, trees_saved").eq("id", user.id).maybeSingle(),
      ]);
      if (forest) {
        setEnergy(forest.energy);
        const loaded = (forest.tiles as Tile[] | null) ?? [];
        // Re-hydrate tile slots; recompute stages
        const now = Date.now();
        const fresh: Tile[] = Array.from({ length: GRID_SIZE }, (_, i) => {
          const found = loaded.find((t) => t.index === i);
          if (!found || !found.kind || !found.plantedAt) return { index: i };
          // drop expired threats
          const threat = found.threat && found.threatExpiresAt && found.threatExpiresAt > now ? found.threat : undefined;
          return {
            index: i,
            kind: found.kind,
            plantedAt: found.plantedAt,
            stage: computeStage(found.plantedAt, now),
            threat,
            threatExpiresAt: threat ? found.threatExpiresAt : undefined,
          };
        });
        setTiles(fresh);
      }
      if (profile) {
        setOxygen(profile.oxygen);
        setTreesSaved(profile.trees_saved);
      }
      setHydrated(true);
    })();
  }, [user]);

  // ----- Persist (debounced) -----
  const persist = useCallback(
    (nextTiles: Tile[], nextEnergy: number, nextOxygen: number, nextSaved: number) => {
      if (!user || !hydrated) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const stripped = nextTiles
          .filter((t) => t.kind)
          .map((t) => ({
            index: t.index,
            kind: t.kind,
            plantedAt: t.plantedAt,
            threat: t.threat,
            threatExpiresAt: t.threatExpiresAt,
          }));
        await Promise.all([
          supabase
            .from("forest_states")
            .upsert({ user_id: user.id, energy: nextEnergy, tiles: stripped, last_tick: new Date().toISOString() }),
          supabase
            .from("profiles")
            .update({ oxygen: nextOxygen, trees_saved: nextSaved })
            .eq("id", user.id),
        ]);
      }, 800);
    },
    [user, hydrated]
  );

  // ----- Game tick -----
  useEffect(() => {
    if (!hydrated) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setTiles((prev) => {
        const next = prev.map((t) => {
          if (!t.kind || !t.plantedAt) return t;
          // Expired threat -> tree dies
          if (t.threat && t.threatExpiresAt && t.threatExpiresAt <= now) {
            return { index: t.index };
          }
          // Recompute stage
          const stage = computeStage(t.plantedAt, now);
          let updated = { ...t, stage };
          // Random threat spawn on mature trees
          if (stage === "mature" && !t.threat && Math.random() < THREAT_SPAWN_PROB) {
            updated = {
              ...updated,
              threat: randomThreat(),
              threatExpiresAt: now + THREAT_WINDOW_MS,
            };
          }
          return updated;
        });
        return next;
      });

      // Energy regen
      if (now - lastEnergyTickRef.current >= ENERGY_REGEN_MS) {
        lastEnergyTickRef.current = now;
        setEnergy((e) => Math.min(ENERGY_MAX, e + 1));
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [hydrated]);

  // ----- Persist on changes -----
  useEffect(() => {
    persist(tiles, energy, oxygen, treesSaved);
  }, [tiles, energy, oxygen, treesSaved, persist]);

  // ----- Actions -----
  const handleTileClick = (tile: Tile) => {
    // 1) defend threat
    if (tile.threat) {
      setTiles((prev) =>
        prev.map((t) => (t.index === tile.index ? { ...t, threat: undefined, threatExpiresAt: undefined } : t))
      );
      setTreesSaved((s) => s + 1);
      toast.success(`Saved your tree from ${THREATS[tile.threat!].label.toLowerCase()}!`);
      return;
    }
    // 2) harvest mature
    if (tile.kind && tile.stage === "mature") {
      const gain = TREES[tile.kind].oxygen;
      setOxygen((o) => o + gain);
      setEnergy((e) => Math.min(ENERGY_MAX, e + 2));
      setTiles((prev) => prev.map((t) => (t.index === tile.index ? { index: t.index } : t)));
      setFact(randomFact());
      toast.success(`+${gain} 💨 oxygen, +2 💧 energy`);
      return;
    }
    // 3) plant on empty
    if (!tile.kind) {
      if (energy < PLANT_COST) {
        toast.error("Not enough energy. Wait a moment 💧");
        return;
      }
      const now = Date.now();
      setEnergy((e) => e - PLANT_COST);
      setTiles((prev) =>
        prev.map((t) =>
          t.index === tile.index
            ? { index: t.index, kind: selectedKind, plantedAt: now, stage: "seed" }
            : t
        )
      );
    }
  };

  const handleQuickPlant = () => {
    const empty = tiles.filter((t) => !t.kind);
    if (empty.length === 0) return toast.error("Forest is full!");
    if (energy < PLANT_COST) return toast.error("Not enough energy");
    const target = empty[Math.floor(Math.random() * empty.length)];
    setEnergy((e) => e - PLANT_COST);
    const now = Date.now();
    setTiles((prev) =>
      prev.map((t) =>
        t.index === target.index
          ? { index: t.index, kind: randomTreeKind(), plantedAt: now, stage: "seed" }
          : t
      )
    );
  };

  if (loading || !user) {
    return <div className="p-10 text-center text-muted-foreground">Loading your forest…</div>;
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-6">
      <div className="mx-auto max-w-2xl">
        {/* HUD */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <Stat icon="💧" label="Energy" value={`${energy}/${ENERGY_MAX}`} />
          <Stat icon="💨" label="Oxygen" value={oxygen} />
          <Stat icon="🌳" label="Saved" value={treesSaved} />
        </div>

        {/* Energy bar */}
        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${(energy / ENERGY_MAX) * 100}%` }}
          />
        </div>

        {/* Tree picker */}
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-card)]">
          <span className="px-2 text-xs font-medium text-muted-foreground">Plant:</span>
          {(Object.keys(TREES) as TreeKind[]).map((k) => {
            const t = TREES[k];
            const active = selectedKind === k;
            return (
              <button
                key={k}
                onClick={() => setSelectedKind(k)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <span className="text-lg">{t.emoji.mature}</span>
                <span className="hidden sm:inline">{t.label}</span>
                <span className="text-xs opacity-70">+{t.oxygen}</span>
              </button>
            );
          })}
        </div>

        {/* Forest grid */}
        <div
          className="grid gap-1.5 rounded-2xl border border-border p-3 shadow-[var(--shadow-card)]"
          style={{
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            background: "var(--gradient-forest)",
          }}
        >
          {tiles.map((tile) => (
            <TileButton key={tile.index} tile={tile} onClick={() => handleTileClick(tile)} />
          ))}
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleQuickPlant}
            disabled={energy < PLANT_COST}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            🌱 Quick plant ({PLANT_COST} 💧)
          </button>
          <Link
            to="/leaderboard"
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            🏆
          </Link>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Tap empty tile to plant • Tap mature 🌳 to harvest oxygen • Tap threats fast to defend
        </p>
      </div>

      {/* Eco fact toast */}
      {fact && (
        <div
          className="fixed bottom-6 left-1/2 z-50 w-[min(90%,28rem)] -translate-x-1/2 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] animate-in fade-in slide-in-from-bottom-2"
          onClick={() => setFact(null)}
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl">🌍</div>
            <div className="flex-1">
              <p className="text-sm text-foreground">{fact}</p>
              <button
                onClick={() => setFact(null)}
                className="mt-1 text-xs font-medium text-primary hover:underline"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-center shadow-[var(--shadow-card)]">
      <div className="text-lg">{icon}</div>
      <div className="text-base font-bold tabular-nums text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function TileButton({ tile, onClick }: { tile: Tile; onClick: () => void }) {
  const empty = !tile.kind;
  const threatened = !!tile.threat;
  const mature = tile.stage === "mature";

  let content: React.ReactNode = null;
  let bg = "bg-background/40 hover:bg-background/70";

  if (tile.kind && tile.stage) {
    const emoji = TREES[tile.kind].emoji[tile.stage];
    content = <span className={mature ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}>{emoji}</span>;
    bg = "bg-background/70";
  }

  return (
    <button
      onClick={onClick}
      className={`group relative aspect-square rounded-lg border border-border/60 transition-all duration-200 active:scale-95 ${bg} ${
        threatened ? "ring-2 ring-destructive animate-pulse" : ""
      } ${mature && !threatened ? "ring-2 ring-primary/30" : ""}`}
      aria-label={empty ? "Empty tile — tap to plant" : threatened ? "Threat — tap to defend" : "Tree"}
    >
      <div className="flex h-full w-full items-center justify-center">{content}</div>
      {threatened && (
        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs shadow-[var(--shadow-soft)]">
          {THREATS[tile.threat!].emoji}
        </div>
      )}
      {empty && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg opacity-0 transition-opacity group-hover:opacity-40">
          +
        </span>
      )}
    </button>
  );
}