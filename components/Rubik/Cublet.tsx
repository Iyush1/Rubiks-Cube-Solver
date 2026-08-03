"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  measurePiece,
  type CubePiece,
  type PieceMeasurement,
} from "@/utils/cubeGeometry";

export type CubeletReady = {
  anchor: THREE.Object3D;
  model: THREE.Object3D;
  measurement: PieceMeasurement;
};

type CubeletProps = {
  piece: CubePiece;
  onReady: (id: string, ready: CubeletReady) => void;
};

/**
 * One piece as two nested objects:
 *
 *   anchor — origin is the piece's true center; its transform is written purely
 *            from cube state, and it is what layer turns re-parent.
 *   model  — the GLB, held at a fixed offset and rotation that cancel how it
 *            was authored.
 *
 * This only measures. Both the model correction and the anchor placement need
 * cube-wide numbers (cell size and centroid) that cannot be known until all 26
 * pieces have loaded, so the parent applies them. Until then the pieces simply
 * render where the GLBs put them, which is already an assembled cube.
 */
export function Cubelet({ piece, onReady }: CubeletProps) {
  const { scene } = useGLTF(piece.file);
  const model = useMemo(() => scene.clone(true), [scene]);
  const anchorRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    onReady(piece.id, {
      anchor,
      model,
      measurement: measurePiece(model, anchor),
    });
  }, [model, piece.id, onReady]);

  return (
    <group ref={anchorRef} name={`anchor-${piece.id}`}>
      <primitive object={model} />
    </group>
  );
}
