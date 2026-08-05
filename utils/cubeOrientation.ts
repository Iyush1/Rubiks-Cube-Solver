import * as THREE from "three";
import {
  FACE_NORMAL,
  rotateGridPos,
  rotateQuaternion,
  stickerDirection,
  type Face,
  type SimCubeState,
} from "@/utils/simCubeState";

/** Whole-cube spin axes — same normals as R / U / F face turns. */
export type CubeAxis = "x" | "y" | "z";

export type WholeCubeMove = { axis: CubeAxis; quarterTurns: number };

/** Axis normals match FACE_NORMAL for R, U, F so turn math stays shared. */
export const AXIS_NORMAL: Record<CubeAxis, THREE.Vector3> = {
  x: FACE_NORMAL.R,
  y: FACE_NORMAL.U,
  z: FACE_NORMAL.F,
};

const AXIS_AS_FACE: Record<CubeAxis, Face> = {
  x: "R",
  y: "U",
  z: "F",
};

/** White edges that form the daisy petals around yellow. */
export const WHITE_EDGE_IDS = ["wg", "wb", "wr", "wo"] as const;

export type SignedAxis = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";

/**
 * Rotate every piece about the cube center. Same CW convention as face turns
 * (quarterTurns: 1 = CW looking along +axis).
 */
export function applyWholeCubeRotation(
  state: SimCubeState,
  axis: CubeAxis,
  quarterTurns: number,
): SimCubeState {
  if (quarterTurns % 4 === 0) return state;

  const face = AXIS_AS_FACE[axis];
  const next: SimCubeState = {};
  for (const piece of Object.values(state)) {
    next[piece.id] = {
      id: piece.id,
      gridPos: rotateGridPos(piece.gridPos, face, quarterTurns),
      quaternion: rotateQuaternion(piece.quaternion, face, quarterTurns),
    };
  }
  return next;
}

/** Snap a direction to the nearest signed world axis. */
export function nearestSignedAxis(dir: THREE.Vector3): SignedAxis {
  const ax = Math.abs(dir.x);
  const ay = Math.abs(dir.y);
  const az = Math.abs(dir.z);
  if (ax >= ay && ax >= az) return dir.x >= 0 ? "+x" : "-x";
  if (ay >= az) return dir.y >= 0 ? "+y" : "-y";
  return dir.z >= 0 ? "+z" : "-z";
}

export type TopCenterColor = "y" | "w";

/** Which world axis a center sticker currently faces. */
export function centerFacingAxis(
  state: SimCubeState,
  color: TopCenterColor,
): SignedAxis {
  const center = state[color];
  if (!center) return color === "y" ? "-y" : "+y";
  return nearestSignedAxis(stickerDirection(center, color));
}

/** Which world axis the yellow center sticker currently faces. */
export function yellowFacingAxis(state: SimCubeState): SignedAxis {
  return centerFacingAxis(state, "y");
}

export function isYellowOnTop(state: SimCubeState): boolean {
  return centerFacingAxis(state, "y") === "+y";
}

export function isWhiteOnTop(state: SimCubeState): boolean {
  return centerFacingAxis(state, "w") === "+y";
}

/**
 * Shortest whole-cube moves that put the given center sticker on +Y.
 * At most one 180° or one 90° turn — centers only ever face a cardinal axis.
 */
export function movesToCenterOnTop(
  state: SimCubeState,
  color: TopCenterColor,
): WholeCubeMove[] {
  switch (centerFacingAxis(state, color)) {
    case "+y":
      return [];
    case "-y":
      return [{ axis: "x", quarterTurns: 2 }];
    case "+x":
      return [{ axis: "z", quarterTurns: -1 }];
    case "-x":
      return [{ axis: "z", quarterTurns: 1 }];
    case "+z":
      return [{ axis: "x", quarterTurns: 1 }];
    case "-z":
      return [{ axis: "x", quarterTurns: -1 }];
  }
}

/** Shortest whole-cube moves that put the yellow center sticker on +Y. */
export function movesToYellowOnTop(state: SimCubeState): WholeCubeMove[] {
  return movesToCenterOnTop(state, "y");
}

/** Shortest whole-cube moves that put the white center sticker on +Y. */
export function movesToWhiteOnTop(state: SimCubeState): WholeCubeMove[] {
  return movesToCenterOnTop(state, "w");
}

/**
 * Daisy hold toggles: yellow up when it isn't; white up once yellow already is
 * (flip for white-cross after daisy).
 */
export function nextTopCenterTarget(state: SimCubeState): TopCenterColor {
  return isYellowOnTop(state) ? "w" : "y";
}

export function movesToNextTopCenter(state: SimCubeState): WholeCubeMove[] {
  return movesToCenterOnTop(state, nextTopCenterTarget(state));
}

export function topCenterButtonLabel(state: SimCubeState): string {
  return isYellowOnTop(state) ? "White on top" : "Yellow on top";
}

/** True when a white edge sits on the U layer with white facing up. */
export function isDaisyPetal(state: SimCubeState, edgeId: string): boolean {
  const piece = state[edgeId];
  if (!piece || piece.gridPos[1] !== 1) return false;
  const whiteUp = stickerDirection(piece, "w");
  return whiteUp.distanceToSquared(FACE_NORMAL.U) < 1e-6;
}

export function daisyPetalCount(state: SimCubeState): number {
  return WHITE_EDGE_IDS.filter((id) => isDaisyPetal(state, id)).length;
}

export function isDaisyComplete(state: SimCubeState): boolean {
  return isYellowOnTop(state) && daisyPetalCount(state) === 4;
}

/** First white edge that is not yet a daisy petal (for a simple next-hint). */
export function nextDaisyEdgeId(state: SimCubeState): string | null {
  if (!isYellowOnTop(state)) return null;
  for (const id of WHITE_EDGE_IDS) {
    if (!isDaisyPetal(state, id)) return id;
  }
  return null;
}

/**
 * Beginner instruction text for the current scramble, assuming the daisy
 * method (yellow on top first).
 */
export function beginnerDaisyInstruction(state: SimCubeState): string {
  if (!isYellowOnTop(state)) {
    return "First: put yellow on top (use the Yellow on top button).";
  }

  if (isDaisyComplete(state)) {
    return "Daisy complete. Next: put white on top (use the White on top button), then make the white cross.";
  }

  if (isWhiteOnTop(state)) {
    return "White is on top. Make the white cross, matching edge colors to the side centers.";
  }

  const petals = daisyPetalCount(state);
  const next = nextDaisyEdgeId(state);
  const remaining = 4 - petals;

  if (next) {
    return `Daisy: ${petals}/4 white petals up. Bring the next white edge (${next.toUpperCase()}) onto the top with white facing up — ${remaining} left.`;
  }

  return `Daisy: ${petals}/4 white petals up.`;
}
