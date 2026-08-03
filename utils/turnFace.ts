import {
  piecesOnFace,
  rotateGridPos,
  rotateQuaternion,
  type Face,
  type SimCubeState,
} from "@/utils/simCubeState";

/**
 * Pure logical face turn — no scene access. Reused by manual turns, and later
 * by scramble and solve playback.
 *
 * quarterTurns: 1 = R, -1 = R', 2 = R2.
 */
export function applyTurnToState(
  state: SimCubeState,
  face: Face,
  quarterTurns: number,
): SimCubeState {
  if (quarterTurns % 4 === 0) return state;

  const next: SimCubeState = { ...state };

  for (const id of piecesOnFace(state, face)) {
    const piece = state[id];
    next[id] = {
      id,
      gridPos: rotateGridPos(piece.gridPos, face, quarterTurns),
      quaternion: rotateQuaternion(piece.quaternion, face, quarterTurns),
    };
  }

  return next;
}
