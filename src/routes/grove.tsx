import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PRESET_EMOTES, createGrove, joinGrove, leaveGrove,
  postGroveMessage, ensureWeeklyQuest,
  type Grove, type GrovePost, type GroveQuest, type GroveMember,
} from "@/lib/grove";

export const Route = createFileRoute("/grove")({
  head: () => ({
    meta: [
      { title: "Groves — Forest Guardian" },
      { name: "description", content: "Form a Grove with up to 8 friends and tackle weekly co-op quests together." },
      { property: "og:title", content: "Groves — Forest Guardian" },
      { property: "og:description", content: "Mini-guilds, shared boards, and weekly co-op quests." },
    ],
  }),
  component: GrovePage,
});

type Profile = { id: string; display_name: string; username: string | null };

function GrovePage() {
  const { user, loading } = useAuth();
  const [myGrove, setMyGrove] = useState<Grove | null>(null);
  const [members, setMembers] = useState<GroveMember[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, Profile>>({});
  const [posts, setPosts] = useState<GrovePost[]>([]);
  const [quest, setQuest] = useState<GroveQuest | null>(null);
  const [browse, setBrowse] = useState<Grove[]>([]);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🌳");
  const [free, setFree] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data: mem } = await supabase
      .from("grove_members" as never)
      .select("grove_id, user_id, contribution, joined_at")
      .eq("user_id", user.id)
      .maybeSingle();
    const myId = (mem as { grove_id?: string } | null)?.grove_id;
    if (!myId) {
      setMyGrove(null); setMembers([]); setPosts([]); setQuest(null);
      const { data: list } = await supabase
        .from("groves" as never)
        .select("id, name, emoji, owner_id, xp, level, member_count")
        .order("level", { ascending: false }).limit(20);
      setBrowse((list as Grove[]) ?? []);
      return;
    }
    const { data: g } = await supabase
      .from("groves" as never).select("id, name, emoji, owner_id, xp, level, member_count")
      .eq("id", myId).maybeSingle();
    setMyGrove(g as Grove | null);

    const { data: ms } = await supabase
      .from("grove_members" as never).select("grove_id, user_id, contribution, joined_at")
      .eq("grove_id", myId);
    const memList = (ms as GroveMember[]) ?? [];
    setMembers(memList);
    if (memList.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id, display_name, username")
        .in("id", memList.map(m => m.user_id));
      const map: Record<string, Profile> = {};
      (profs ?? []).forEach(p => { map[p.id] = p as Profile; });
      setMemberProfiles(map);
    }
    const { data: pp } = await supabase
      .from("grove_posts" as never).select("id, grove_id, author_id, kind, content, created_at")
      .eq("grove_id", myId).order("created_at", { ascending: false }).limit(40);
    setPosts((pp as GrovePost[]) ?? []);
    // ensure + load quest
    await ensureWeeklyQuest(myId);
    const { data: q } = await supabase
      .from("grove_quests" as never)
      .select("id, grove_id, week_start, kind, label, target, progress, reward_xp, reward_acorns, completed_at")
      .eq("grove_id", myId).order("week_start", { ascending: false }).limit(1).maybeSingle();
    setQuest(q as GroveQuest | null);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // realtime board updates
  useEffect(() => {
    if (!myGrove) return;
    const ch = supabase.channel(`grove:${myGrove.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "grove_posts", filter: `grove_id=eq.${myGrove.id}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "grove_quests", filter: `grove_id=eq.${myGrove.id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myGrove, refresh]);

  const handleCreate = async () => {
    setBusy(true);
    const { data, error } = await createGrove(name, emoji);
    setBusy(false);
    if (error) return toast.error(error.message);
    const r = data as { ok: boolean; error?: string };
    if (!r?.ok) return toast.error(r?.error ?? "failed");
    toast.success("🌳 Grove created!");
    setName("");
    refresh();
  };

  const handleJoin = async (id: string) => {
    const { data, error } = await joinGrove(id);
    if (error) return toast.error(error.message);
    const r = data as { ok: boolean; error?: string };
    if (!r?.ok) return toast.error(r?.error ?? "failed");
    toast.success("Joined grove");
    refresh();
  };

  const handleLeave = async () => {
    if (!myGrove) return;
    if (!confirm("Leave this grove?")) return;
    const { data, error } = await leaveGrove(myGrove.id);
    if (error) return toast.error(error.message);
    const r = data as { ok: boolean; error?: string };
    if (!r?.ok) return toast.error(r?.error ?? "failed");
    toast.success("Left grove");
    refresh();
  };

  const handlePost = async (kind: "preset" | "free", content: string) => {
    if (!myGrove) return;
    const { data, error } = await postGroveMessage(myGrove.id, kind, content);
    if (error) return toast.error(error.message);
    const r = data as { ok: boolean; error?: string };
    if (!r?.ok) return toast.error(r?.error ?? "failed");
    if (kind === "free") setFree("");
    refresh();
  };

  const progressPct = useMemo(
    () => quest ? Math.min(100, Math.round((quest.progress / quest.target) * 100)) : 0,
    [quest]
  );

  if (loading) return <main className="mx-auto max-w-3xl p-6 text-muted-foreground">Loading…</main>;
  if (!user) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Groves</h1>
        <p className="mt-2 text-muted-foreground">Sign in to form a Grove with friends.</p>
        <Link to="/auth" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground">Sign in</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">🌳 Groves</h1>
        <p className="text-sm text-muted-foreground">Mini-guilds of up to 8 players. Tackle weekly co-op quests together.</p>
      </header>

      {!myGrove ? (
        <>
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-2 font-medium">Create a Grove <span className="text-xs text-muted-foreground">(costs 50 💨 O₂)</span></h2>
            <div className="flex flex-wrap items-center gap-2">
              <Input value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={4} className="w-16 text-center text-lg" />
              <Input value={name} onChange={e => setName(e.target.value)} maxLength={24} placeholder="Grove name (2–24 chars)" className="flex-1 min-w-[180px]" />
              <Button onClick={handleCreate} disabled={busy || name.trim().length < 2}>Create</Button>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-2 font-medium">Browse Groves</h2>
            {browse.length === 0 ? (
              <p className="text-sm text-muted-foreground">No groves yet — be the first!</p>
            ) : (
              <ul className="space-y-1">
                {browse.map(g => (
                  <li key={g.id} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{g.emoji}</span>
                      <span className="font-medium">{g.name}</span>
                      <span className="text-xs text-muted-foreground">Lv {g.level} · {g.member_count}/8</span>
                    </div>
                    <Button size="sm" variant="secondary" disabled={g.member_count >= 8} onClick={() => handleJoin(g.id)}>
                      {g.member_count >= 8 ? "Full" : "Join"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{myGrove.emoji}</span>
                  <div>
                    <h2 className="text-lg font-semibold">{myGrove.name}</h2>
                    <p className="text-xs text-muted-foreground">Lv {myGrove.level} · {myGrove.xp} XP · {myGrove.member_count}/8 members</p>
                  </div>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={handleLeave}>Leave</Button>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2 text-xs">
              {members.map(m => {
                const p = memberProfiles[m.user_id];
                return (
                  <li key={m.user_id} className="rounded-full border border-border bg-secondary px-2 py-1">
                    {p?.display_name ?? "Member"} · {m.contribution}
                    {m.user_id === myGrove.owner_id ? " 👑" : ""}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-2 font-medium">Weekly Co-op Quest</h3>
            {quest ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span>{quest.label}</span>
                  <span className="text-muted-foreground">{quest.progress}/{quest.target}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-secondary">
                  <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Reward: +{quest.reward_xp} XP · +{quest.reward_acorns} 🌰 each member {quest.completed_at ? "· ✅ Completed!" : ""}
                </p>
              </>
            ) : <p className="text-sm text-muted-foreground">No active quest yet.</p>}
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-2 font-medium">Grove Board</h3>
            <div className="flex flex-wrap gap-1">
              {PRESET_EMOTES.map(e => (
                <Button key={e} size="sm" variant="secondary" onClick={() => handlePost("preset", e)}>{e}</Button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={free} onChange={e => setFree(e.target.value)} maxLength={80} placeholder="Free message (1/day, 80 chars)" />
              <Button onClick={() => handlePost("free", free)} disabled={free.trim().length === 0}>Post</Button>
            </div>
            <ul className="mt-3 space-y-1">
              {posts.map(p => {
                const author = memberProfiles[p.author_id]?.display_name ?? "Member";
                return (
                  <li key={p.id} className="rounded-md border border-border/60 px-3 py-2 text-sm">
                    <span className="font-medium">{author}</span>{" "}
                    <span className="text-xs text-muted-foreground">· {new Date(p.created_at).toLocaleString()}</span>
                    <div className={p.kind === "preset" ? "" : "mt-0.5 text-foreground/90"}>{p.content}</div>
                  </li>
                );
              })}
              {posts.length === 0 && <li className="text-sm text-muted-foreground">No posts yet.</li>}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}