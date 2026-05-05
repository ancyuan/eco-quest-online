import { useEffect, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import {
  THREATS,
  THREAT_WINDOW_MS,
  computeStage,
  biomeForTile,
  type Tile,
  type Biome,
  type Weather,
  type CompanionId,
} from "@/lib/game";
import { getDayFactor } from "./Weather3D";
import { Tree3D, setTreeDetail } from "./trees";
import { ThreatMesh } from "./Threats";
import { WeatherSky, WeatherLight, WeatherEffects } from "./Weather3D";
import { Companions3D } from "./Companions3D";
import { useQuality, type QualityLevel, QUALITY_PRESETS } from "@/lib/quality";

const TILE_SIZE = 1.0;
const TILE_GAP = 0.08;

const BIOME_COLORS: Record<Biome, string> = {
  rainforest: "#3b6b3a",
  savanna: "#c9a86b",
  taiga: "#7a96a8",
};

interface Forest3DProps {
  tiles: Tile[];
  gridSize: number;
  biomeZones: Record<number, Biome>;
  feedingMode: boolean;
  onTileClick: (tile: Tile) => void;
  weather: Weather;
  activeCompanions: CompanionId[];
  readOnly?: boolean;
}

function gridPosition(index: number, gridSize: number): [number, number] {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const offset = (gridSize - 1) / 2;
  const step = TILE_SIZE + TILE_GAP;
  return [(col - offset) * step, (row - offset) * step];
}

// Per-tile interactive top — kept simple (shared geometry/material via cached).
function TileTop({
  biome,
  feedingMode,
  position,
  onClick,
  readOnly,
}: {
  biome: Biome;
  feedingMode: boolean;
  position: [number, number];
  onClick: () => void;
  readOnly?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const baseColor = BIOME_COLORS[biome];
  const highlight = (!readOnly && hovered) || feedingMode;
  return (
    <mesh
      position={[position[0], !readOnly && hovered ? 0.04 : 0, position[1]]}
      onPointerOver={(e) => {
        if (readOnly) return;
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        if (readOnly) return;
        setHovered(false);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (readOnly) return;
        onClick();
      }}
    >
      <boxGeometry args={[TILE_SIZE, 0.12, TILE_SIZE]} />
      <meshStandardMaterial
        color={baseColor}
        flatShading
        emissive={highlight ? baseColor : "#000000"}
        emissiveIntensity={highlight ? 0.4 : 0}
        roughness={0.9}
      />
    </mesh>
  );
}

function Scene({
  tiles,
  gridSize,
  biomeZones,
  feedingMode,
  onTileClick,
  weather,
  activeCompanions,
  rainCount,
  shadows,
  readOnly,
  dayFactor,
}: Forest3DProps & { rainCount: number; shadows: boolean; dayFactor: number }) {
  const [now, setNow] = useState(() => Date.now());

  useFrame(() => {
    const t = Date.now();
    if (t - now > 500) setNow(t);
  });

  const positions = useMemo(
    () => tiles.map((t) => gridPosition(t.index, gridSize)),
    [tiles, gridSize]
  );

  const areaRadius = (gridSize * (TILE_SIZE + TILE_GAP)) / 2;

  return (
    <>
      <WeatherSky weather={weather} dayFactor={dayFactor} />
      <WeatherLight weather={weather} dayFactor={dayFactor} />
      {shadows ? null : null /* shadow toggle controlled at canvas level */}
      <WeatherEffects weather={weather} rainCount={rainCount} />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow={shadows}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#2a4a2a" flatShading roughness={1} />
      </mesh>

      {tiles.map((tile, i) => {
        const biome = biomeForTile(biomeZones, tile.index);
        const pos = positions[i];
        const stage =
          tile.kind && tile.plantedAt
            ? tile.stage === "ancient"
              ? "ancient"
              : computeStage(tile.plantedAt, now, tile.kind, false)
            : undefined;
        return (
          <group key={tile.index}>
            <TileTop
              biome={biome}
              feedingMode={feedingMode}
              position={pos}
              onClick={() => onTileClick(tile)}
              readOnly={readOnly}
            />
            {tile.kind && stage && (
              <group position={[pos[0], 0.06, pos[1]]}>
                <Tree3D kind={tile.kind} stage={stage} />
              </group>
            )}
            {tile.threat && (
              <group position={[pos[0], 0.07, pos[1]]}>
                <ThreatMesh
                  kind={tile.threat}
                  expiresAt={tile.threatExpiresAt}
                  windowMs={THREAT_WINDOW_MS}
                />
              </group>
            )}
          </group>
        );
      })}

      <Companions3D active={activeCompanions} areaRadius={areaRadius * 1.1} />
    </>
  );
}

export default function Forest3D(props: Forest3DProps) {
  const { level, setLevel, settings } = useQuality();
  const [autoLevel, setAutoLevel] = useState<QualityLevel | null>(null);
  const camDistance = Math.max(7, props.gridSize * 1.4);
  void THREATS;

  // Apply LOD globally for all trees
  useEffect(() => {
    setTreeDetail(settings.treeDetail);
  }, [settings.treeDetail]);

  const effective = autoLevel ? QUALITY_PRESETS[autoLevel] : settings;

  return (
    <div className="relative">
      <div
        className="rounded-2xl border border-border shadow-[var(--shadow-card)] overflow-hidden"
        style={{ height: 480, touchAction: "none" }}
      >
        <Canvas
          shadows={effective.shadows}
          dpr={[1, effective.dprMax]}
          camera={{ position: [camDistance, camDistance * 0.9, camDistance], fov: 45 }}
          gl={{ antialias: effective.antialias, powerPreference: "high-performance" }}
        >
          <PerformanceMonitor
            onDecline={() => {
              // Auto-degrade once when FPS dips
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
            rainCount={effective.particles ? effective.rainCount : 0}
            shadows={effective.shadows}
          />
          <OrbitControls
            enablePan={false}
            minDistance={5}
            maxDistance={camDistance * 2.2}
            minPolarAngle={0.3}
            maxPolarAngle={Math.PI / 2.2}
            enableDamping={level !== "low"}
            dampingFactor={0.08}
            touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
          />
        </Canvas>
      </div>

      {/* Quality picker overlay */}
      <div className="absolute right-2 top-2 flex gap-1 rounded-full border border-border bg-card/90 p-1 text-[10px] shadow-[var(--shadow-soft)] backdrop-blur">
        {(["low", "medium", "high"] as QualityLevel[]).map((q) => (
          <button
            key={q}
            onClick={() => {
              setAutoLevel(null);
              setLevel(q);
            }}
            className={`rounded-full px-2 py-0.5 font-semibold transition-colors ${
              (autoLevel ?? level) === q
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
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
