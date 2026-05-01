import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  TREES,
  THREATS,
  BIOMES,
  computeStage,
  biomeForTile,
  type Tile,
  type Biome,
} from "@/lib/game";
import { Tree3D } from "./trees";

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

      {/* Threat indicator */}
      {tile.threat && (
        <ThreatBillboard kind={THREATS[tile.threat].emoji} />
      )}
    </group>
  );
}

function ThreatBillboard({ kind }: { kind: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = 1.4 + Math.sin(state.clock.elapsedTime * 4) * 0.08;
    ref.current.rotation.y += 0.02;
  });
  return (
    <group ref={ref} position={[0, 1.4, 0]}>
      <mesh>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial
          color="#ff4444"
          emissive="#ff8800"
          emissiveIntensity={0.6}
          flatShading
        />
      </mesh>
      {/* simple cone "spike" so it reads as a warning */}
      <mesh position={[0, -0.18, 0]}>
        <coneGeometry args={[0.1, 0.18, 6]} />
        <meshStandardMaterial color="#ff4444" emissive="#ff8800" emissiveIntensity={0.4} flatShading />
      </mesh>
    </group>
  );
}

function Scene({ tiles, gridSize, biomeZones, feedingMode, onTileClick }: Forest3DProps) {
  const [now, setNow] = useState(() => Date.now());

  // Update "now" once per second so growth stages tick visually
  useFrame(() => {
    const t = Date.now();
    if (t - now > 500) setNow(t);
  });

  const positions = useMemo(
    () => tiles.map((t) => gridPosition(t.index, gridSize)),
    [tiles, gridSize]
  );

  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#bcd9ff", "#3a5a3a", 0.45]} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

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
    </>
  );
}

export default function Forest3D(props: Forest3DProps) {
  const camDistance = Math.max(7, props.gridSize * 1.4);
  return (
    <div className="daynight-bg rounded-2xl border border-border shadow-[var(--shadow-card)] overflow-hidden"
         style={{ height: 480, touchAction: "none" }}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [camDistance, camDistance * 0.9, camDistance], fov: 45 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#a8d8ea"]} />
        <fog attach="fog" args={["#a8d8ea", camDistance * 1.6, camDistance * 3.5]} />
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

// Suppress unused warning for TREES/BIOMES (keep imports for future expansion)
void TREES;
void BIOMES;