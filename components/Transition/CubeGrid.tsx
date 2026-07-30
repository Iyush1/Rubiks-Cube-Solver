"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { TransitionPhase } from "@/app/transition/transition-provider";
import createGrid, { CELL_SIZE } from "@/utils/createGrid";
import CurtainCube from "@/components/Transition/CurtainCube";
import {
  DROP_DURATION,
  FILL_DURATION,
  MODEL_PATH,
} from "@/components/Transition/constants";

type CubeGridProps = {
  phase: Exclude<TransitionPhase, "idle">;
  onFilled: () => void;
  onDropped: () => void;
};

export default function CubeGrid({
  phase,
  onFilled,
  onDropped,
}: CubeGridProps) {
  const { size } = useThree();
  const { scene: cubeModel } = useGLTF(MODEL_PATH);
  const modelSize = CELL_SIZE;
  const modelTransform = useMemo(() => {
    cubeModel.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(cubeModel);
    const center = bounds.getCenter(new THREE.Vector3());
    const dimensions = bounds.getSize(new THREE.Vector3());
    const largestDimension = Math.max(
      dimensions.x,
      dimensions.y,
      dimensions.z,
    );
    const scale = largestDimension > 0 ? modelSize / largestDimension : 1;

    return {
      scale,
      position: [
        -center.x * scale,
        -center.y * scale,
        -center.z * scale,
      ] as [number, number, number],
    };
  }, [cubeModel, modelSize]);
  const grid = useMemo(() => createGrid(size.width / size.height), [
    size.width,
    size.height,
  ]);
  const longestDelay = grid.at(-1)?.delay ?? 0;
  const elapsed = useRef(0);
  const completed = useRef(false);

  useEffect(() => {
    elapsed.current = 0;
    completed.current = false;
  }, [phase]);

  useFrame((_, delta) => {
    if (completed.current) {
      return;
    }

    elapsed.current += Math.min(delta, 0.05);

    if (
      phase === "filling" &&
      elapsed.current >= longestDelay + FILL_DURATION
    ) {
      completed.current = true;
      onFilled();
    }

    if (phase === "dropping" && elapsed.current >= DROP_DURATION) {
      completed.current = true;
      onDropped();
    }
  });

  return grid.map((cube) => (
    <CurtainCube
      key={cube.key}
      cube={cube}
      phase={phase}
      model={cubeModel}
      modelPosition={modelTransform.position}
      modelScale={modelTransform.scale}
      modelSize={modelSize}
    />
  ));
}

useGLTF.preload(MODEL_PATH);
