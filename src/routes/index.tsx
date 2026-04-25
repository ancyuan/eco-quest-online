import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forest Guardian — Grow & Protect Your Forest" },
      { name: "description", content: "A calm eco-RPG. Plant trees, defend nature, climb the global leaderboard." },
    ],
  }),
  component: Index,
});

interface LeaderRow {
  display_name: string;
  oxygen: number;
  trees_saved: number;
}

function Index() {
  const [top, setTop] = useState<LeaderRow[]>([]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("display_name, oxygen, trees_saved")
      .order("oxygen", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setTop(data as LeaderRow[]);
      });
  }, []);

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: "var(--gradient-forest)" }}
      >
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
              <span>🌱</span> A calm eco-RPG
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Grow a thriving forest.
              <br />
              <span className="text-primary">Protect what matters.</span>
            </h1>
            <p className="mt-6 text-lg text-foreground/70">
              Plant trees, defend them from threats, and climb the global leaderboard of Forest Guardians. One tile at a time.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/play"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-transform hover:scale-105"
              >
                Start Playing →
              </Link>
              <Link
                to="/leaderboard"
                className="rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:bg-background"
              >
                See Leaderboard
              </Link>
            </div>
          </div>

          {/* Floating tree showcase */}
          <div className="mt-16 flex justify-center gap-6 text-5xl sm:gap-10 sm:text-7xl">
            <span className="animate-bounce" style={{ animationDelay: "0ms", animationDuration: "3s" }}>🌳</span>
            <span className="animate-bounce" style={{ animationDelay: "300ms", animationDuration: "3s" }}>🌲</span>
            <span className="animate-bounce" style={{ animationDelay: "600ms", animationDuration: "3s" }}>🌸</span>
            <span className="animate-bounce" style={{ animationDelay: "900ms", animationDuration: "3s" }}>🌳</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { emoji: "🌱", title: "Plant", body: "Spend energy to plant Oak, Pine, or Sakura seeds across your 6×6 plot." },
            { emoji: "🌿", title: "Grow", body: "Watch trees mature in real time. Each species rewards different oxygen." },
            { emoji: "🛡️", title: "Defend", body: "Tap fast to fight off fire, loggers, and pests before they ruin your forest." },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-1"
            >
              <div className="mb-3 text-4xl">{f.emoji}</div>
              <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard preview */}
      <section className="mx-auto max-w-3xl px-4 pb-24">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">🏆 Top Guardians</h2>
            <Link to="/leaderboard" className="text-sm font-medium text-primary hover:underline">
              View all →
            </Link>
          </div>
          {top.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              The forest is quiet. Be the first guardian.
            </p>
          ) : (
            <ol className="divide-y divide-border">
              {top.map((row, i) => (
                <li key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-sm font-bold text-muted-foreground">#{i + 1}</span>
                    <span className="font-medium text-foreground">{row.display_name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>💨 {row.oxygen}</span>
                    <span>🌳 {row.trees_saved}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Built with care for the planet 🌍
      </footer>
    </main>
  );
}
