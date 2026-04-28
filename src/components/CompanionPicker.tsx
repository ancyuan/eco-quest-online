import { COMPANIONS, MAX_ACTIVE_COMPANIONS, type CompanionId, type HarvestTally } from "@/lib/game";
import { toast } from "sonner";

export function CompanionPicker({
  open, onOpenChange, unlocked, active, tally, onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unlocked: CompanionId[];
  active: CompanionId[];
  tally: HarvestTally;
  onChange: (next: CompanionId[]) => void;
}) {
  if (!open) return null;

  const toggle = (id: CompanionId) => {
    if (active.includes(id)) {
      onChange(active.filter(c => c !== id));
    } else {
      if (active.length >= MAX_ACTIVE_COMPANIONS) {
        toast.error(`Max ${MAX_ACTIVE_COMPANIONS} companions active`);
        return;
      }
      onChange([...active, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-foreground">🐾 Wildlife Companions</h2>
          <span className="text-xs text-muted-foreground">{active.length}/{MAX_ACTIVE_COMPANIONS} active</span>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Harvest 50 mature trees of a species to befriend its companion.
        </p>
        <div className="space-y-2">
          {COMPANIONS.map(c => {
            const isUnlocked = unlocked.includes(c.id);
            const isActive = active.includes(c.id);
            const progress = tally[c.unlockSpecies] ?? 0;
            return (
              <button
                key={c.id}
                disabled={!isUnlocked}
                onClick={() => toggle(c.id)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                  isActive ? "border-primary bg-primary/10"
                          : isUnlocked ? "border-border bg-card hover:bg-secondary"
                                       : "border-border bg-secondary/30 opacity-60"
                }`}
              >
                <span className="text-3xl">{isUnlocked ? c.emoji : "🔒"}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.description}</div>
                  {!isUnlocked && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Harvest {Math.min(progress, c.unlockCount)}/{c.unlockCount} mature {c.unlockSpecies}
                    </div>
                  )}
                </div>
                {isActive && <span className="text-xs font-bold text-primary">✓ ACTIVE</span>}
              </button>
            );
          })}
        </div>
        <button onClick={() => onOpenChange(false)} className="mt-4 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium hover:bg-secondary/80">Close</button>
      </div>
    </div>
  );
}
