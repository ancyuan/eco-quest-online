import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { disconnectWallet } from "@/lib/wallet";
import { usePreferences } from "@/lib/preferences";
import { TREES } from "@/lib/game";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Forest Guardian" },
      { name: "description", content: "Your guardian profile and stats." },
    ],
  }),
  component: ProfilePage,
});

interface Profile {
  display_name: string;
  oxygen: number;
  trees_saved: number;
  xp?: number;
  level?: number;
  skill_points?: number;
}

interface Memorial {
  id: string;
  name: string;
  kind: string;
  birth_at: string;
  died_at: string;
  cause: string;
  threats_survived: number;
  o2_produced: number;
}

function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { prefs, update: updatePrefs } = usePreferences();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [memorials, setMemorials] = useState<Memorial[]>([]);

  const walletAddress = (user?.user_metadata?.wallet_address as string | undefined) ?? null;
  const isWalletUser = !!walletAddress;

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, oxygen, trees_saved, xp, level, skill_points")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data as Profile);
          setName(data.display_name);
        }
      });
    supabase
      .from("tree_memorials")
      .select("id, name, kind, birth_at, died_at, cause, threats_survived, o2_produced")
      .eq("user_id", user.id)
      .order("died_at", { ascending: false })
      .limit(10)
      .then(({ data }) => { if (data) setMemorials(data as Memorial[]); });
  }, [user]);

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Name updated");
  };

  if (loading || !user) {
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  }

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectWallet();
      await signOut();
      toast.success("Wallet disconnected. You can pick another account next time.");
      navigate({ to: "/" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to disconnect";
      toast.error(msg);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleReset = async () => {
    if (!user) return;
    if (!confirm("Reset your forest? Tiles and energy go back to start. Oxygen & trees-saved are kept.")) return;
    setResetting(true);
    const { error } = await supabase
      .from("forest_states")
      .update({ energy: 10, tiles: [], last_tick: new Date().toISOString() })
      .eq("user_id", user.id);
    setResetting(false);
    if (error) toast.error(error.message);
    else toast.success("Forest reset. Plant fresh seeds 🌱");
  };

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground">Your Guardian</h1>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-secondary/50 p-4 text-center">
              <div className="text-3xl">💨</div>
              <div className="mt-1 text-2xl font-bold text-foreground">{profile?.oxygen ?? 0}</div>
              <div className="text-xs text-muted-foreground">Oxygen produced</div>
            </div>
            <div className="rounded-xl bg-secondary/50 p-4 text-center">
              <div className="text-3xl">🌳</div>
              <div className="mt-1 text-2xl font-bold text-foreground">{profile?.trees_saved ?? 0}</div>
              <div className="text-xs text-muted-foreground">Trees saved</div>
            </div>
            <div className="rounded-xl bg-secondary/50 p-4 text-center">
              <div className="text-3xl">⭐</div>
              <div className="mt-1 text-2xl font-bold text-foreground">Lv {profile?.level ?? 1}</div>
              <div className="text-xs text-muted-foreground">{profile?.xp ?? 0} XP</div>
            </div>
            <div className="rounded-xl bg-secondary/50 p-4 text-center">
              <div className="text-3xl">🌟</div>
              <div className="mt-1 text-2xl font-bold text-foreground">{profile?.skill_points ?? 0}</div>
              <div className="text-xs text-muted-foreground">Skill points</div>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-foreground">Display name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="mt-3 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          {/* Preferences */}
          <div className="mt-6 space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">Preferences</h3>
            <PrefRow
              label="🌙 Dark mode"
              hint="Calmer palette for night sessions"
              checked={prefs.dark_mode}
              onChange={(v) => updatePrefs({ dark_mode: v })}
            />
            <PrefRow
              label="🌾 Auto-harvest"
              hint="Mature trees auto-harvest every minute (half oxygen yield)"
              checked={prefs.auto_harvest}
              onChange={(v) => updatePrefs({ auto_harvest: v })}
            />
            <PrefRow
              label="🔔 Browser notifications"
              hint="Alert when threats appear and the tab is hidden"
              checked={prefs.notifications_enabled}
              onChange={(v) => updatePrefs({ notifications_enabled: v })}
            />
            <PrefRow
              label="🔇 Mute all audio"
              hint="Silence ambient + sound effects"
              checked={prefs.audio_muted}
              onChange={(v) => updatePrefs({ audio_muted: v })}
            />
            <SliderRow
              label="🎵 Music volume"
              value={prefs.audio_music}
              onChange={(v) => updatePrefs({ audio_music: v })}
            />
            <SliderRow
              label="🔊 Sound effects"
              value={prefs.audio_sfx}
              onChange={(v) => updatePrefs({ audio_sfx: v })}
            />
            <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
              <div className="text-sm font-medium text-foreground">🌐 Language</div>
              <div className="text-xs text-muted-foreground">For daily haiku & weekly recap</div>
              <div className="mt-2 flex gap-2">
                {(["id","en"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => updatePrefs({ language: l })}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      prefs.language === l
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {l === "id" ? "Bahasa Indonesia" : "English"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <button
              onClick={handleReset}
              disabled={resetting}
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60"
            >
              {resetting ? "Resetting…" : "🔁 Reset forest"}
            </button>
          </div>

          {memorials.length > 0 && (
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">🪦 Memorial</h3>
              <ul className="space-y-2">
                {memorials.map((m) => {
                  const def = TREES[m.kind as keyof typeof TREES];
                  const lifespan = new Date(m.died_at).getTime() - new Date(m.birth_at).getTime();
                  const days = Math.max(0, Math.floor(lifespan / 86_400_000));
                  const hours = Math.floor((lifespan % 86_400_000) / 3_600_000);
                  return (
                    <li key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2">
                      <div className="text-2xl">{def?.emoji.mature ?? "🌳"}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">{m.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {def?.label ?? m.kind} · {days}h {hours}j · selamat {m.threats_survived}× · {m.o2_produced} O₂
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="mt-6 border-t border-border pt-4">
            {isWalletUser ? (
              <p className="font-mono text-xs text-muted-foreground">
                🔗 {walletAddress!.slice(0, 6)}…{walletAddress!.slice(-4)} · CORE
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            )}
            {isWalletUser ? (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="mt-3 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
              >
                {disconnecting ? "Disconnecting…" : "Disconnect Wallet"}
              </button>
            ) : (
              <button
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
                className="mt-3 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function PrefRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2 transition-colors hover:bg-secondary/60">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs tabular-nums text-muted-foreground">{value}%</div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="mt-1 w-full accent-[var(--color-primary)]"
      />
    </div>
  );
}