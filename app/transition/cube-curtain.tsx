"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import type { TransitionPhase } from "@/app/transition/transition-provider";
import ResponsiveCamera from "@/components/Transition/ResponsiveCamera";
import CubeGrid from "@/components/Transition/CubeGrid";
import { PIXELATION } from "@/components/Transition/constants";

type CubeCurtainProps = {
  phase: Exclude<TransitionPhase, "idle">;
  onFilled: () => void;
  onDropped: () => void;
};

export function CubeCurtain({
  phase,
  onFilled,
  onDropped,
}: CubeCurtainProps) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 [&_canvas]:[image-rendering:pixelated]!"
      aria-hidden="true"
    >
      <Canvas
        flat
        orthographic
        dpr={1 / PIXELATION}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
      >
        <ResponsiveCamera />
        <hemisphereLight args={[0xffffff, 0x4a4a5a, 3.6]} />
        <directionalLight position={[3, 4, 6]} intensity={1.8} />
        <directionalLight position={[-4, 1, 3]} intensity={1.4} />
        <directionalLight position={[-2, 3, -5]} intensity={1.3} />
        <directionalLight position={[0, 8, 0]} intensity={1.2} />
        <directionalLight position={[0, -8, 0]} intensity={1.1} />
        <directionalLight position={[5, -3, -2]} intensity={1.0} />
        <directionalLight position={[-5, 3, 2]} intensity={1.0} />
        <Suspense fallback={null}>
          <Physics gravity={[0, -30, 0]} paused={phase !== "dropping"}>
            <CubeGrid
              phase={phase}
              onFilled={onFilled}
              onDropped={onDropped}
            />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
}
