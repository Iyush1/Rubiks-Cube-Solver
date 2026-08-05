"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { applyPieceTransform } from "@/utils/cubeGeometry";
import {
  applyWholeCubeRotation,
  AXIS_NORMAL,
  movesToNextTopCenter,
  type CubeAxis,
} from "@/utils/cubeOrientation";
import {
  FACE_NORMAL,
  piecesOnFace,
  turnAngle,
  type Face,
  type SimCubeState,
} from "@/utils/simCubeState";
import { applyTurnToState } from "@/utils/turnFace";

export type FaceTurnRequest = {
  kind: "face";
  face: Face;
  quarterTurns: number;
};

export type WholeCubeTurnRequest = {
  kind: "cube";
  axis: CubeAxis;
  quarterTurns: number;
};

export type TurnRequest = FaceTurnRequest | WholeCubeTurnRequest;

type TurningPiece = { id: string; anchor: THREE.Object3D };

type Animation = {
  request: TurnRequest;
  pivot: THREE.Group;
  pieces: TurningPiece[];
  startTime: number;
  duration: number;
  targetAngle: number;
  axis: THREE.Vector3;
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

export type CubeControllerApi = {
  requestTurn: (face: Face, quarterTurns: number) => void;
  requestWholeCubeTurn: (axis: CubeAxis, quarterTurns: number) => void;
  /** Yellow up if it isn't; white up once yellow already is. */
  requestToggleTopCenter: () => void;
  getState: () => SimCubeState;
};

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
 * Drives layer turns and whole-cube spins. Affected anchors are re-parented to
 * a pivot at the cube root's origin, rotated, then handed back with transforms
 * written from state.
 */
export function useCubeController({
  cubeRootRef,
  anchorsRef,
  stateRef,
  onStateChange,
  cellSize,
  ready,
}: Options): CubeControllerApi {
  const queueRef = useRef<TurnRequest[]>([]);
  const animationRef = useRef<Animation | null>(null);

  const finishTurn = useCallback(
    (animation: Animation) => {
      const root = cubeRootRef.current;
      if (!root) return;

      const nextState =
        animation.request.kind === "face"
          ? applyTurnToState(
              stateRef.current,
              animation.request.face,
              animation.request.quarterTurns,
            )
          : applyWholeCubeRotation(
              stateRef.current,
              animation.request.axis,
              animation.request.quarterTurns,
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
    if (next.kind === "face") {
      for (const id of piecesOnFace(stateRef.current, next.face)) {
        const anchor = anchorsRef.current.get(id);
        if (anchor) pieces.push({ id, anchor });
      }
    } else {
      for (const [id, anchor] of anchorsRef.current) {
        pieces.push({ id, anchor });
      }
    }
    if (pieces.length === 0) return;

    const pivot = new THREE.Group();
    pivot.name = next.kind === "face" ? "turn-pivot" : "cube-pivot";
    root.add(pivot);
    for (const { anchor } of pieces) pivot.attach(anchor);

    const axis =
      next.kind === "face" ? FACE_NORMAL[next.face] : AXIS_NORMAL[next.axis];

    animationRef.current = {
      request: next,
      pivot,
      pieces,
      startTime: performance.now(),
      duration: MS_PER_QUARTER_TURN * Math.abs(next.quarterTurns),
      targetAngle: turnAngle(next.quarterTurns),
      axis,
    };
  }, [anchorsRef, cubeRootRef, ready, stateRef]);

  const enqueue = useCallback(
    (request: TurnRequest) => {
      queueRef.current.push(request);
      startNextTurn();
    },
    [startNextTurn],
  );

  const requestTurn = useCallback(
    (face: Face, quarterTurns: number) => {
      enqueue({ kind: "face", face, quarterTurns });
    },
    [enqueue],
  );

  const requestWholeCubeTurn = useCallback(
    (axis: CubeAxis, quarterTurns: number) => {
      enqueue({ kind: "cube", axis, quarterTurns });
    },
    [enqueue],
  );

  const requestToggleTopCenter = useCallback(() => {
    // Project through the in-flight turn (stateRef is still pre-finish) then
    // anything already queued, so we append the flip/orient path after.
    let projected = stateRef.current;
    const current = animationRef.current;
    if (current) {
      projected =
        current.request.kind === "face"
          ? applyTurnToState(
              projected,
              current.request.face,
              current.request.quarterTurns,
            )
          : applyWholeCubeRotation(
              projected,
              current.request.axis,
              current.request.quarterTurns,
            );
    }
    for (const pending of queueRef.current) {
      projected =
        pending.kind === "face"
          ? applyTurnToState(projected, pending.face, pending.quarterTurns)
          : applyWholeCubeRotation(
              projected,
              pending.axis,
              pending.quarterTurns,
            );
    }

    for (const move of movesToNextTopCenter(projected)) {
      queueRef.current.push({
        kind: "cube",
        axis: move.axis,
        quarterTurns: move.quarterTurns,
      });
    }
    startNextTurn();
  }, [startNextTurn, stateRef]);

  const getState = useCallback(() => stateRef.current, [stateRef]);

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
      animation.axis,
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

  return useMemo(
    () => ({
      requestTurn,
      requestWholeCubeTurn,
      requestToggleTopCenter,
      getState,
    }),
    [requestTurn, requestWholeCubeTurn, requestToggleTopCenter, getState],
  );
}
