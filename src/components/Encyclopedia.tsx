import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TREES, type TreeKind, type EncyclopediaEntry } from "@/lib/game";

export function Encyclopedia({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [entries, setEntries] = useState<Record<TreeKind, EncyclopediaEntry | null>>({
    oak: null,
    pine: null,
    sakura: null,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TreeKind>("oak");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("forest_encyclopedia")
        .select("*")
        .in("tree_kind", ["oak", "pine", "sakura"]);

      if (error) {
        console.error("Failed to load encyclopedia:", error);
      } else if (data) {
        const mapped: Record<TreeKind, EncyclopediaEntry | null> = {
          oak: null,
          pine: null,
          sakura: null,
        };
        data.forEach((entry) => {
          const kind = entry.tree_kind as TreeKind;
          mapped[kind] = {
            tree_kind: kind,
            label: entry.label,
            emoji: entry.emoji,
            oxygen_yield: entry.oxygen_yield,
            lore: entry.lore,
            facts: Array.isArray(entry.facts) ? entry.facts : [],
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            Forest Encyclopedia
          </DialogTitle>
          <DialogDescription>
            Discover the lore, facts, and environmental impact of each tree species.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading encyclopedia...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as TreeKind)} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              {(Object.keys(TREES) as TreeKind[]).map((kind) => (
                <TabsTrigger key={kind} value={kind} className="flex items-center gap-1">
                  <span className="text-lg">{TREES[kind].emoji.mature}</span>
                  <span className="hidden sm:inline">{TREES[kind].label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {activeEntry && (
              <ScrollArea className="flex-1 mt-4 pr-4">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <div className="text-4xl">{activeEntry.emoji}</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">{activeEntry.label}</h3>
                      <p className="text-xs text-muted-foreground">O₂ Yield: +{activeEntry.oxygen_yield} per harvest</p>
                    </div>
                  </div>

                  {/* Lore Section */}
                  <div>
                    <h4 className="font-semibold text-sm text-primary mb-2">📖 Lore</h4>
                    <p className="text-sm leading-relaxed text-foreground">{activeEntry.lore}</p>
                  </div>

                  {/* Habitat Section */}
                  <div>
                    <h4 className="font-semibold text-sm text-primary mb-2">🌍 Habitat</h4>
                    <p className="text-sm text-foreground">{activeEntry.habitat}</p>
                  </div>

                  {/* Environmental Impact */}
                  <div>
                    <h4 className="font-semibold text-sm text-primary mb-2">♻️ Environmental Impact</h4>
                    <p className="text-sm text-foreground">{activeEntry.impact}</p>
                  </div>

                  {/* Facts Section */}
                  <div>
                    <h4 className="font-semibold text-sm text-primary mb-2">💡 Did You Know?</h4>
                    <ul className="space-y-2">
                      {activeEntry.facts.map((fact, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-foreground">
                          <span className="text-xs text-muted-foreground min-w-5">•</span>
                          <span>{fact}</span>
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
