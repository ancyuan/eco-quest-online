import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  STREAK_REWARDS, previewNextStreak, rewardForStreak,
  type StreakState,
} from "@/lib/quests";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  streak: StreakState;
  onClaim: () => void;
}

export function StreakBonus({ open, onOpenChange, streak, onClaim }: Props) {
  const next = previewNextStreak(streak);
  const todayReward = rewardForStreak(next);
  const cycleIdx = ((next - 1) % STREAK_REWARDS.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">🔥 Daily Login Streak</DialogTitle>
          <DialogDescription>
            Log in every day to climb the streak. Skip more than 1 day and it resets.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-gradient-to-br from-amber-500/10 to-primary/10 p-4 text-center">
          <div className="text-4xl">🔥</div>
          <div className="mt-1 text-3xl font-bold tabular-nums text-foreground">{next}</div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Day streak · best {Math.max(streak.best, next)}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {STREAK_REWARDS.map((r, i) => {
            const active = i === cycleIdx;
            const past = i < cycleIdx;
            return (
              <div
                key={r.day}
                className={`flex flex-col items-center gap-0.5 rounded-lg border p-1.5 text-center text-[10px] ${
                  active ? "border-primary bg-primary/15 ring-2 ring-primary"
                  : past   ? "border-border bg-secondary/40 opacity-60"
                           : "border-border bg-card"
                }`}
                title={r.label}
              >
                <div className="text-lg">{r.emoji}</div>
                <div className="font-semibold">D{r.day}</div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-border bg-card p-3 text-sm">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Today's reward</div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-2xl">{todayReward.emoji}</span>
            <span className="font-semibold">{todayReward.label}</span>
          </div>
        </div>

        <button
          onClick={onClaim}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Claim today's reward
        </button>
      </DialogContent>
    </Dialog>
  );
}