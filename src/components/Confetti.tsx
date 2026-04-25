import { useEffect, useState } from "react";

/**
 * Lightweight, dependency-free confetti burst.
 * Renders a fixed-position layer of falling colored squares for ~1.2s.
 */
export function Confetti({ trigger }: { trigger: number }) {
  const [bursts, setBursts] = useState<Array<{ id: number; pieces: Piece[] }>>([]);

  useEffect(() => {
    if (!trigger) return;
    const id = trigger;
    const pieces: Piece[] = Array.from({ length: 18 }, (_, i) => ({
      key: i,
      x: 50 + (Math.random() - 0.5) * 30,
      dx: (Math.random() - 0.5) * 220,
      dy: -120 - Math.random() * 80,
      rot: Math.random() * 360,
      hue: [140, 90, 200, 40, 320][Math.floor(Math.random() * 5)],
      delay: Math.random() * 60,
    }));
    setBursts((b) => [...b, { id, pieces }]);
    const timeout = setTimeout(() => {
      setBursts((b) => b.filter((x) => x.id !== id));
    }, 1400);
    return () => clearTimeout(timeout);
  }, [trigger]);

  if (bursts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {bursts.map((b) =>
        b.pieces.map((p) => (
          <span
            key={`${b.id}-${p.key}`}
            className="absolute h-2 w-2 rounded-sm"
            style={{
              left: `${p.x}%`,
              top: "55%",
              background: `oklch(0.7 0.18 ${p.hue})`,
              animation: `confetti-fall 1.2s ${p.delay}ms cubic-bezier(.2,.7,.4,1) forwards`,
              ["--dx" as string]: `${p.dx}px`,
              ["--dy" as string]: `${p.dy}px`,
              ["--rot" as string]: `${p.rot}deg`,
            }}
          />
        ))
      )}
    </div>
  );
}

interface Piece {
  key: number;
  x: number;
  dx: number;
  dy: number;
  rot: number;
  hue: number;
  delay: number;
}