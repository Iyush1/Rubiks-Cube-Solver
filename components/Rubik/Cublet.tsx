"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { CubePiece, snapPieceTransform } from "@/utils/cubeGeometry";

export function Cubelet({ piece, cellSize }: { piece: CubePiece; cellSize: number }) {
  const { scene } = useGLTF(piece.file);
  const model = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    snapPieceTransform(model, cellSize);
  }, [model, cellSize]);

  return <primitive object={model} />;
}