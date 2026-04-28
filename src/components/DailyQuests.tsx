import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { DailyQuestState } from "@/lib/quests";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  state: DailyQuestState;
  onClaim: (id: string) => void;
}

export function DailyQuests({ open, onOpenChange, state, onClaim }: Props) {
  const allDone = state.quests.every(q => q.claimed);
  const ready = state.quests.filter(q => q.done >= q.target && !q.claimed).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📜 Daily Quests
            {ready > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {ready} ready!
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Complete by midnight UTC. Resets daily. Earn XP + 🌰 Acorns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {state.quests.map((q) => {
            const def = state.defs.find(d => d.id === q.id);
            if (!def) return null;
            const pct = Math.min(100, (q.done / q.target) * 100);
            const done = q.done >= q.target;
            return (
              <div key={q.id} className="rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">{def.emoji}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{def.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Reward: ⭐ {def.reward.xp} XP · 🌰 {def.reward.acorns}
                    </div>
                  </div>
                  {q.claimed ? (
                    <span className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground">✓ Claimed</span>
                  ) : done ? (
                    <button
                      onClick={() => onClaim(q.id)}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Claim
                    </button>
                  ) : (
                    <span className="rounded-md bg-secondary px-2 py-1 text-xs tabular-nums">
                      {q.done}/{q.target}
                    </span>
                  )}
                </div>
                <Progress value={pct} className="mt-2 h-1.5" />
              </div>
            );
          })}
        </div>

        {allDone && (
          <p className="text-center text-xs text-muted-foreground">
            🎉 All quests claimed! New ones tomorrow.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}