import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Forest Guardian" },
      { name: "description", content: "Top Forest Guardians worldwide ranked by oxygen produced." },
    ],
  }),
  component: LeaderboardPage,
});

interface Row {
  id: string;
  display_name: string;
  oxygen: number;
  trees_saved: number;
}

function LeaderboardPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, oxygen, trees_saved")
        .order("oxygen", { ascending: false })
        .limit(50);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    };
    load();

    // realtime updates
    const channel = supabase
      .channel("leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">🏆 Global Leaderboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Top 50 Forest Guardians by oxygen produced</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-[3rem_1fr_auto_auto] gap-3 border-b border-border bg-secondary/50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Rank</span>
            <span>Guardian</span>
            <span>💨 O₂</span>
            <span>🌳 Saved</span>
          </div>
          {loading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading rankings…</p>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No guardians yet. Be the first!</p>
          ) : (
            <ol className="divide-y divide-border">
              {rows.map((row, i) => {
                const isMe = user?.id === row.id;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <li
                    key={row.id}
                    className={`grid grid-cols-[3rem_1fr_auto_auto] items-center gap-3 px-4 py-3 transition-colors ${
                      isMe ? "bg-primary/10 font-medium" : "hover:bg-secondary/50"
                    }`}
                  >
                    <span className="text-sm font-bold text-muted-foreground">
                      {medal ?? `#${i + 1}`}
                    </span>
                    <span className="truncate text-foreground">
                      {row.display_name}
                      {isMe && <span className="ml-2 text-xs text-primary">(you)</span>}
                    </span>
                    <span className="text-sm tabular-nums text-foreground">{row.oxygen}</span>
                    <span className="text-sm tabular-nums text-foreground">{row.trees_saved}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </main>
  );
}