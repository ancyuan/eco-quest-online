import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { findUserByUsername } from "@/lib/social";

export const Route = createFileRoute("/friends")({
  head: () => ({
    meta: [
      { title: "Friends — Forest Guardian" },
      { name: "description", content: "Add friends and visit their forests." },
    ],
  }),
  component: FriendsPage,
});

interface FriendRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted";
  other: { id: string; display_name: string; username: string | null; oxygen: number } | null;
  direction: "outgoing" | "incoming";
}

function FriendsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [rows, setRows] = useState<FriendRow[]>([]);
  const [me, setMe] = useState<{ username: string | null } | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const loadFriends = useCallback(async () => {
    if (!user) return;
    const { data: friendships } = await supabase
      .from("friendships")
      .select("id, user_id, friend_id, status")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
    if (!friendships) { setRows([]); return; }
    const otherIds = Array.from(new Set(friendships.map(f =>
      f.user_id === user.id ? f.friend_id : f.user_id
    )));
    const { data: profiles } = otherIds.length
      ? await supabase.from("profiles").select("id, display_name, username, oxygen").in("id", otherIds)
      : { data: [] as { id: string; display_name: string; username: string | null; oxygen: number }[] };
    const byId = new Map((profiles ?? []).map(p => [p.id, p]));
    setRows(friendships.map(f => {
      const otherId = f.user_id === user.id ? f.friend_id : f.user_id;
      return {
        ...f,
        status: f.status as "pending" | "accepted",
        other: byId.get(otherId) ?? null,
        direction: f.user_id === user.id ? "outgoing" : "incoming",
      };
    }));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadFriends();
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        setMe(data ?? null);
        setUsernameInput(data?.username ?? "");
      });
    const ch = supabase
      .channel("friendships-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => loadFriends())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadFriends]);

  const handleSaveUsername = async () => {
    if (!user) return;
    const v = usernameInput.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(v)) {
      toast.error("Username harus 3–20 karakter (a-z, 0-9, _)");
      return;
    }
    setSavingUsername(true);
    const { error } = await supabase.from("profiles").update({ username: v }).eq("id", user.id);
    setSavingUsername(false);
    if (error) {
      if (error.code === "23505") toast.error("Username sudah dipakai");
      else toast.error(error.message);
    } else {
      toast.success("Username tersimpan");
      setMe({ username: v });
    }
  };

  const handleSearch = async () => {
    if (!user) return;
    setSearching(true);
    const target = await findUserByUsername(search);
    setSearching(false);
    if (!target) { toast.error("Tidak ditemukan"); return; }
    if (target.id === user.id) { toast.error("Itu kamu 😅"); return; }
    const { error } = await supabase.from("friendships")
      .insert({ user_id: user.id, friend_id: target.id, status: "pending" });
    if (error) {
      if (error.code === "23505") toast.info("Sudah pernah dikirim");
      else toast.error(error.message);
    } else {
      toast.success(`Permintaan dikirim ke ${target.display_name}`);
      setSearch("");
      loadFriends();
    }
  };

  const accept = async (row: FriendRow) => {
    if (!user || !row.other) return;
    // mark incoming as accepted, then insert reciprocal accepted row
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", row.id);
    await supabase.from("friendships")
      .upsert({ user_id: user.id, friend_id: row.other.id, status: "accepted" }, { onConflict: "user_id,friend_id" });
    toast.success(`Berteman dengan ${row.other.display_name}`);
    loadFriends();
  };

  const remove = async (row: FriendRow) => {
    if (!user || !row.other) return;
    await supabase.from("friendships").delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${row.other.id}),and(user_id.eq.${row.other.id},friend_id.eq.${user.id})`);
    loadFriends();
  };

  if (loading || !user) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  const incoming = rows.filter(r => r.direction === "incoming" && r.status === "pending");
  const outgoing = rows.filter(r => r.direction === "outgoing" && r.status === "pending");
  const friends = rows.filter(r => r.status === "accepted" && r.direction === "outgoing");

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">🤝 Friends</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kunjungi forest teman, kirim energy, dan bantu mereka tumbuh.</p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Username kamu</h2>
          <p className="mb-3 text-xs text-muted-foreground">Pilih username unik agar teman bisa menambahkanmu.</p>
          <div className="flex gap-2">
            <input
              value={usernameInput}
              onChange={e => setUsernameInput(e.target.value)}
              placeholder="username"
              maxLength={20}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
            />
            <button
              onClick={handleSaveUsername}
              disabled={savingUsername || usernameInput.trim() === (me?.username ?? "")}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {savingUsername ? "..." : "Simpan"}
            </button>
          </div>
          {me?.username && <p className="mt-2 text-xs text-muted-foreground">Aktif: <span className="font-mono">@{me.username}</span></p>}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Tambah teman</h2>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="username teman"
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !search.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {searching ? "..." : "Kirim"}
            </button>
          </div>
        </section>

        {incoming.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Permintaan masuk</h2>
            <ul className="space-y-2">
              {incoming.map(r => (
                <li key={r.id} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                  <span className="text-sm text-foreground">
                    {r.other?.display_name} {r.other?.username && <span className="text-xs text-muted-foreground font-mono">@{r.other.username}</span>}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => accept(r)} className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Terima</button>
                    <button onClick={() => remove(r)} className="rounded-md border border-border px-3 py-1 text-xs">Tolak</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {outgoing.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Menunggu konfirmasi</h2>
            <ul className="space-y-2">
              {outgoing.map(r => (
                <li key={r.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-sm">
                  <span>{r.other?.display_name} <span className="text-xs text-muted-foreground font-mono">@{r.other?.username ?? "?"}</span></span>
                  <button onClick={() => remove(r)} className="text-xs text-muted-foreground hover:text-destructive">batal</button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Teman ({friends.length})</h2>
          {friends.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada. Tambahkan dengan username di atas.</p>
          ) : (
            <ul className="divide-y divide-border">
              {friends.map(r => r.other && (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{r.other.display_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">@{r.other.username ?? "?"} · 💨 {r.other.oxygen}</div>
                  </div>
                  <div className="flex gap-2">
                    {r.other.username && (
                      <Link
                        to="/forest/$username"
                        params={{ username: r.other.username }}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      >
                        Kunjungi
                      </Link>
                    )}
                    <button onClick={() => remove(r)} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive">Hapus</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
