"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { applyPieceTransform } from "@/utils/cubeGeometry";
import {
  FACE_NORMAL,
  piecesOnFace,
  turnAngle,
  type Face,
  type SimCubeState,
} from "@/utils/simCubeState";
import { applyTurnToState } from "@/utils/turnFace";

export type TurnRequest = { face: Face; quarterTurns: number };

type TurningPiece = { id: string; anchor: THREE.Object3D };

type Animation = {
  face: Face;
  quarterTurns: number;
  pivot: THREE.Group;
  pieces: TurningPiece[];
  startTime: number;
  duration: number;
  targetAngle: number;
};

const MS_PER_QUARTER_TURN = 220;

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

export function applyStateToScene(
  state: SimCubeState,
  anchors: Map<string, THREE.Object3D>,
  cellSize: number,
) {
  for (const piece of Object.values(state)) {
    const anchor = anchors.get(piece.id);
    if (anchor) applyPieceTransform(anchor, piece, cellSize);
  }
}

type Options = {
  cubeRootRef: RefObject<THREE.Group | null>;
  anchorsRef: RefObject<Map<string, THREE.Object3D>>;
  /** Authoritative cube state. The controller advances it in place. */
  stateRef: RefObject<SimCubeState>;
  /**
   * Notified after each turn. Deliberately not a React setState that feeds back
   * into this component's props: re-rendering the scene on every turn makes
   * EffectComposer rebuild its passes, which flashes.
   */
  onStateChange: (state: SimCubeState) => void;
  cellSize: number;
  ready: boolean;
};

/**
 * Drives layer turns. Affected anchors are re-parented to a pivot at the cube
 * root's origin (the center cell), rotated, then handed back to the root with
 * transforms written from state.
 */
export function useCubeController({
  cubeRootRef,
  anchorsRef,
  stateRef,
  onStateChange,
  cellSize,
  ready,
}: Options) {
  const queueRef = useRef<TurnRequest[]>([]);
  const animationRef = useRef<Animation | null>(null);

  const finishTurn = useCallback(
    (animation: Animation) => {
      const root = cubeRootRef.current;
      if (!root) return;

      const nextState = applyTurnToState(
        stateRef.current,
        animation.face,
        animation.quarterTurns,
      );

      // Snap to exact state-derived transforms rather than keeping the
      // animated float values, so long sequences cannot accumulate drift.
      for (const { id, anchor } of animation.pieces) {
        root.add(anchor);
        applyPieceTransform(anchor, nextState[id], cellSize);
      }
      animation.pivot.removeFromParent();

      // Update the ref synchronously: a queued follow-up turn reads it this
      // same frame and would otherwise select the pre-turn layer.
      stateRef.current = nextState;
      animationRef.current = null;
      onStateChange(nextState);
    },
    [cellSize, cubeRootRef, onStateChange, stateRef],
  );

  const startNextTurn = useCallback(() => {
    if (animationRef.current || !ready) return;

    const root = cubeRootRef.current;
    if (!root) return;

    const next = queueRef.current.shift();
    if (!next) return;

    const pieces: TurningPiece[] = [];
    for (const id of piecesOnFace(stateRef.current, next.face)) {
      const anchor = anchorsRef.current.get(id);
      if (anchor) pieces.push({ id, anchor });
    }
    if (pieces.length === 0) return;

    const pivot = new THREE.Group();
    pivot.name = "turn-pivot";
    root.add(pivot);
    for (const { anchor } of pieces) pivot.attach(anchor);

    animationRef.current = {
      face: next.face,
      quarterTurns: next.quarterTurns,
      pivot,
      pieces,
      startTime: performance.now(),
      duration: MS_PER_QUARTER_TURN * Math.abs(next.quarterTurns),
      targetAngle: turnAngle(next.quarterTurns),
    };
  }, [anchorsRef, cubeRootRef, ready, stateRef]);

  const requestTurn = useCallback(
    (face: Face, quarterTurns: number) => {
      queueRef.current.push({ face, quarterTurns });
      startNextTurn();
    },
    [startNextTurn],
  );

  useFrame(() => {
    const animation = animationRef.current;
    if (!animation) {
      startNextTurn();
      return;
    }

    const t = Math.min(
      1,
      (performance.now() - animation.startTime) / animation.duration,
    );

    animation.pivot.quaternion.setFromAxisAngle(
      FACE_NORMAL[animation.face],
      animation.targetAngle * easeOutCubic(t),
    );

    if (t >= 1) {
      finishTurn(animation);
      startNextTurn();
    }
  });

  useEffect(() => {
    if (ready) startNextTurn();
  }, [ready, startNextTurn]);

  return { requestTurn };
}
