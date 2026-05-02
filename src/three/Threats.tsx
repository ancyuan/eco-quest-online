import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ThreatKind } from "@/lib/game";

// ---------- Fire ----------
function Fire() {
  const group = useRef<THREE.Group>(null);
  const flames = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        offset: (i / 5) * Math.PI * 2,
        radius: 0.05 + Math.random() * 0.08,
        speed: 0.8 + Math.random() * 0.6,
      })),
    []
  );
  useFrame((state) => {
    if (!group.current) return;
    group.current.children.forEach((child, i) => {
      const f = flames[i];
      if (!f) return;
      const t = state.clock.elapsedTime * f.speed + f.offset;
      const m = child as THREE.Mesh;
      m.position.y = 0.4 + ((t * 0.6) % 0.8);
      m.scale.setScalar(0.9 + Math.sin(t * 4) * 0.2);
    });
  });
  return (
    <group ref={group} position={[0, 0.1, 0]}>
      {flames.map((f, i) => (
        <mesh key={i} position={[Math.cos(f.offset) * f.radius, 0.4, Math.sin(f.offset) * f.radius]}>
          <coneGeometry args={[0.1, 0.25, 5]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? "#ff8c2a" : "#ffd54a"}
            emissive={i % 2 === 0 ? "#ff5500" : "#ffaa00"}
            emissiveIntensity={1.2}
            flatShading
            transparent
            opacity={0.92}
          />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Logger (axe swinging) ----------
function Logger() {
  const axe = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!axe.current) return;
    axe.current.rotation.z = Math.sin(state.clock.elapsedTime * 4) * 0.6 - 0.2;
  });
  return (
    <group position={[0.4, 0.4, 0.1]}>
      {/* Body - cube */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.18, 0.3, 0.14]} />
        <meshStandardMaterial color="#5a4030" flatShading />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.14, 0.14, 0.14]} />
        <meshStandardMaterial color="#e8c7a0" flatShading />
      </mesh>
      {/* Axe arm + axe head */}
      <group ref={axe} position={[0.1, 0.3, 0]}>
        <mesh position={[0.15, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 5]} />
          <meshStandardMaterial color="#8b5a2b" flatShading />
        </mesh>
        <mesh position={[0.3, 0.05, 0]}>
          <boxGeometry args={[0.1, 0.14, 0.05]} />
          <meshStandardMaterial color="#9aa3ad" emissive="#444" emissiveIntensity={0.2} flatShading metalness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

// ---------- Pest (small bugs orbiting) ----------
function Pest() {
  const group = useRef<THREE.Group>(null);
  const bugs = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        offset: (i / 4) * Math.PI * 2,
        radius: 0.35 + (i % 2) * 0.1,
        height: 0.4 + (i % 2) * 0.3,
        speed: 1.2 + i * 0.3,
      })),
    []
  );
  useFrame((state) => {
    if (!group.current) return;
    group.current.children.forEach((child, i) => {
      const b = bugs[i];
      if (!b) return;
      const t = state.clock.elapsedTime * b.speed + b.offset;
      child.position.x = Math.cos(t) * b.radius;
      child.position.z = Math.sin(t) * b.radius;
      child.position.y = b.height + Math.sin(t * 2) * 0.08;
    });
  });
  return (
    <group ref={group}>
      {bugs.map((_, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.08, 0.06, 0.08]} />
          <meshStandardMaterial color="#6a8e2a" emissive="#3a5a10" emissiveIntensity={0.3} flatShading />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Countdown ring ----------
function CountdownRing({ progress }: { progress: number }) {
  // progress: 0 (just spawned) → 1 (about to expire)
  const color = progress > 0.7 ? "#ff3030" : progress > 0.4 ? "#ffaa30" : "#ffe060";
  const angle = (1 - progress) * Math.PI * 2;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
      <ringGeometry args={[0.45, 0.55, 24, 1, 0, angle]} />
      <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.85} />
    </mesh>
  );
}

interface ThreatMeshProps {
  kind: ThreatKind;
  expiresAt?: number;
  windowMs: number;
}

export function ThreatMesh({ kind, expiresAt, windowMs }: ThreatMeshProps) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current || !expiresAt) return;
    const remaining = Math.max(0, expiresAt - Date.now());
    const progress = 1 - remaining / windowMs;
    // Stash on userData so child reads it; simpler: re-render via key would cost more
    (ref.current.userData as { progress?: number }).progress = progress;
  });
  const initialProgress =
    expiresAt && windowMs > 0 ? Math.max(0, Math.min(1, 1 - (expiresAt - Date.now()) / windowMs)) : 0;
  return (
    <group ref={ref}>
      <CountdownRing progress={initialProgress} />
      {kind === "fire" && <Fire />}
      {kind === "logger" && <Logger />}
      {kind === "pest" && <Pest />}
    </group>
  );
}
