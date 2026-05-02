import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CompanionId } from "@/lib/game";

// Each companion gets a tiny low-poly mesh that wanders around the forest.

function Butterfly() {
  const wingL = useRef<THREE.Mesh>(null);
  const wingR = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const flap = Math.sin(state.clock.elapsedTime * 12) * 0.7;
    if (wingL.current) wingL.current.rotation.y = flap;
    if (wingR.current) wingR.current.rotation.y = -flap;
  });
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.05, 0.05, 0.15]} />
        <meshStandardMaterial color="#3a2a1a" flatShading />
      </mesh>
      <mesh ref={wingL} position={[0.06, 0, 0]}>
        <boxGeometry args={[0.18, 0.01, 0.14]} />
        <meshStandardMaterial color="#ff7ac6" emissive="#c63a8a" emissiveIntensity={0.3} flatShading transparent opacity={0.9} />
      </mesh>
      <mesh ref={wingR} position={[-0.06, 0, 0]}>
        <boxGeometry args={[0.18, 0.01, 0.14]} />
        <meshStandardMaterial color="#ff7ac6" emissive="#c63a8a" emissiveIntensity={0.3} flatShading transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function Owl() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.18, 6, 6]} />
        <meshStandardMaterial color="#8a6a4a" flatShading />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.13, 6, 6]} />
        <meshStandardMaterial color="#a88a6a" flatShading />
      </mesh>
      <mesh position={[0.05, 0.2, 0.1]}>
        <sphereGeometry args={[0.04, 5, 5]} />
        <meshStandardMaterial color="#fff" emissive="#ffd060" emissiveIntensity={0.4} flatShading />
      </mesh>
      <mesh position={[-0.05, 0.2, 0.1]}>
        <sphereGeometry args={[0.04, 5, 5]} />
        <meshStandardMaterial color="#fff" emissive="#ffd060" emissiveIntensity={0.4} flatShading />
      </mesh>
    </group>
  );
}

function Panda() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.22, 6, 6]} />
        <meshStandardMaterial color="#fff" flatShading />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.16, 6, 6]} />
        <meshStandardMaterial color="#fff" flatShading />
      </mesh>
      <mesh position={[0.1, 0.32, 0.02]}>
        <sphereGeometry args={[0.06, 5, 5]} />
        <meshStandardMaterial color="#222" flatShading />
      </mesh>
      <mesh position={[-0.1, 0.32, 0.02]}>
        <sphereGeometry args={[0.06, 5, 5]} />
        <meshStandardMaterial color="#222" flatShading />
      </mesh>
    </group>
  );
}

function Deer() {
  return (
    <group>
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.18, 0.18, 0.34]} />
        <meshStandardMaterial color="#b87a4a" flatShading />
      </mesh>
      <mesh position={[0, 0.36, 0.18]}>
        <boxGeometry args={[0.12, 0.18, 0.12]} />
        <meshStandardMaterial color="#b87a4a" flatShading />
      </mesh>
      {/* antlers */}
      <mesh position={[0.06, 0.5, 0.18]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.02, 0.14, 4]} />
        <meshStandardMaterial color="#5a3a1a" flatShading />
      </mesh>
      <mesh position={[-0.06, 0.5, 0.18]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.02, 0.14, 4]} />
        <meshStandardMaterial color="#5a3a1a" flatShading />
      </mesh>
    </group>
  );
}

function Fox() {
  return (
    <group>
      <mesh position={[0, 0.14, 0]}>
        <boxGeometry args={[0.14, 0.14, 0.28]} />
        <meshStandardMaterial color="#e87a3a" flatShading />
      </mesh>
      <mesh position={[0, 0.24, 0.16]}>
        <coneGeometry args={[0.08, 0.14, 4]} />
        <meshStandardMaterial color="#e87a3a" flatShading />
      </mesh>
      <mesh position={[0, 0.16, -0.2]} rotation={[0.3, 0, 0]}>
        <coneGeometry args={[0.05, 0.18, 4]} />
        <meshStandardMaterial color="#fff" flatShading />
      </mesh>
    </group>
  );
}

function Frog() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.16, 6, 6]} />
        <meshStandardMaterial color="#5fb04a" flatShading />
      </mesh>
      <mesh position={[0.07, 0.12, 0.08]}>
        <sphereGeometry args={[0.05, 5, 5]} />
        <meshStandardMaterial color="#fff" flatShading />
      </mesh>
      <mesh position={[-0.07, 0.12, 0.08]}>
        <sphereGeometry args={[0.05, 5, 5]} />
        <meshStandardMaterial color="#fff" flatShading />
      </mesh>
    </group>
  );
}

const COMP_MESHES: Record<CompanionId, React.FC> = {
  butterfly: Butterfly,
  owl: Owl,
  panda: Panda,
  deer: Deer,
  fox: Fox,
  frog: Frog,
};

const COMP_HEIGHTS: Record<CompanionId, number> = {
  butterfly: 1.6,
  owl: 1.8,
  panda: 0.3,
  deer: 0.3,
  fox: 0.3,
  frog: 0.2,
};

function WanderingCompanion({ id, areaRadius, seed }: { id: CompanionId; areaRadius: number; seed: number }) {
  const group = useRef<THREE.Group>(null);
  const Mesh = COMP_MESHES[id];
  const height = COMP_HEIGHTS[id];

  // Pre-compute a smooth wander curve via sin/cos
  const params = useMemo(
    () => ({
      ax: 0.4 + (seed % 3) * 0.15,
      az: 0.35 + ((seed + 1) % 4) * 0.12,
      phase: seed,
      speed: 0.2 + (seed % 5) * 0.05,
      bobAmp: id === "butterfly" || id === "owl" ? 0.4 : 0.05,
    }),
    [seed, id]
  );

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime * params.speed + params.phase;
    const x = Math.sin(t) * areaRadius * params.ax;
    const z = Math.cos(t * 1.3) * areaRadius * params.az;
    const y = height + Math.sin(t * 2.5) * params.bobAmp;
    const prevX = group.current.position.x;
    const prevZ = group.current.position.z;
    group.current.position.set(x, y, z);
    // face direction of motion
    const dx = x - prevX;
    const dz = z - prevZ;
    if (dx * dx + dz * dz > 0.0001) {
      group.current.rotation.y = Math.atan2(dx, dz);
    }
  });

  return (
    <group ref={group}>
      <Mesh />
    </group>
  );
}

export function Companions3D({ active, areaRadius }: { active: CompanionId[]; areaRadius: number }) {
  return (
    <>
      {active.map((id, i) => (
        <WanderingCompanion key={`${id}-${i}`} id={id} areaRadius={areaRadius} seed={i * 1.7 + 0.3} />
      ))}
    </>
  );
}
