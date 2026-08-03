import * as THREE from "three";
import {
  COLOR_DIRECTION,
  PIECE_MANIFEST,
  type Color,
} from "@/utils/cubeGeometry";

export type Face = "U" | "D" | "L" | "R" | "F" | "B";
export type GridPos = [number, number, number];
export type Quat = [number, number, number, number]; // x, y, z, w

export type PieceRuntime = {
  id: string;
  gridPos: GridPos;
  quaternion: Quat;
};

/**
 * Logical cube: where every piece sits and how it is oriented. This is the
 * single source of truth — scene objects are written from it, never read back.
 *
 * Named SimCubeState to stay distinct from `CubeState` in utils/cubeColors.ts,
 * which is the flat 2D sticker net used by the beginner picker.
 */
export type SimCubeState = Record<string, PieceRuntime>;

export const FACES: Face[] = ["U", "D", "L", "R", "F", "B"];

/** Outward normal of each face. Mirrors the center colors in COLOR_DIRECTION. */
export const FACE_NORMAL: Record<Face, THREE.Vector3> = {
  U: new THREE.Vector3(0, 1, 0),
  D: new THREE.Vector3(0, -1, 0),
  L: new THREE.Vector3(-1, 0, 0),
  R: new THREE.Vector3(1, 0, 0),
  F: new THREE.Vector3(0, 0, 1),
  B: new THREE.Vector3(0, 0, -1),
};

/**
 * A standard clockwise-when-facing-you quarter turn is -90 degrees about the
 * face's outward normal under the right-hand rule. The state permutation and
 * the pivot animation both derive from this, so they cannot disagree.
 */
export const QUARTER_TURN_ANGLE = -Math.PI / 2;

/** quarterTurns: 1 = R, -1 = R', 2 = R2. */
export function turnAngle(quarterTurns: number): number {
  return QUARTER_TURN_ANGLE * quarterTurns;
}

/** Each piece's solved cell is the sum of its sticker directions. */
export function homeGridPos(colors: Color[]): GridPos {
  const v = new THREE.Vector3();
  for (const color of colors) v.add(COLOR_DIRECTION[color]);
  return [Math.round(v.x), Math.round(v.y), Math.round(v.z)];
}

export function createSolvedState(): SimCubeState {
  const state: SimCubeState = {};
  for (const piece of PIECE_MANIFEST) {
    state[piece.id] = {
      id: piece.id,
      gridPos: homeGridPos(piece.colors),
      quaternion: [0, 0, 0, 1],
    };
  }
  return state;
}

export function rotateGridPos(
  pos: GridPos,
  face: Face,
  quarterTurns: number,
): GridPos {
  const v = new THREE.Vector3(pos[0], pos[1], pos[2]);
  v.applyAxisAngle(FACE_NORMAL[face], turnAngle(quarterTurns));
  return [Math.round(v.x), Math.round(v.y), Math.round(v.z)];
}

export function rotateQuaternion(
  quat: Quat,
  face: Face,
  quarterTurns: number,
): Quat {
  const delta = new THREE.Quaternion().setFromAxisAngle(
    FACE_NORMAL[face],
    turnAngle(quarterTurns),
  );
  const current = new THREE.Quaternion(quat[0], quat[1], quat[2], quat[3]);
  delta.multiply(current);
  return [delta.x, delta.y, delta.z, delta.w];
}

/** The 9 pieces whose cell lies on `face`. */
export function piecesOnFace(state: SimCubeState, face: Face): string[] {
  const n = FACE_NORMAL[face];
  return Object.values(state)
    .filter(
      (p) => p.gridPos[0] * n.x + p.gridPos[1] * n.y + p.gridPos[2] * n.z === 1,
    )
    .map((p) => p.id);
}

export function gridPosEqual(a: GridPos, b: GridPos): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

/** Direction a piece's given sticker currently faces. */
export function stickerDirection(
  piece: PieceRuntime,
  color: Color,
): THREE.Vector3 {
  const q = new THREE.Quaternion(
    piece.quaternion[0],
    piece.quaternion[1],
    piece.quaternion[2],
    piece.quaternion[3],
  );
  return COLOR_DIRECTION[color].clone().applyQuaternion(q);
}

/**
 * Solved when every piece is home and every sticker points at its own face.
 *
 * Comparing sticker directions rather than raw quaternion components sidesteps
 * quaternion double-cover, and lets a center spun about its own axis still
 * count as solved — which matches what the cube actually looks like.
 */
export function isSolved(state: SimCubeState): boolean {
  return PIECE_MANIFEST.every((def) => {
    const piece = state[def.id];
    if (!piece) return false;
    if (!gridPosEqual(piece.gridPos, homeGridPos(def.colors))) return false;

    return def.colors.every(
      (color) =>
        stickerDirection(piece, color).distanceToSquared(
          COLOR_DIRECTION[color],
        ) < 1e-6,
    );
  });
}
