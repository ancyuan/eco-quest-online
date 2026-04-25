import { useState } from "react";

const STEPS = [
  {
    emoji: "🌱",
    title: "Plant a tree",
    body: "Tap any empty tile in the 6×6 grid to plant a seed. Each plant costs 2 💧 energy.",
  },
  {
    emoji: "🌿",
    title: "Wait for it to grow",
    body: "Trees pass through seed → sapling → mature in real time. Mature 🌳 trees can be harvested for 💨 oxygen.",
  },
  {
    emoji: "🛡️",
    title: "Defend from threats",
    body: "Sometimes 🔥 fire, 🪓 loggers, or 🐛 pests appear on mature trees. Tap the tile fast to neutralize them — or lose the tree.",
  },
];

export function Tutorial({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-secondary"
                }`}
              />
            ))}
          </div>
          <button
            onClick={onDone}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
        </div>
        <div className="mb-2 text-5xl">{current.emoji}</div>
        <h2 className="text-xl font-bold text-foreground">{current.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{current.body}</p>
        <button
          onClick={() => (last ? onDone() : setStep(step + 1))}
          className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {last ? "Start playing 🌳" : "Next →"}
        </button>
      </div>
    </div>
  );
}