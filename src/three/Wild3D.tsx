import { useEffect, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Tree3D, setTreeDetail } from "./trees";
import { WeatherSky, WeatherLight, getDayFactor } from "./Weather3D";
import { useQuality } from "@/lib/quality";
import type { TreeKind, Weather } from "@/lib/game";
import { wildStage, type WildTile } from "@/lib/social";

const TILE = 0.5;
const GAP = 0.04;

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
  onClick,
}: {
  position: [number, number];
  isMine: boolean;
  occupied: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const baseColor = isMine ? "#3a6a4a" : occupied ? "#7a5a3a" : "#4a5a4a";
  return (
    <mesh
      position={[position[0], hovered ? 0.03 : 0, position[1]]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = ""; }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <boxGeometry args={[TILE, 0.08, TILE]} />
      <meshStandardMaterial
        color={baseColor}
        emissive={hovered ? baseColor : "#000"}
        emissiveIntensity={hovered ? 0.4 : 0}
        flatShading
        roughness={0.95}
      />
    </mesh>
  );
}

function Scene({ gridSize, tiles, myUserId, weather, onTileClick, dayFactor }: Wild3DProps & { dayFactor: number }) {
  const [now, setNow] = useState(Date.now());
  useFrame(() => {
    const t = Date.now();
    if (t - now > 800) setNow(t);
  });

  const positions = useMemo(
    () => Array.from({ length: gridSize * gridSize }, (_, i) => pos(i, gridSize)),
    [gridSize]
  );

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
        return (
          <group key={i}>
            <WildTileMesh position={p} isMine={isMine} occupied={!!t} onClick={() => onTileClick(i)} />
            {t && stage && (
              <group position={[p[0], 0.04, p[1]]} scale={[0.55, 0.55, 0.55]}>
                <Tree3D kind={t.kind as TreeKind} stage={stage} />
              </group>
            )}
          </group>
        );
      })}
    </>
  );
}

export default function Wild3D(props: Wild3DProps) {
  const { settings } = useQuality();
  const [dayFactor, setDayFactor] = useState(() => getDayFactor());
  const camDistance = Math.max(8, props.gridSize * 0.85);

  useEffect(() => { setTreeDetail(settings.treeDetail); }, [settings.treeDetail]);
  useEffect(() => {
    const id = setInterval(() => setDayFactor(getDayFactor()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="rounded-2xl border border-border shadow-[var(--shadow-card)] overflow-hidden"
      style={{ height: 520, touchAction: "none" }}
    >
      <Canvas
        dpr={[1, settings.dprMax]}
        camera={{ position: [camDistance, camDistance * 0.9, camDistance], fov: 50 }}
        gl={{ antialias: settings.antialias, powerPreference: "high-performance" }}
      >
        <Scene {...props} dayFactor={dayFactor} />
        <OrbitControls
          enablePan
          minDistance={4}
          maxDistance={camDistance * 2.5}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI / 2.2}
          touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
        />
      </Canvas>
    </div>
  );
}