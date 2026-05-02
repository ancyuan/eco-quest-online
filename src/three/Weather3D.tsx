import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Weather } from "@/lib/game";

const SKY_COLORS: Record<Weather, string> = {
  sunny: "#a8d8ea",
  rain: "#5a6878",
  fog: "#c8cfd6",
  storm: "#2a2f3a",
};

const FOG_NEAR: Record<Weather, number> = {
  sunny: 18,
  rain: 14,
  fog: 6,
  storm: 10,
};
const FOG_FAR: Record<Weather, number> = {
  sunny: 45,
  rain: 32,
  fog: 18,
  storm: 24,
};

export function WeatherSky({ weather }: { weather: Weather }) {
  return (
    <>
      <color attach="background" args={[SKY_COLORS[weather]]} />
      <fog attach="fog" args={[SKY_COLORS[weather], FOG_NEAR[weather], FOG_FAR[weather]]} />
    </>
  );
}

export function WeatherLight({ weather }: { weather: Weather }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const baseIntensity =
    weather === "sunny" ? 1.15 : weather === "rain" ? 0.55 : weather === "fog" ? 0.7 : 0.4;
  const ambient =
    weather === "sunny" ? 0.55 : weather === "rain" ? 0.45 : weather === "fog" ? 0.6 : 0.35;
  const lightColor =
    weather === "sunny" ? "#fff4d6" : weather === "rain" ? "#cfd8e3" : weather === "fog" ? "#e6ebef" : "#9aa6b8";

  // Storm lightning flashes
  useFrame((state) => {
    if (!lightRef.current) return;
    if (weather === "storm") {
      // Random flash bursts
      const t = state.clock.elapsedTime;
      const flash = Math.sin(t * 7.3) > 0.985 ? 2.5 : Math.sin(t * 2.1) > 0.97 ? 1.6 : baseIntensity;
      lightRef.current.intensity = flash;
    } else {
      lightRef.current.intensity = baseIntensity;
    }
  });

  return (
    <>
      <ambientLight intensity={ambient} />
      <hemisphereLight args={["#bcd9ff", "#3a5a3a", weather === "sunny" ? 0.45 : 0.3]} />
      <directionalLight
        ref={lightRef}
        position={[6, 10, 4]}
        intensity={baseIntensity}
        color={lightColor}
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
    </>
  );
}

// ---------- Rain particles ----------
export function Rain({ count = 400, area = 14, intensity = 1 }: { count?: number; area?: number; intensity?: number }) {
  const points = useRef<THREE.Points>(null);

  const { positions, speeds } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * area;
      p[i * 3 + 1] = Math.random() * 12;
      p[i * 3 + 2] = (Math.random() - 0.5) * area;
      s[i] = 0.18 + Math.random() * 0.18;
    }
    return { positions: p, speeds: s };
  }, [count, area]);

  useFrame(() => {
    if (!points.current) return;
    const geo = points.current.geometry as THREE.BufferGeometry;
    const arr = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= speeds[i] * intensity * 1.4;
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = 12;
        arr[i * 3] = (Math.random() - 0.5) * area;
        arr[i * 3 + 2] = (Math.random() - 0.5) * area;
      }
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#a8c4dc"
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export function WeatherEffects({ weather, rainCount = 500 }: { weather: Weather; rainCount?: number }) {
  if (rainCount <= 0) return null;
  if (weather === "rain") return <Rain count={rainCount} area={14} intensity={1} />;
  if (weather === "storm") return <Rain count={Math.round(rainCount * 1.6)} area={16} intensity={1.6} />;
  return null;
}
