import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { TREES, type TreeKind } from "@/lib/game";
import {
  WILD_GRID_SIZE, WILD_TILES, WILD_PLANT_ENERGY, WILD_UPROOT_ENERGY,
  WILD_GROWTH_MS, WILD_OWNER_HARVEST, WILD_VISITOR_HARVEST,
  wildStage, type WildTile,
} from "@/lib/social";

export const Route = createFileRoute("/wild")({
  head: () => ({
    meta: [
      { title: "Wild Garden — Forest Guardian" },
      { name: "description", content: "Shared 20×20 garden where guardians plant trees on each other's tiles." },
    ],
  }),
  component: WildPage,
});

const ALLOWED_KINDS: TreeKind[] = ["oak", "pine", "sakura", "bamboo"];

function WildPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [optIn, setOptIn] = useState(false);
  const [energy, setEnergy] = useState(0);
  const [tiles, setTiles] = useState<Record<number, WildTile>>({});
  const [now, setNow] = useState(() => Date.now());
  const [selectedKind, setSelectedKind] = useState<TreeKind>("oak");
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1500);
    return () => clearInterval(id);
  }, []);

  const loadAll = useCallback(async () => {
    if (!user) return;
    const [{ data: prof }, { data: forest }, { data: wild }] = await Promise.all([
      supabase.from("profiles").select("wild_garden_optin").eq("id", user.id).maybeSingle(),
      supabase.from("forest_states").select("energy").eq("user_id", user.id).maybeSingle(),
      supabase.from("wild_garden").select("*"),
    ]);
    setOptIn(Boolean(prof?.wild_garden_optin));
    setEnergy(forest?.energy ?? 0);
    const map: Record<number, WildTile> = {};
    for (const t of (wild ?? []) as WildTile[]) map[t.tile_index] = t;
    setTiles(map);
    setHydrated(true);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadAll();
    const ch = supabase
      .channel("wild-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "wild_garden" }, (payload) => {
        setTiles(prev => {
          const next = { ...prev };
          if (payload.eventType === "DELETE") {
            const old = payload.old as WildTile;
            delete next[old.tile_index];
          } else {
            const row = payload.new as WildTile;
            next[row.tile_index] = row;
          }
          return next;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadAll]);

  const toggleOptIn = async () => {
    if (!user) return;
    const next = !optIn;
    const { error } = await supabase.from("profiles").update({ wild_garden_optin: next }).eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    setOptIn(next);
    toast.success(next ? "Kamu masuk Wild Garden 🌿" : "Keluar dari Wild Garden");
  };

  const spendEnergy = async (amount: number): Promise<boolean> => {
    if (!user) return false;
    if (energy < amount) { toast.error(`Butuh ${amount} 💧 energy`); return false; }
    const next = energy - amount;
    const { error } = await supabase.from("forest_states").update({ energy: next }).eq("user_id", user.id);
    if (error) { toast.error(error.message); return false; }
    setEnergy(next);
    return true;
  };

  const grantOxygen = async (amount: number) => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("oxygen, trees_saved").eq("id", user.id).maybeSingle();
    if (!data) return;
    await supabase.from("profiles").update({
      oxygen: (data.oxygen ?? 0) + amount,
      trees_saved: (data.trees_saved ?? 0) + 1,
    }).eq("id", user.id);
  };

  const handleClick = async (idx: number) => {
    if (!user || busy) return;
    if (!optIn) { toast.info("Aktifkan Wild Garden dulu di tombol di atas"); return; }
    const tile = tiles[idx];
    setBusy(true);
    try {
      if (!tile) {
        // plant
        if (!await spendEnergy(WILD_PLANT_ENERGY)) return;
        const { error } = await supabase.from("wild_garden").insert({
          tile_index: idx,
          planter_id: user.id,
          kind: selectedKind,
          growth_ms: WILD_GROWTH_MS,
        });
        if (error) {
          if (error.code === "23505") toast.info("Sudah ditanam orang lain barusan");
          else toast.error(error.message);
          // refund
          await supabase.from("forest_states").update({ energy }).eq("user_id", user.id);
          setEnergy(e => e + WILD_PLANT_ENERGY);
        } else {
          toast.success(`🌱 Menanam ${TREES[selectedKind].label} di tile #${idx}`);
        }
        return;
      }
      // tile occupied
      const stage = wildStage(tile.planted_at, tile.growth_ms, now);
      const isOwner = tile.planter_id === user.id;
      if (stage === "mature") {
        // harvest
        const yieldO2 = isOwner ? WILD_OWNER_HARVEST : WILD_VISITOR_HARVEST;
        const { error } = await supabase.from("wild_garden").delete().eq("tile_index", idx);
        if (error) { toast.error(error.message); return; }
        await grantOxygen(yieldO2);
        toast.success(`💨 +${yieldO2} O₂ dari panen ${isOwner ? "milik sendiri" : "milik orang lain (50%)"}!`);
      } else {
        // uproot (works on own or others). Cost energy unless own.
        if (!isOwner) {
          if (!await spendEnergy(WILD_UPROOT_ENERGY)) return;
        }
        const { error } = await supabase.from("wild_garden").delete().eq("tile_index", idx);
        if (error) { toast.error(error.message); return; }
        toast.success(isOwner ? "🪓 Tanaman dicabut" : `🪓 Tanaman lawan dicabut (-${WILD_UPROOT_ENERGY}💧)`);
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  const myCount = Object.values(tiles).filter(t => t.planter_id === user.id).length;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">🌍 Wild Garden</h1>
            <p className="text-xs text-muted-foreground">Grid bersama 20×20. Tanam liar di tile siapa pun. Mature → siapa saja boleh panen.</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-md bg-secondary px-3 py-1.5 font-medium">💧 {energy}</span>
            <span className="rounded-md bg-secondary px-3 py-1.5 font-medium">🌱 milikmu: {myCount}</span>
            <button
              onClick={toggleOptIn}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${optIn ? "bg-primary text-primary-foreground" : "border border-border"}`}
            >
              {optIn ? "✓ Wild Garden ON" : "Aktifkan Wild Garden"}
            </button>
          </div>
        </div>

        {optIn && (
          <div className="mb-3 flex flex-wrap gap-2">
            {ALLOWED_KINDS.map(k => (
              <button
                key={k}
                onClick={() => setSelectedKind(k)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${selectedKind === k ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}
              >
                {TREES[k].emoji.mature} {TREES[k].label}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground self-center">
              Tanam {WILD_PLANT_ENERGY}💧 · Cabut milik orang {WILD_UPROOT_ENERGY}💧 · Panen mature: pemilik +{WILD_OWNER_HARVEST}, lainnya +{WILD_VISITOR_HARVEST}
            </span>
          </div>
        )}

        {!hydrated ? (
          <div className="text-center text-sm text-muted-foreground py-10">Loading map…</div>
        ) : (
          <div
            className="mx-auto grid gap-0.5 rounded-2xl border border-border bg-card p-2"
            style={{ gridTemplateColumns: `repeat(${WILD_GRID_SIZE}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: WILD_TILES }).map((_, i) => {
              const t = tiles[i];
              const isMine = t?.planter_id === user.id;
              let emoji = "·";
              let stageClass = "";
              if (t) {
                const stage = wildStage(t.planted_at, t.growth_ms, now);
                emoji = TREES[t.kind as TreeKind]?.emoji[stage] ?? "🌱";
                if (stage === "mature") stageClass = "ring-2 ring-amber-500/70 animate-pulse";
              }
              return (
                <button
                  key={i}
                  onClick={() => handleClick(i)}
                  disabled={busy || !optIn}
                  className={`aspect-square grid place-items-center rounded text-sm transition-colors ${
                    isMine ? "bg-emerald-700/20" : t ? "bg-amber-700/15" : "bg-secondary/40 hover:bg-secondary/70"
                  } ${stageClass} disabled:cursor-not-allowed disabled:opacity-70`}
                  title={t ? `${TREES[t.kind as TreeKind]?.label ?? t.kind} · ${isMine ? "milikmu" : "lawan"}` : `tile #${i} (kosong)`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-3 text-center text-xs text-muted-foreground">
          ⚠️ Wild Garden adalah PvP ringan. Aktifkan/Nonaktifkan kapan saja.
        </p>
      </div>
    </main>
  );
}
