import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

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
}

function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, oxygen, trees_saved")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data as Profile);
          setName(data.display_name);
        }
      });
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

          <div className="mt-6 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <button
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
              className="mt-3 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}