import { useMemo } from "react";
import * as THREE from "three";
// Side-effect import: registers three.js intrinsic JSX elements (mesh, group, etc.)
import "@react-three/fiber";
import type { TreeKind, GrowthStage } from "@/lib/game";

// Stage-based scale (seed → ancient)
const STAGE_SCALE: Record<GrowthStage, number> = {
  seed: 0.25,
  sapling: 0.55,
  mature: 1.0,
  ancient: 1.25,
};

interface TreeProps {
  kind: TreeKind;
  stage: GrowthStage;
}

// Material cache to keep draw counts manageable
function useMat(color: string, emissive?: string, emissiveIntensity = 0) {
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        emissive: emissive ?? "#000000",
        emissiveIntensity,
        flatShading: true,
        roughness: 0.85,
        metalness: 0.0,
      }),
    [color, emissive, emissiveIntensity]
  );
}

function Trunk({ height = 0.6, radius = 0.08, color = "#6b4423" }) {
  const mat = useMat(color);
  return (
    <mesh position={[0, height / 2, 0]} material={mat} castShadow>
      <cylinderGeometry args={[radius * 0.85, radius, height, 6]} />
    </mesh>
  );
}

// ---------- Per-species canopies ----------

function OakTree({ stage }: { stage: GrowthStage }) {
  const leaf = useMat("#3b8a3a", stage === "ancient" ? "#8fff7a" : undefined, stage === "ancient" ? 0.25 : 0);
  const s = STAGE_SCALE[stage];
  return (
    <group scale={[s, s, s]}>
      <Trunk height={0.5} radius={0.09} />
      <mesh position={[0, 0.85, 0]} material={leaf} castShadow>
        <icosahedronGeometry args={[0.45, 0]} />
      </mesh>
      <mesh position={[0.22, 0.7, 0.05]} material={leaf} castShadow>
        <icosahedronGeometry args={[0.28, 0]} />
      </mesh>
      <mesh position={[-0.2, 0.72, -0.05]} material={leaf} castShadow>
        <icosahedronGeometry args={[0.3, 0]} />
      </mesh>
    </group>
  );
}

function PineTree({ stage }: { stage: GrowthStage }) {
  const leaf = useMat("#2f6b3a", stage === "ancient" ? "#a0ffa0" : undefined, stage === "ancient" ? 0.2 : 0);
  const s = STAGE_SCALE[stage];
  return (
    <group scale={[s, s, s]}>
      <Trunk height={0.4} radius={0.07} color="#5a3a1f" />
      <mesh position={[0, 0.55, 0]} material={leaf} castShadow>
        <coneGeometry args={[0.4, 0.55, 6]} />
      </mesh>
      <mesh position={[0, 0.85, 0]} material={leaf} castShadow>
        <coneGeometry args={[0.3, 0.45, 6]} />
      </mesh>
      <mesh position={[0, 1.1, 0]} material={leaf} castShadow>
        <coneGeometry args={[0.2, 0.35, 6]} />
      </mesh>
    </group>
  );
}

function SakuraTree({ stage }: { stage: GrowthStage }) {
  const leaf = useMat("#f6b3d4", stage === "ancient" ? "#ffd9ec" : undefined, stage === "ancient" ? 0.3 : 0);
  const s = STAGE_SCALE[stage];
  return (
    <group scale={[s, s, s]}>
      <Trunk height={0.45} radius={0.08} color="#4a2a1a" />
      <mesh position={[0, 0.8, 0]} material={leaf} castShadow>
        <icosahedronGeometry args={[0.42, 0]} />
      </mesh>
      <mesh position={[0.25, 0.7, 0.1]} material={leaf} castShadow>
        <icosahedronGeometry args={[0.25, 0]} />
      </mesh>
      <mesh position={[-0.22, 0.75, -0.08]} material={leaf} castShadow>
        <icosahedronGeometry args={[0.27, 0]} />
      </mesh>
    </group>
  );
}

function MapleTree({ stage }: { stage: GrowthStage }) {
  const leaf = useMat("#d9582b", stage === "ancient" ? "#ffb380" : undefined, stage === "ancient" ? 0.3 : 0);
  const s = STAGE_SCALE[stage];
  return (
    <group scale={[s, s, s]}>
      <Trunk height={0.55} radius={0.1} color="#603418" />
      <mesh position={[0, 0.95, 0]} material={leaf} castShadow>
        <icosahedronGeometry args={[0.5, 0]} />
      </mesh>
      <mesh position={[0.28, 0.78, 0.1]} material={leaf} castShadow>
        <icosahedronGeometry args={[0.3, 0]} />
      </mesh>
    </group>
  );
}

function MangroveTree({ stage }: { stage: GrowthStage }) {
  const leaf = useMat("#2e8b57", stage === "ancient" ? "#9affc7" : undefined, stage === "ancient" ? 0.25 : 0);
  const s = STAGE_SCALE[stage];
  return (
    <group scale={[s, s, s]}>
      <Trunk height={0.7} radius={0.08} color="#3a2415" />
      {/* prop roots */}
      <mesh position={[0.15, 0.1, 0.1]} rotation={[0.4, 0, -0.4]} material={useMat("#3a2415")} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.25, 5]} />
      </mesh>
      <mesh position={[-0.15, 0.1, -0.1]} rotation={[-0.4, 0, 0.4]} material={useMat("#3a2415")} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.25, 5]} />
      </mesh>
      <mesh position={[0, 1.0, 0]} material={leaf} castShadow>
        <icosahedronGeometry args={[0.5, 0]} />
      </mesh>
    </group>
  );
}

function BambooTree({ stage }: { stage: GrowthStage }) {
  const stalk = useMat("#7ab85a", stage === "ancient" ? "#c8ffaa" : undefined, stage === "ancient" ? 0.25 : 0);
  const leaf = useMat("#5fa040");
  const s = STAGE_SCALE[stage];
  return (
    <group scale={[s, s, s]}>
      <mesh position={[-0.08, 0.55, 0]} material={stalk} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.1, 6]} />
      </mesh>
      <mesh position={[0.08, 0.5, 0.05]} material={stalk} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 1.0, 6]} />
      </mesh>
      <mesh position={[0, 0.45, -0.08]} material={stalk} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.9, 6]} />
      </mesh>
      <mesh position={[0, 1.05, 0]} material={leaf} castShadow>
        <icosahedronGeometry args={[0.22, 0]} />
      </mesh>
    </group>
  );
}

function CherryTree({ stage }: { stage: GrowthStage }) {
  const leaf = useMat("#c93a4a", stage === "ancient" ? "#ff95a5" : undefined, stage === "ancient" ? 0.3 : 0);
  const s = STAGE_SCALE[stage];
  return (
    <group scale={[s, s, s]}>
      <Trunk height={0.45} radius={0.08} color="#4d2a18" />
      <mesh position={[0, 0.78, 0]} material={leaf} castShadow>
        <icosahedronGeometry args={[0.4, 0]} />
      </mesh>
      <mesh position={[0.2, 0.65, 0.1]} material={leaf} castShadow>
        <icosahedronGeometry args={[0.24, 0]} />
      </mesh>
    </group>
  );
}

function EucalyptusTree({ stage }: { stage: GrowthStage }) {
  const leaf = useMat("#9ccfa6", stage === "ancient" ? "#d8ffe0" : undefined, stage === "ancient" ? 0.25 : 0);
  const s = STAGE_SCALE[stage];
  return (
    <group scale={[s, s, s]}>
      <Trunk height={0.65} radius={0.07} color="#bfb6a8" />
      <mesh position={[0, 0.95, 0]} material={leaf} castShadow>
        <icosahedronGeometry args={[0.38, 0]} />
      </mesh>
      <mesh position={[0.18, 0.85, 0.05]} material={leaf} castShadow>
        <icosahedronGeometry args={[0.22, 0]} />
      </mesh>
    </group>
  );
}

const TREE_COMPONENTS: Record<TreeKind, React.FC<{ stage: GrowthStage }>> = {
  oak: OakTree,
  pine: PineTree,
  sakura: SakuraTree,
  maple: MapleTree,
  mangrove: MangroveTree,
  bamboo: BambooTree,
  cherry: CherryTree,
  eucalyptus: EucalyptusTree,
};

export function Tree3D({ kind, stage }: TreeProps) {
  const Component = TREE_COMPONENTS[kind];
  if (!Component) return null;
  return <Component stage={stage} />;
}