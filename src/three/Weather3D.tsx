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

// Night sky tint per weather — multiplied/lerped against day color
const NIGHT_COLORS: Record<Weather, string> = {
  sunny: "#0e1530",
  rain: "#0a1020",
  fog: "#1a2030",
  storm: "#05080f",
};

function lerpHexColor(a: string, b: string, t: number): string {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return ca.lerp(cb, t).getStyle();
}

/**
 * dayFactor: 0 = midnight, 1 = noon. Returns smooth value based on local hour.
 */
export function getDayFactor(date = new Date()): number {
  const h = date.getHours() + date.getMinutes() / 60;
  // Smooth sin curve: peak at 13:00, lowest at 01:00
  const phase = ((h - 1) / 24) * Math.PI * 2;
  return Math.max(0, (1 - Math.cos(phase)) / 2);
}

export function WeatherSky({ weather, dayFactor = 1 }: { weather: Weather; dayFactor?: number }) {
  const sky = useMemo(
    () => lerpHexColor(NIGHT_COLORS[weather], SKY_COLORS[weather], dayFactor),
    [weather, dayFactor]
  );
  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, FOG_NEAR[weather], FOG_FAR[weather]]} />
    </>
  );
}

export function WeatherLight({ weather, dayFactor = 1 }: { weather: Weather; dayFactor?: number }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const dayIntensity =
    weather === "sunny" ? 1.15 : weather === "rain" ? 0.55 : weather === "fog" ? 0.7 : 0.4;
  const dayAmbient =
    weather === "sunny" ? 0.55 : weather === "rain" ? 0.45 : weather === "fog" ? 0.6 : 0.35;
  // Night reduces light heavily; moonlight gives a faint blue glow
  const baseIntensity = THREE.MathUtils.lerp(0.15, dayIntensity, dayFactor);
  const ambient = THREE.MathUtils.lerp(0.18, dayAmbient, dayFactor);
  const dayColor =
    weather === "sunny" ? "#fff4d6" : weather === "rain" ? "#cfd8e3" : weather === "fog" ? "#e6ebef" : "#9aa6b8";
  const lightColor = lerpHexColor("#5a6da8", dayColor, dayFactor);
  const sunY = THREE.MathUtils.lerp(2, 10, dayFactor);

  // Storm lightning flashes
  useFrame((state) => {
    if (!lightRef.current) return;
    if (weather === "storm") {
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
      <hemisphereLight args={["#bcd9ff", "#3a5a3a", (weather === "sunny" ? 0.45 : 0.3) * (0.4 + 0.6 * dayFactor)]} />
      <directionalLight
        ref={lightRef}
        position={[6, sunY, 4]}
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
