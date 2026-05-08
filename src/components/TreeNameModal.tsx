import { useState, useEffect } from "react";
import { TREES, type TreeKind } from "@/lib/game";

interface Props {
  open: boolean;
  kind: TreeKind | undefined;
  onConfirm: (name: string) => void;
  onSkip: () => void;
}

export function TreeNameModal({ open, kind, onConfirm, onSkip }: Props) {
  const [name, setName] = useState("");
  useEffect(() => { if (!open) setName(""); }, [open]);
  if (!open || !kind) return null;
  const def = TREES[kind];
  const trimmed = name.trim().slice(0, 20);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-3 text-center text-5xl">{def.emoji.mature}</div>
        <h2 className="text-center text-lg font-semibold text-foreground">
          Pohonmu sudah dewasa
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Beri nama {def.label} ini? (opsional)
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="Aoi, Ranger, Hutanku…"
          className="mt-4 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={onSkip}
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary"
          >
            Lewati
          </button>
          <button
            onClick={() => trimmed.length > 0 && onConfirm(trimmed)}
            disabled={trimmed.length === 0}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Beri nama
          </button>
        </div>
      </div>
    </div>
  );
}

export function TreeDossier({
  tile, onClose,
}: { tile: { name?: string; kind?: TreeKind; stage?: string; birthAt?: number; threatsSurvived?: number; o2Produced?: number }; onClose: () => void }) {
  if (!tile.name || !tile.kind) return null;
  const def = TREES[tile.kind];
  const ageMs = tile.birthAt ? Date.now() - tile.birthAt : 0;
  const ageStr = formatAge(ageMs);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="text-4xl">{def.emoji[(tile.stage as keyof typeof def.emoji) ?? "mature"]}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold text-foreground">{tile.name}</div>
            <div className="text-xs text-muted-foreground">{def.label} · {tile.stage ?? "—"}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Umur" value={ageStr} />
          <Stat label="Selamat" value={`${tile.threatsSurvived ?? 0}×`} />
          <Stat label="O₂" value={`${tile.o2Produced ?? 0}`} />
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-2">
      <div className="text-sm font-bold text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function formatAge(ms: number) {
  if (ms <= 0) return "baru";
  const d = Math.floor(ms / 86_400_000);
  if (d > 0) return `${d}h`;
  const h = Math.floor(ms / 3_600_000);
  if (h > 0) return `${h}j`;
  const m = Math.floor(ms / 60_000);
  return `${m}m`;
}