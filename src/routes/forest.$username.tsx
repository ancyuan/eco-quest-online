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
  const [signs, setSigns] = useState<{ id: string; emoji: string; sender_id: string; created_at: string }[]>([]);
  const [visitorsToday, setVisitorsToday] = useState(0);
  const [defendUsedHere, setDefendUsedHere] = useState(0);
  const [signedHere, setSignedHere] = useState(false);
  const [showSignPicker, setShowSignPicker] = useState(false);

  const SIGN_EMOJIS = ["🌸","🍂","⭐","💚","🌟","🍃","🌻","🌈"] as const;

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

        // active signs on this host
        const { data: signRows } = await supabase
          .from("forest_signs")
          .select("id, emoji, sender_id, created_at")
          .eq("host_id", prof.id)
          .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
          .order("created_at", { ascending: false });
        setSigns(signRows ?? []);
        setSignedHere((signRows ?? []).some(s => s.sender_id === user.id));

        // visitor stats today
        const today = todayUTC();
        const { data: vlogHost } = await supabase
          .from("visit_log")
          .select("visitor_id")
          .eq("host_id", prof.id)
          .eq("day", today);
        setVisitorsToday(new Set((vlogHost ?? []).map(v => v.visitor_id)).size);
        const { data: vlogMine } = await supabase
          .from("visit_log")
          .select("defend_count")
          .eq("visitor_id", user.id)
          .eq("host_id", prof.id)
          .eq("day", today)
          .maybeSingle();
        setDefendUsedHere(vlogMine?.defend_count ?? 0);
      }
      setLoading(false);
    })();
  }, [username, user]);

  const handleWater = async () => {
    if (!user || !target) return;
    if (user.id === target.id) { toast.info("Pohon sendiri sudah cukup berisi cinta 🌳"); return; }
    if (waterUsed >= 1) { toast.info("Sudah disiram hari ini"); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("water_friend_tree_boost", { _host_id: target.id });
    if (error) { toast.error(error.message); setBusy(false); return; }
    const res = data as { ok: boolean; error?: string; tile_boosted?: number };
    if (!res?.ok) { toast.info(res?.error ?? "Gagal"); setBusy(false); return; }
    if (typeof res.tile_boosted === "number") {
      setTiles(prev => prev.map(t =>
        t.index === res.tile_boosted ? { ...t, plantedAt: (t.plantedAt ?? Date.now()) - 30_000 } : t
      ));
    }
    setWaterUsed(w => w + 1);
    toast.success(`💧 Pohon ${target.display_name} tumbuh lebih cepat! +5 XP`);
    setBusy(false);
  };

  const handleDefend = async (tileIndex: number) => {
    if (!user || !target || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("defend_friend_threat", {
      _host_id: target.id, _tile_index: tileIndex,
    });
    if (error) { toast.error(error.message); setBusy(false); return; }
    const res = data as { ok: boolean; error?: string; xp?: number; acorns?: number };
    if (!res?.ok) { toast.info(res?.error ?? "Gagal"); setBusy(false); return; }
    setTiles(prev => prev.map(t =>
      t.index === tileIndex ? { ...t, threat: undefined, threatExpiresAt: undefined } : t
    ));
    setDefendUsedHere(c => c + 1);
    toast.success(`🛡️ Ancaman dipadamkan! +${res.xp ?? 10} XP, +${res.acorns ?? 1}🌰`);
    setBusy(false);
  };

  const handleLeaveSign = async (emoji: string) => {
    if (!user || !target || busy) return;
    setBusy(true);
    setShowSignPicker(false);
    const { data, error } = await supabase.rpc("leave_forest_sign", { _host_id: target.id, _emoji: emoji });
    if (error) { toast.error(error.message); setBusy(false); return; }
    const res = data as { ok: boolean; error?: string };
    if (!res?.ok) { toast.info(res?.error ?? "Gagal"); setBusy(false); return; }
    setSignedHere(true);
    setSigns(prev => [{ id: crypto.randomUUID(), emoji, sender_id: user.id, created_at: new Date().toISOString() }, ...prev]);
    toast.success(`${emoji} ditinggalkan di hutan ${target.display_name}`);
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
  const defendCapHere = 3;
  const remainingDefend = Math.max(0, defendCapHere - defendUsedHere);

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
              <button
                onClick={() => setShowSignPicker(s => !s)}
                disabled={busy || signedHere}
                className="rounded-lg bg-pink-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                title={signedHere ? "Sudah meninggalkan tanda hari ini" : "Tinggalkan emoji 24 jam"}
              >
                🌸 Sign
              </button>
              </>
            )}
          </div>
        </div>

        {showSignPicker && !isOwn && (
          <div className="mb-3 flex flex-wrap gap-2 rounded-lg border border-border bg-card p-3">
            {SIGN_EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => handleLeaveSign(e)}
                disabled={busy}
                className="rounded-md bg-secondary px-3 py-2 text-lg hover:bg-secondary/70 disabled:opacity-50"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {(signs.length > 0 || visitorsToday > 0) && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-2 text-xs">
            {visitorsToday > 0 && (
              <span className="text-muted-foreground">👥 {visitorsToday} pengunjung hari ini</span>
            )}
            {signs.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-muted-foreground">Signs:</span>
                {signs.slice(0, 12).map(s => (
                  <span key={s.id} className="text-base" title={new Date(s.created_at).toLocaleString()}>{s.emoji}</span>
                ))}
              </span>
            )}
            {!isOwn && (
              <span className="ml-auto text-muted-foreground">🛡️ Defend: {remainingDefend}/{defendCapHere} sisa</span>
            )}
          </div>
        )}

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
            const canDefend = !isOwn && !!user && !!t?.threat && remainingDefend > 0;
            return (
              <button
                key={i}
                type="button"
                onClick={() => canDefend && handleDefend(i)}
                disabled={!canDefend || busy}
                title={`${BIOMES[biome].label}${t?.kind ? " — " + TREES[t.kind as TreeKind].label : ""}`}
                className={`relative aspect-square grid place-items-center rounded-md text-xl ${BIOMES[biome].bg} ${canDefend ? "ring-2 ring-orange-500 hover:ring-4 cursor-pointer animate-pulse" : "cursor-default"} disabled:cursor-default`}
              >
                {emoji}
                {t?.threat && <span className="absolute -top-1 -right-1 text-xs">⚠️</span>}
              </button>
            );
          })}
        </div>
        )}

        <p className="mt-3 text-center text-xs text-muted-foreground">
          💧 Water mempercepat pertumbuhan pohon teman (+5 XP, 1×/teman/hari).
          🛡️ Klik tile dengan ⚠️ untuk membantu memadamkan ancaman (5×/hari, max 3/teman, +10 XP +1🌰).
          🌸 Sign meninggalkan emoji 24 jam (1×/teman/hari). Cap gift: {FRIEND_GIFT_DAILY_CAP}/hari.
        </p>
      </div>
    </main>
  );
}
