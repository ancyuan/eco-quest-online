import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TREES, ALL_TREE_KINDS, type TreeKind, type EncyclopediaEntry } from "@/lib/game";

export function Encyclopedia({
  open,
  onOpenChange,
  unlockedTrees,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unlockedTrees?: TreeKind[];
}) {
  const [entries, setEntries] = useState<Partial<Record<TreeKind, EncyclopediaEntry>>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TreeKind>("oak");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("forest_encyclopedia")
        .select("*")
        .in("tree_kind", ALL_TREE_KINDS as readonly string[]);
      if (error) {
        console.error("Encyclopedia load failed:", error);
      } else if (data) {
        const mapped: Partial<Record<TreeKind, EncyclopediaEntry>> = {};
        data.forEach((entry) => {
          const kind = entry.tree_kind as TreeKind;
          const factsArr = Array.isArray(entry.facts)
            ? (entry.facts as unknown[]).filter((f): f is string => typeof f === "string")
            : [];
          mapped[kind] = {
            tree_kind: kind,
            label: entry.label,
            emoji: entry.emoji,
            oxygen_yield: entry.oxygen_yield,
            lore: entry.lore,
            facts: factsArr,
            habitat: entry.habitat,
            impact: entry.impact,
          };
        });
        setEntries(mapped);
      }
      setLoading(false);
    })();
  }, [open]);

  const activeEntry = entries[activeTab];
  const isLocked = (k: TreeKind) => !!unlockedTrees && !unlockedTrees.includes(k);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">📚</span> Forest Encyclopedia
          </DialogTitle>
          <DialogDescription>
            Discover the lore, facts, and impact of each species. Locked species are dimmed.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TreeKind)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-4 sm:grid-cols-8 h-auto">
              {ALL_TREE_KINDS.map((k) => (
                <TabsTrigger
                  key={k}
                  value={k}
                  className={`flex items-center justify-center gap-1 py-2 ${isLocked(k) ? "opacity-40" : ""}`}
                  title={isLocked(k) ? `${TREES[k].label} (locked)` : TREES[k].label}
                >
                  <span className="text-lg">{isLocked(k) ? "🔒" : TREES[k].emoji.mature}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {activeEntry && (
              <ScrollArea className="flex-1 mt-4 pr-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <div className="text-4xl">{activeEntry.emoji}</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">{activeEntry.label}</h3>
                      <p className="text-xs text-muted-foreground">
                        Base yield: +{activeEntry.oxygen_yield} O₂ • Ancient: +{TREES[activeTab].ancientOxygen} O₂
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Biomes: {TREES[activeTab].biomes.join(", ")}
                      </p>
                    </div>
                    {isLocked(activeTab) && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">🔒 Locked</span>
                    )}
                  </div>
                  <Section title="📖 Lore" body={activeEntry.lore} />
                  <Section title="🌍 Habitat" body={activeEntry.habitat} />
                  <Section title="♻️ Impact" body={activeEntry.impact} />
                  <div>
                    <h4 className="font-semibold text-sm text-primary mb-2">💡 Did You Know?</h4>
                    <ul className="space-y-2">
                      {activeEntry.facts.map((f, i) => (
                        <li key={i} className="flex gap-2 text-sm text-foreground">
                          <span className="text-xs text-muted-foreground min-w-5">•</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            )}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h4 className="font-semibold text-sm text-primary mb-2">{title}</h4>
      <p className="text-sm leading-relaxed text-foreground">{body}</p>
    </div>
  );
}
