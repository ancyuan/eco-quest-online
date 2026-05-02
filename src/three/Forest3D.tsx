import { useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
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
import { Tree3D } from "./trees";
import { ThreatMesh } from "./Threats";
import { WeatherSky, WeatherLight, WeatherEffects } from "./Weather3D";
import { Companions3D } from "./Companions3D";

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
}

function gridPosition(index: number, gridSize: number): [number, number] {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const offset = (gridSize - 1) / 2;
  const step = TILE_SIZE + TILE_GAP;
  return [(col - offset) * step, (row - offset) * step];
}

function TileMesh({
  tile,
  biome,
  feedingMode,
  position,
  onClick,
  now,
}: {
  tile: Tile;
  biome: Biome;
  feedingMode: boolean;
  position: [number, number];
  onClick: () => void;
  now: number;
}) {
  const [hovered, setHovered] = useState(false);
  const stage =
    tile.kind && tile.plantedAt
      ? tile.stage === "ancient"
        ? "ancient"
        : computeStage(tile.plantedAt, now, tile.kind, false)
      : undefined;

  const baseColor = BIOME_COLORS[biome];
  const highlight = hovered || feedingMode;

  return (
    <group position={[position[0], 0, position[1]]}>
      {/* Tile floor */}
      <mesh
        position={[0, hovered ? 0.04 : 0, 0]}
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
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

      {/* Tree (if planted) */}
      {tile.kind && stage && (
        <group position={[0, 0.06, 0]}>
          <Tree3D kind={tile.kind} stage={stage} />
        </group>
      )}

      {/* Threat 3D mesh */}
      {tile.threat && (
        <group position={[0, 0.07, 0]}>
          <ThreatMesh kind={tile.threat} expiresAt={tile.threatExpiresAt} windowMs={THREAT_WINDOW_MS} />
        </group>
      )}
    </group>
  );
}

function Scene({ tiles, gridSize, biomeZones, feedingMode, onTileClick, weather, activeCompanions }: Forest3DProps) {
  const [now, setNow] = useState(() => Date.now());

  // Update "now" every ~500ms so growth stages tick visually
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
      <WeatherSky weather={weather} />
      <WeatherLight weather={weather} />
      <WeatherEffects weather={weather} />

      {/* Ground plane (slightly below tiles) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#2a4a2a" flatShading roughness={1} />
      </mesh>

      {tiles.map((tile, i) => (
        <TileMesh
          key={tile.index}
          tile={tile}
          biome={biomeForTile(biomeZones, tile.index)}
          feedingMode={feedingMode}
          position={positions[i]}
          onClick={() => onTileClick(tile)}
          now={now}
        />
      ))}

      <Companions3D active={activeCompanions} areaRadius={areaRadius * 1.1} />
    </>
  );
}

export default function Forest3D(props: Forest3DProps) {
  const camDistance = Math.max(7, props.gridSize * 1.4);
  // Suppress unused-var warnings for re-exports
  void THREATS;
  return (
    <div
      className="rounded-2xl border border-border shadow-[var(--shadow-card)] overflow-hidden"
      style={{ height: 480, touchAction: "none" }}
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [camDistance, camDistance * 0.9, camDistance], fov: 45 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Scene {...props} />
        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={camDistance * 2.2}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI / 2.2}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
}
