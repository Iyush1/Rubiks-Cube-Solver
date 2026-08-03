"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

function TestPiece({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  const model = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={model} />;
}

const TEST_PATHS = [
  "/Rubik/edges/yo_edge.glb",
  "/Rubik/corners/wog_corner.glb",
  "/Rubik/center/o_center.glb",
];

export default function PivotTestPage() {
  return (
    <div className="h-screen w-screen bg-neutral-900">
      <Canvas camera={{ position: [8, 6, 10], fov: 45 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[3, 4, 6]} intensity={1.5} />
        <axesHelper args={[3]} />
        <gridHelper args={[10, 10]} />

        <Suspense fallback={null}>
          {TEST_PATHS.map((path) => (
            <TestPiece key={path} path={path} />
          ))}
        </Suspense>

        <OrbitControls />
      </Canvas>
    </div>
  );
}