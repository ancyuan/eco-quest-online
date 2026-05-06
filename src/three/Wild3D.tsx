import { useEffect, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { Tree3D, setTreeDetail } from "./trees";
import { WeatherSky, WeatherLight, getDayFactor } from "./Weather3D";
import { useQuality, QUALITY_PRESETS, type QualityLevel } from "@/lib/quality";
import type { TreeKind, Weather } from "@/lib/game";
import { wildStage, type WildTile } from "@/lib/social";

const TILE = 0.5;
const GAP = 0.04;

// Shared geometries/materials — Wild3D renders up to 400 tiles, so we must
// avoid allocating per-tile resources.
const TILE_GEOM = new THREE.BoxGeometry(TILE, 0.08, TILE);
const TILE_MAT_MINE = new THREE.MeshStandardMaterial({ color: "#3a6a4a", flatShading: true, roughness: 0.95 });
const TILE_MAT_OCC  = new THREE.MeshStandardMaterial({ color: "#7a5a3a", flatShading: true, roughness: 0.95 });
const TILE_MAT_EMPTY= new THREE.MeshStandardMaterial({ color: "#4a5a4a", flatShading: true, roughness: 0.95 });
const TILE_MAT_HOVER= new THREE.MeshStandardMaterial({ color: "#9bd1a4", emissive: "#3a6a4a", emissiveIntensity: 0.4, flatShading: true, roughness: 0.9 });

interface Wild3DProps {
  gridSize: number;
  tiles: Record<number, WildTile>;
  myUserId: string;
  weather: Weather;
  onTileClick: (idx: number) => void;
}

function pos(idx: number, gridSize: number): [number, number] {
  const r = Math.floor(idx / gridSize);
  const c = idx % gridSize;
  const off = (gridSize - 1) / 2;
  const step = TILE + GAP;
  return [(c - off) * step, (r - off) * step];
}

function WildTileMesh({
  position,
  isMine,
  occupied,
  interactive,
  onClick,
}: {
  position: [number, number];
  isMine: boolean;
  occupied: boolean;
  interactive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const baseMat = hovered && interactive
    ? TILE_MAT_HOVER
    : isMine ? TILE_MAT_MINE : occupied ? TILE_MAT_OCC : TILE_MAT_EMPTY;
  return (
    <mesh
      position={[position[0], hovered && interactive ? 0.03 : 0, position[1]]}
      geometry={TILE_GEOM}
      material={baseMat}
      onPointerOver={interactive ? (e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; } : undefined}
      onPointerOut={interactive ? () => { setHovered(false); document.body.style.cursor = ""; } : undefined}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    />
  );
}

function Scene({
  gridSize, tiles, myUserId, weather, onTileClick, dayFactor,
  treeBudget, interactiveTiles,
}: Wild3DProps & { dayFactor: number; treeBudget: number; interactiveTiles: boolean }) {
  const [now, setNow] = useState(Date.now());
  useFrame(() => {
    const t = Date.now();
    if (t - now > 800) setNow(t);
  });

  const positions = useMemo(
    () => Array.from({ length: gridSize * gridSize }, (_, i) => pos(i, gridSize)),
    [gridSize]
  );

  // LOD: when tile count exceeds budget, prioritize mature/ancient + own tiles.
  // Other stages get a lightweight billboard cone.
  const occupiedCount = Object.keys(tiles).length;
  const overBudget = occupiedCount > treeBudget;
  const fullDetailIds = useMemo(() => {
    if (!overBudget) return null;
    const entries = Object.entries(tiles).map(([k, t]) => ({
      idx: Number(k), t,
      stage: wildStage(t.planted_at, t.growth_ms, now),
      mine: t.planter_id === myUserId,
    }));
    entries.sort((a, b) => {
      const score = (e: typeof a) =>
        (e.stage === "mature" ? 4 : e.stage === "sapling" ? 2 : 1) +
        (e.mine ? 1 : 0);
      return score(b) - score(a);
    });
    return new Set(entries.slice(0, treeBudget).map(e => e.idx));
  }, [tiles, overBudget, treeBudget, myUserId, now]);

  return (
    <>
      <WeatherSky weather={weather} dayFactor={dayFactor} />
      <WeatherLight weather={weather} dayFactor={dayFactor} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#2a4a2a" flatShading roughness={1} />
      </mesh>

      {positions.map((p, i) => {
        const t = tiles[i];
        const isMine = !!t && t.planter_id === myUserId;
        const stage = t ? wildStage(t.planted_at, t.growth_ms, now) : null;
        const fullDetail = !fullDetailIds || fullDetailIds.has(i);
        return (
          <group key={i}>
            <WildTileMesh
              position={p}
              isMine={isMine}
              occupied={!!t}
              interactive={interactiveTiles}
              onClick={() => onTileClick(i)}
            />
            {t && stage && fullDetail && (
              <group position={[p[0], 0.04, p[1]]} scale={[0.55, 0.55, 0.55]}>
                <Tree3D kind={t.kind as TreeKind} stage={stage} />
              </group>
            )}
            {t && stage && !fullDetail && (
              <mesh position={[p[0], 0.18, p[1]]} material={isMine ? TILE_MAT_MINE : TILE_MAT_OCC}>
                <coneGeometry args={[0.12, 0.32, 5]} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

export default function Wild3D(props: Wild3DProps) {
  const { level, setLevel, settings } = useQuality();
  const [autoLevel, setAutoLevel] = useState<QualityLevel | null>(null);
  const [dayFactor, setDayFactor] = useState(() => getDayFactor());
  const camDistance = Math.max(8, props.gridSize * 0.85);

  const effective = autoLevel ? QUALITY_PRESETS[autoLevel] : settings;
  useEffect(() => { setTreeDetail(effective.treeDetail); }, [effective.treeDetail]);
  useEffect(() => {
    const id = setInterval(() => setDayFactor(getDayFactor()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Tree budget per quality level — protects FPS on low-end devices when
  // the wild garden fills up (max 400 occupied tiles).
  const treeBudget = effective.treeDetail === "low" ? 60
                   : effective.treeDetail === "med" ? 160
                   : 400;

  return (
    <div className="relative">
      <div
        className="rounded-2xl border border-border shadow-[var(--shadow-card)] overflow-hidden"
        style={{ height: 520, touchAction: "none" }}
      >
        <Canvas
          dpr={[1, effective.dprMax]}
          camera={{ position: [camDistance, camDistance * 0.9, camDistance], fov: 50 }}
          gl={{ antialias: effective.antialias, powerPreference: "high-performance" }}
        >
          <PerformanceMonitor
            onDecline={() => {
              setAutoLevel((prev) => {
                if (prev === "low") return prev;
                if (prev === "medium" || level === "medium") return "low";
                return "medium";
              });
            }}
            flipflops={2}
          />
          <Scene
            {...props}
            dayFactor={dayFactor}
            treeBudget={treeBudget}
            interactiveTiles={effective.treeDetail !== "low"}
          />
          <OrbitControls
            enablePan
            minDistance={4}
            maxDistance={camDistance * 2.5}
            minPolarAngle={0.3}
            maxPolarAngle={Math.PI / 2.2}
            enableDamping={level !== "low"}
            touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
          />
        </Canvas>
      </div>

      {/* Quality picker overlay */}
      <div className="absolute right-2 top-2 flex gap-1 rounded-full border border-border bg-card/90 p-1 text-[10px] shadow-[var(--shadow-soft)] backdrop-blur">
        {(["low", "medium", "high"] as QualityLevel[]).map((q) => (
          <button
            key={q}
            onClick={() => { setAutoLevel(null); setLevel(q); }}
            className={`rounded-full px-2 py-0.5 font-semibold transition-colors ${
              (autoLevel ?? level) === q ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
            title={`Quality: ${q}${autoLevel === q ? " (auto)" : ""}`}
          >
            {q === "low" ? "L" : q === "medium" ? "M" : "H"}
          </button>
        ))}
      </div>
    </div>
  );
}