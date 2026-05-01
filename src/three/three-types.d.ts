// R3F v9 + React 19: register three.js intrinsic JSX elements.
// Without this, `<mesh>`, `<group>`, `<meshStandardMaterial>` etc. are unknown to TS.
import type { ThreeElements } from "@react-three/fiber";

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
    }
  }
}

export {};