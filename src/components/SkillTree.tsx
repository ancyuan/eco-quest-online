import { useState } from "react";
import { SKILL_TREE, type SkillRanks, type SkillPath, totalSkillPointsSpent } from "@/lib/game";

const PATH_META: Record<SkillPath, { label: string; emoji: string; tint: string }> = {
  cultivator: { label: "Cultivator", emoji: "🌱", tint: "from-emerald-500/20 to-emerald-700/10" },
  protector:  { label: "Protector",  emoji: "🛡️", tint: "from-blue-500/20 to-blue-700/10" },
  naturalist: { label: "Naturalist", emoji: "💧", tint: "from-cyan-500/20 to-cyan-700/10" },
};

export function SkillTree({
  open, onOpenChange, skills, skillPoints, level, xpInto, xpNeed, onSpend,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  skills: SkillRanks;
  skillPoints: number;
  level: number;
  xpInto: number;
  xpNeed: number;
  onSpend: (id: string) => void;
}) {
  const [tab, setTab] = useState<SkillPath>("cultivator");
  if (!open) return null;
  const spent = totalSkillPointsSpent(skills);
  const nodes = SKILL_TREE.filter(n => n.path === tab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-foreground">🌟 Guardian Skills</h2>
          <span className="text-xs text-muted-foreground">Lv {level} · {xpInto}/{xpNeed} XP · spent {spent}</span>
        </div>
        <div className="mb-3 rounded-lg bg-secondary/40 px-3 py-2 text-sm text-foreground">
          Skill points available: <span className="font-bold text-primary">{skillPoints}</span>
        </div>
        <div className="mb-3 grid grid-cols-3 gap-1">
          {(Object.keys(PATH_META) as SkillPath[]).map(p => (
            <button key={p} onClick={() => setTab(p)}
              className={`rounded-lg border border-border px-2 py-1.5 text-xs font-medium transition-colors ${
                tab === p ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"
              }`}>
              {PATH_META[p].emoji} {PATH_META[p].label}
            </button>
          ))}
        </div>
        <div className={`space-y-2 rounded-xl bg-gradient-to-br ${PATH_META[tab].tint} p-3`}>
          {nodes.map(node => {
            const rank = skills[node.id] ?? 0;
            const maxed = rank >= node.maxRank;
            return (
              <div key={node.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/80 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">{node.emoji} {node.label}</div>
                  <div className="text-xs text-muted-foreground">{node.description}</div>
                  <div className="mt-1 flex gap-1">
                    {Array.from({ length: node.maxRank }).map((_, i) => (
                      <span key={i} className={`h-1.5 w-6 rounded-full ${i < rank ? "bg-primary" : "bg-secondary"}`} />
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => onSpend(node.id)}
                  disabled={maxed || skillPoints < 1}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                >
                  {maxed ? "MAX" : "+1"}
                </button>
              </div>
            );
          })}
        </div>
        <button onClick={() => onOpenChange(false)} className="mt-4 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium hover:bg-secondary/80">Close</button>
      </div>
    </div>
  );
}
