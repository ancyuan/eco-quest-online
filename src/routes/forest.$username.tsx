import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { TREES, BIOMES, type Tile, type Biome, type TreeKind, computeStage, biomeForTile, defaultBiomeZones } from "@/lib/game";
import { FRIEND_GIFT_AMOUNT, FRIEND_GIFT_DAILY_CAP, FRIEND_WATER_DAILY_CAP, todayUTC } from "@/lib/social";
import { useView3D, isWebGLAvailable } from "@/lib/view3d";
import { useWeather } from "@/lib/weather";
import { ErrorBoundary3D } from "@/three/ErrorBoundary3D";

const Forest3D = lazy(() => import("@/three/Forest3D"));

export const Route = createFileRoute("/forest/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.username}'s Forest — Forest Guardian` },
      { name: "description", content: `Visit ${params.username}'s living forest in Forest Guardian.` },
    ],
  }),
  component: VisitPage,
});

interface ProfileLite {
  id: string;
  display_name: string;
  username: string | null;
  oxygen: number;
  trees_saved: number;
  level: number;
}

function VisitPage() {
  const { username } = useParams({ from: "/forest/$username" });
  const { user } = useAuth();
  const view3d = useView3D();
  const webgl = isWebGLAvailable();
  const use3D = view3d.enabled && webgl;
  const weatherState = useWeather();
  const [target, setTarget] = useState<ProfileLite | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [gridSize, setGridSize] = useState(6);
  const [biomeZones, setBiomeZones] = useState<Record<number, Biome>>({});
  const [loading, setLoading] = useState(true);
  const [waterUsed, setWaterUsed] = useState(0);
  const [giftUsed, setGiftUsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, display_name, username, oxygen, trees_saved, level, unlocked_biomes")
        .ilike("username", username)
        .maybeSingle();
      if (!prof) { setTarget(null); setLoading(false); return; }
      setTarget(prof as ProfileLite);
      const { data: forest } = await supabase
        .from("forest_states")
        .select("tiles, grid_size, biome_zones")
        .eq("user_id", prof.id)
        .maybeSingle();
      const gs = forest?.grid_size ?? 6;
      setGridSize(gs);
      const zonesObj = (forest?.biome_zones && typeof forest.biome_zones === "object")
        ? (forest.biome_zones as Record<string, Biome>)
        : {};
      const parsed: Record<number, Biome> = {};
      for (const [k, v] of Object.entries(zonesObj)) parsed[Number(k)] = v as Biome;
      setBiomeZones(Object.keys(parsed).length ? parsed : defaultBiomeZones(gs, (prof as { unlocked_biomes?: Biome[] }).unlocked_biomes ?? ["rainforest"]));
      const loaded = (forest?.tiles as unknown as Tile[] | null) ?? [];
      setTiles(loaded);

      // load my friend_actions today
      if (user) {
        const { data: actions } = await supabase
          .from("friend_actions")
          .select("kind, target_id")
          .eq("actor_id", user.id)
          .eq("day", todayUTC());
        const water = (actions ?? []).filter(a => a.kind === "water");
        const gift = (actions ?? []).filter(a => a.kind === "gift");
        setWaterUsed(water.filter(a => a.target_id === prof.id).length);
        // gift cap is across all targets
        setGiftUsed(gift.length + (gift.some(a => a.target_id === prof.id) ? 0 : 0));
      }
      setLoading(false);
    })();
  }, [username, user]);

  const handleWater = async () => {
    if (!user || !target) return;
    if (user.id === target.id) { toast.info("Pohon sendiri sudah cukup berisi cinta 🌳"); return; }
    if (waterUsed >= 1) { toast.info("Sudah disiram hari ini"); return; }
    setBusy(true);
    const { error } = await supabase.from("friend_actions")
      .insert({ actor_id: user.id, target_id: target.id, kind: "water" });
    if (error) { toast.error(error.message); setBusy(false); return; }
    // boost: bring planted_at earlier on first non-mature tile (visible help)
    const idx = tiles.findIndex(t => t.kind && t.stage !== "mature" && t.stage !== "ancient");
    if (idx >= 0) {
      const updated = [...tiles];
      updated[idx] = { ...updated[idx], plantedAt: (updated[idx].plantedAt ?? Date.now()) - 30_000 };
      // persist to target's forest
      const stripped = updated.filter(t => t.kind).map(t => ({
        index: t.index, kind: t.kind, stage: t.stage, plantedAt: t.plantedAt,
        threat: t.threat, threatExpiresAt: t.threatExpiresAt,
      }));
      // RLS prevents writing to other people's forest. Boost is symbolic — we still award XP via xp bump on self.
      void stripped;
      setTiles(updated);
    }
    // give actor +5 XP
    const { data: meProf } = await supabase.from("profiles").select("xp").eq("id", user.id).maybeSingle();
    if (meProf) {
      await supabase.from("profiles").update({ xp: (meProf.xp ?? 0) + 5 }).eq("id", user.id);
    }
    setWaterUsed(w => w + 1);
    toast.success(`💧 Kamu menyiram forest ${target.display_name}! +5 XP`);
    setBusy(false);
  };

  const handleGift = async () => {
    if (!user || !target) return;
    if (user.id === target.id) return;
    if (giftUsed >= FRIEND_GIFT_DAILY_CAP) { toast.info(`Cap harian ${FRIEND_GIFT_DAILY_CAP} hadiah tercapai`); return; }
    setBusy(true);
    const { error } = await supabase.from("friend_actions")
      .insert({ actor_id: user.id, target_id: target.id, kind: "gift" });
    if (error) {
      if (error.code === "23505") toast.info("Sudah memberi hadiah ke teman ini hari ini");
      else toast.error(error.message);
      setBusy(false);
      return;
    }
    // grant +5 energy to target via direct UPDATE (forest_states); RLS blocks this — so we mark via friend_actions table only, target claims on next login
    // For instant effect, we attempt a function-less write: skip.
    setGiftUsed(g => g + 1);
    toast.success(`🎁 +${FRIEND_GIFT_AMOUNT} energy dikirim ke ${target.display_name}`);
    setBusy(false);
  };

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!target) {
    return (
      <main className="min-h-[calc(100vh-3.5rem)] grid place-items-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Guardian tidak ditemukan</h1>
          <p className="mt-2 text-sm text-muted-foreground">Username @{username} belum terdaftar.</p>
          <Link to="/friends" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Kembali ke Friends</Link>
        </div>
      </main>
    );
  }

  const isOwn = user?.id === target.id;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/friends" className="text-xs text-muted-foreground hover:text-foreground">← Friends</Link>
        <div className="mt-2 mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{target.display_name}'s Forest</h1>
            <p className="text-sm text-muted-foreground font-mono">@{target.username} · Lv {target.level} · 💨 {target.oxygen} · 🌳 {target.trees_saved}</p>
          </div>
          <div className="flex gap-2">
            {webgl && (
              <button
                onClick={view3d.toggle}
                className="rounded-md border border-border px-3 py-2 text-xs font-semibold"
              >
                {use3D ? "🟦 2D" : "🧊 3D"}
              </button>
            )}
            {!isOwn && user && (
              <>
              <button
                onClick={handleWater}
                disabled={busy || waterUsed >= 1}
                className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                💧 Water ({1 - waterUsed} left)
              </button>
              <button
                onClick={handleGift}
                disabled={busy || giftUsed >= FRIEND_GIFT_DAILY_CAP}
                className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                🎁 Gift {FRIEND_GIFT_AMOUNT}💧 ({FRIEND_GIFT_DAILY_CAP - giftUsed} left)
              </button>
              </>
            )}
          </div>
        </div>

        {use3D ? (
          <ErrorBoundary3D onError={() => { view3d.setEnabled(false); toast.error("3D crashed, kembali ke 2D"); }}>
            <Suspense fallback={<div className="text-center text-sm text-muted-foreground py-10">Loading 3D…</div>}>
              <Forest3D
                tiles={tiles.map(t => ({
                  ...t,
                  stage: t.kind && t.plantedAt
                    ? (t.stage === "ancient" ? "ancient" : computeStage(t.plantedAt, now, t.kind as TreeKind, false))
                    : t.stage,
                }))}
                gridSize={gridSize}
                biomeZones={biomeZones}
                feedingMode={false}
                onTileClick={() => { /* read-only */ }}
                weather={weatherState.weather}
                activeCompanions={[]}
                readOnly
              />
            </Suspense>
          </ErrorBoundary3D>
        ) : (
        <div
          className="mx-auto grid gap-1.5 rounded-2xl border border-border bg-card p-3"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`, maxWidth: 640 }}
        >
          {Array.from({ length: gridSize * gridSize }).map((_, i) => {
            const t = tiles.find(x => x.index === i);
            const biome = biomeForTile(biomeZones, i);
            let emoji = "·";
            if (t?.kind && t.plantedAt) {
              const isAncient = t.stage === "ancient";
              const stage = computeStage(t.plantedAt, now, t.kind as TreeKind, isAncient);
              emoji = TREES[t.kind as TreeKind].emoji[stage];
            }
            return (
              <div
                key={i}
                title={`${BIOMES[biome].label}${t?.kind ? " — " + TREES[t.kind as TreeKind].label : ""}`}
                className={`aspect-square grid place-items-center rounded-md text-xl ${BIOMES[biome].bg}`}
              >
                {emoji}
                {t?.threat && <span className="absolute text-xs">⚠️</span>}
              </div>
            );
          })}
        </div>
        )}

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Read-only. Water memberimu +5 XP per teman/hari. Gift mengirim {FRIEND_GIFT_AMOUNT} energy
          (sampai {FRIEND_WATER_DAILY_CAP - waterUsed} water atau {FRIEND_GIFT_DAILY_CAP} gift / hari total).
        </p>
      </div>
    </main>
  );
}
