"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Center,
  Bounds,
  OrbitControls,
  Environment,
  SoftShadows,
} from "@react-three/drei";
import { EffectComposer, N8AO, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { PIECE_MANIFEST } from "@/utils/cubeGeometry";
import { Cubelet } from "./Cublet";
import { usePageTransition } from "@/app/transition/transition-provider";

const CELL_SIZE = 1.02; // confirm this matches your real measured spacing
const PIXELATION = 3; // 1 = normal resolution, higher = chunkier pixels

export function RubiksCube() {
    const { go } = usePageTransition();
  return (
    <div className="h-[70vh] w-full flex flex-col gap-y-8">
      <Canvas
        shadows
        dpr={1 / PIXELATION}
        camera={{ fov: 35 }}
        className="[image-rendering:pixelated]"
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.5,
        }}
      >
        {/* Approximates Eevee's PCSS-style soft shadows instead of Three's
            default hard-edged shadow maps. */}

        {/* Image-based lighting — gives PBR materials something realistic to
            reflect, which is what Blender's viewport/render was giving you
            for free. This does most of the "soft ambient" work now. */}
        <Environment preset="studio" />

        {/* Small amount of direct light left for a defined key highlight /
            shadow direction — trimmed down from 7 lights now that the
            environment map handles ambient fill. Add more back only if it
            still looks flat with Environment in place. */}
        <hemisphereLight args={[0xffffff, 0x4a4a5a, 0.5]} />
        <directionalLight
          castShadow
          position={[3, 4, 6]}
          intensity={0.1}
          shadow-mapSize={[2048, 2048]}
        />

        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.2} maxDuration={0}>
            <Center>
              {PIECE_MANIFEST.map((piece) => (
                <Cubelet key={piece.id} piece={piece} cellSize={CELL_SIZE} />
              ))}
            </Center>
          </Bounds>
        </Suspense>

        {/* Screen-space postprocessing: AO closes contact shadows between
            cubelets (biggest single factor in matching Eevee's grounded
            look), Bloom softens bright highlights the way Eevee does by
            default. */}
        <EffectComposer>
          <N8AO aoRadius={0.4} intensity={1.5} />
        </EffectComposer>

        <OrbitControls enablePan={false} minDistance={20} maxDistance={36} />
      </Canvas>
      <button
            type="button"
            className="cursor-pointer border-0 bg-transparent font-(family-name:--font-press-start) text-[clamp(0.5rem,1.6vw,0.8rem)] uppercase text-foreground [text-shadow:3px_3px_0_var(--prompt-shadow)] focus-visible:outline-4 focus-visible:outline-offset-8 focus-visible:outline-foreground"
            onClick={() => go("/skill-select")}
          >
            Back
          </button>
    </div>
  );
}