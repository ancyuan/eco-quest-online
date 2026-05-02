import { useEffect, useState, useCallback } from "react";

export type QualityLevel = "low" | "medium" | "high";

const KEY = "fg.quality";

export interface QualitySettings {
  shadows: boolean;
  particles: boolean;
  antialias: boolean;
  dprMax: number;
  rainCount: number;
  treeDetail: "low" | "med" | "high";
}

export const QUALITY_PRESETS: Record<QualityLevel, QualitySettings> = {
  low:    { shadows: false, particles: false, antialias: false, dprMax: 1.0,  rainCount: 0,   treeDetail: "low"  },
  medium: { shadows: false, particles: true,  antialias: true,  dprMax: 1.5,  rainCount: 250, treeDetail: "med"  },
  high:   { shadows: true,  particles: true,  antialias: true,  dprMax: 1.75, rainCount: 500, treeDetail: "high" },
};

function detectDefault(): QualityLevel {
  if (typeof window === "undefined") return "high";
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android|iPhone|iPad/.test(ua);
  const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 4;
  if (isMobile && cores <= 4) return "low";
  if (isMobile) return "medium";
  if (cores <= 4) return "medium";
  return "high";
}

export function useQuality() {
  const [level, setLevelState] = useState<QualityLevel>("high");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(KEY) as QualityLevel | null;
      setLevelState(saved && saved in QUALITY_PRESETS ? saved : detectDefault());
    } catch {
      setLevelState(detectDefault());
    }
  }, []);

  const setLevel = useCallback((next: QualityLevel) => {
    setLevelState(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch { /* ignore */ }
  }, []);

  return { level, setLevel, settings: QUALITY_PRESETS[level] };
}
