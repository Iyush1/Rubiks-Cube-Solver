"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  RigidBody,
  type RapierRigidBody,
} from "@react-three/rapier";
import * as THREE from "three";
import type { TransitionPhase } from "@/app/transition/transition-provider";
import type { GridCube } from "@/utils/createGrid";
import seededRandom from "@/utils/seedRandom";
import { FILL_DURATION } from "@/components/Transition/constants";

type CurtainCubeProps = {
  cube: GridCube;
  phase: Exclude<TransitionPhase, "idle">;
  model: THREE.Object3D;
  modelPosition: [number, number, number];
  modelScale: number;
  modelSize: number;
};

export default function CurtainCube({
  cube,
  phase,
  model,
  modelPosition,
  modelScale,
  modelSize,
}: CurtainCubeProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const visualRef = useRef<THREE.Group>(null);
  const fillElapsed = useRef(0);
  const modelInstance = useMemo(() => model.clone(true), [model]);

  useEffect(() => {
    if (phase !== "dropping" || !bodyRef.current) {
      return;
    }

    const horizontal = seededRandom(cube.seed) * 9 - 4.5;
    const depth = seededRandom(cube.seed + 1) * 6 - 3;
    const lift = seededRandom(cube.seed + 2) * 3;

    bodyRef.current.applyImpulse(
      { x: horizontal, y: lift, z: depth },
      true,
    );
    bodyRef.current.applyTorqueImpulse(
      {
        x: seededRandom(cube.seed + 3) * 12 - 6,
        y: seededRandom(cube.seed + 4) * 12 - 6,
        z: seededRandom(cube.seed + 5) * 12 - 6,
      },
      true,
    );
  }, [cube.seed, phase]);

  useFrame((_, delta) => {
    const visual = visualRef.current;

    if (!visual || phase !== "filling") {
      return;
    }

    fillElapsed.current += Math.min(delta, 0.05);
    const progress = Math.max(
      0,
      Math.min(1, (fillElapsed.current - cube.delay) / FILL_DURATION),
    );
    const eased = 1 - Math.pow(1 - progress, 3);
    visual.scale.setScalar(Math.max(0.001, eased));
  });

  return (
    <RigidBody
      ref={bodyRef}
      position={cube.position}
      colliders={false}
      friction={0.7}
      restitution={0.25}
      linearDamping={0.08}
      angularDamping={0.12}
    >
      <CuboidCollider args={[modelSize / 2, modelSize / 2, modelSize / 2]} />
      <group ref={visualRef} scale={phase === "filling" ? 0.001 : 1}>
        <group rotation={cube.rotation}>
          <primitive
            object={modelInstance}
            position={modelPosition}
            scale={modelScale}
          />
        </group>
      </group>
    </RigidBody>
  );
}
