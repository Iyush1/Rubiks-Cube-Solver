import * as THREE from "three";
// Type-only: erased at build time, so this does not create a runtime import
// cycle with simCubeState.ts (which imports COLOR_DIRECTION and PIECE_MANIFEST).
import type { GridPos, PieceRuntime } from "@/utils/simCubeState";

export type Color = "w" | "y" | "g" | "b" | "r" | "o";
export type PieceType = "center" | "edge" | "corner";

// w=White(U), y=Yellow(D), g=Green(F), b=Blue(B), r=Red(R), o=Orange(L)
export const COLOR_DIRECTION: Record<Color, THREE.Vector3> = {
  w: new THREE.Vector3(0, 1, 0),
  y: new THREE.Vector3(0, -1, 0),
  g: new THREE.Vector3(0, 0, 1),
  b: new THREE.Vector3(0, 0, -1),
  r: new THREE.Vector3(1, 0, 0),
  o: new THREE.Vector3(-1, 0, 0),
};

export type CubePiece = {
  id: string;
  type: PieceType;
  file: string;
  // IMPORTANT: always list colors in (Y-axis color, Z-axis color, X-axis color)
  // order when all three are present — this keeps the basis matrix consistently
  // right-handed. For edges, list the two present colors in that same relative order.
  colors: Color[];
};

// Fill these in with your real filenames/paths.
export const PIECE_MANIFEST: CubePiece[] = [
  // --- centers (1 color each) ---
  { id: "w", type: "center", file: "/Rubik/center/w_center.glb", colors: ["w"] },
  { id: "y", type: "center", file: "/Rubik/center/y_center.glb", colors: ["y"] },
  { id: "g", type: "center", file: "/Rubik/center/g_center.glb", colors: ["g"] },
  { id: "b", type: "center", file: "/Rubik/center/b_center.glb", colors: ["b"] },
  { id: "r", type: "center", file: "/Rubik/center/r_center.glb", colors: ["r"] },
  { id: "o", type: "center", file: "/Rubik/center/o_center.glb", colors: ["o"] },

  // --- edges (2 colors each, order: Y/Z/X priority) ---
  { id: "wg", type: "edge", file: "/Rubik/edges/wg_edge.glb", colors: ["w", "g"] },
  { id: "wb", type: "edge", file: "/Rubik/edges/wb_edge.glb", colors: ["w", "b"] },
  { id: "wr", type: "edge", file: "/Rubik/edges/wr_edge.glb", colors: ["w", "r"] },
  { id: "wo", type: "edge", file: "/Rubik/edges/wo_edge.glb", colors: ["w", "o"] },
  { id: "yg", type: "edge", file: "/Rubik/edges/yg_edge.glb", colors: ["y", "g"] },
  { id: "yb", type: "edge", file: "/Rubik/edges/yb_edge.glb", colors: ["y", "b"] },
  { id: "yr", type: "edge", file: "/Rubik/edges/yr_edge.glb", colors: ["y", "r"] },
  { id: "yo", type: "edge", file: "/Rubik/edges/yo_edge.glb", colors: ["y", "o"] },
  { id: "rg", type: "edge", file: "/Rubik/edges/rg_edge.glb", colors: ["g", "r"] },
  { id: "og", type: "edge", file: "/Rubik/edges/og_edge.glb", colors: ["g", "o"] },
  { id: "rb", type: "edge", file: "/Rubik/edges/rb_edge.glb", colors: ["b", "r"] },
  { id: "ob", type: "edge", file: "/Rubik/edges/ob_edge.glb", colors: ["b", "o"] },

  // --- corners (3 colors each, order: Y, Z, X) ---
  { id: "wrg", type: "corner", file: "/Rubik/corners/wrg_corner.glb", colors: ["w", "g", "r"] },
  { id: "wog", type: "corner", file: "/Rubik/corners/wog_corner.glb", colors: ["w", "g", "o"] },
  { id: "wrb", type: "corner", file: "/Rubik/corners/wrb_corner.glb", colors: ["w", "b", "r"] },
  { id: "wob", type: "corner", file: "/Rubik/corners/wob_corner.glb", colors: ["w", "b", "o"] },
  { id: "yrg", type: "corner", file: "/Rubik/corners/yrg_corner.glb", colors: ["y", "g", "r"] },
  { id: "yog", type: "corner", file: "/Rubik/corners/yog_corner.glb", colors: ["y", "g", "o"] },
  { id: "yrb", type: "corner", file: "/Rubik/corners/yrb_corner.glb", colors: ["y", "b", "r"] },
  { id: "yob", type: "corner", file: "/Rubik/corners/yob_corner.glb", colors: ["y", "b", "o"] },
];

/**
 * The pieces were modeled with the cube turned 180 degrees about Y relative to
 * the color convention above: in the exported frame red sits at -X and green at
 * -Z. This rotation maps authored space onto logical space. It is a proper
 * rotation, not a mirror, so handedness is preserved.
 *
 * If the GLBs are ever re-exported from a differently oriented scene, the cell
 * check in SimCube reports it rather than silently rendering a scrambled cube.
 */
export const AUTHORED_FRAME_CORRECTION = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0),
  Math.PI,
);

/** An immutable snapshot of a piece exactly as its GLB was authored. */
export type PieceMeasurement = {
  /** Bounding-box center, in the anchor's parent space. */
  center: THREE.Vector3;
  /** The model node's own local position. */
  nodePosition: THREE.Vector3;
  /** The model node's own baked rotation. */
  nodeQuaternion: THREE.Quaternion;
};

/** Where the cube as a whole sits in authored space. */
export type CubeCalibration = {
  /** Distance between adjacent cells, measured rather than assumed. */
  cellSize: number;
  /** Center of the assembled cube in authored space. */
  centroid: THREE.Vector3;
};

/**
 * Reads a piece's authored placement without moving anything. Pure measurement,
 * so it is safe to repeat — the cube-wide numbers below cannot be derived until
 * every piece has loaded, and mutating early would corrupt them.
 */
export function measurePiece(
  model: THREE.Object3D,
  anchor: THREE.Object3D,
): PieceMeasurement {
  const cached = model.userData.measurement as PieceMeasurement | undefined;
  if (cached) return cached;

  anchor.updateWorldMatrix(true, false);
  model.updateWorldMatrix(true, true);

  const center = new THREE.Box3()
    .setFromObject(model)
    .getCenter(new THREE.Vector3());
  anchor.worldToLocal(center);

  const measurement: PieceMeasurement = {
    center,
    nodePosition: model.position.clone(),
    nodeQuaternion: model.quaternion.clone(),
  };

  model.userData.measurement = measurement;
  return measurement;
}

/**
 * Derives the lattice from the pieces themselves. Hard-coding a cell size is
 * what let the cube collapse into a solid block: the GLBs are spaced ~2.05
 * apart, so laying them out on a 1.02 lattice made them interpenetrate.
 */
export function deriveCubeCalibration(
  measurements: Iterable<PieceMeasurement>,
): CubeCalibration {
  const centers = [...measurements].map((m) => m.center);

  const centroid = new THREE.Vector3();
  for (const center of centers) centroid.add(center);
  centroid.divideScalar(centers.length);

  // Outer pieces sit one cell from the centroid on at least one axis. Averaging
  // those offsets tolerates the small per-piece variation in the export better
  // than taking the extreme.
  const offsets: number[] = [];
  for (const center of centers) {
    const rel = center.clone().sub(centroid);
    offsets.push(Math.abs(rel.x), Math.abs(rel.y), Math.abs(rel.z));
  }
  const threshold = Math.max(...offsets) / 2;
  const outer = offsets.filter((value) => value > threshold);
  const cellSize = outer.reduce((sum, v) => sum + v, 0) / outer.length;

  return { cellSize, centroid };
}

/** The logical cell a piece occupies, in the manifest's color frame. */
export function logicalCellOf(
  measurement: PieceMeasurement,
  { cellSize, centroid }: CubeCalibration,
): GridPos {
  const rel = measurement.center
    .clone()
    .sub(centroid)
    .applyQuaternion(AUTHORED_FRAME_CORRECTION)
    .divideScalar(cellSize);

  return [Math.round(rel.x), Math.round(rel.y), Math.round(rel.z)];
}

/** Rounds a near-axis-aligned rotation onto an exact one. */
function snapToAxisAligned(quaternion: THREE.Quaternion): THREE.Quaternion {
  const matrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);
  const e = matrix.elements;
  for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10]) e[i] = Math.round(e[i]);
  return new THREE.Quaternion().setFromRotationMatrix(matrix);
}

/**
 * Applies the fixed correction that turns an authored model into an anchor-
 * ready one: rotated into the logical frame, and centered on the anchor origin.
 *
 * Centering matters because layer turns rotate anchors about the cube center —
 * a piece whose origin is not its own center gets swung off the lattice, and
 * the layer shears instead of turning rigidly.
 *
 * Derived entirely from the immutable measurement, so re-applying is a no-op
 * (React Strict Mode runs mount effects twice).
 */
export function applyModelCorrection(
  model: THREE.Object3D,
  measurement: PieceMeasurement,
) {
  const rotation = snapToAxisAligned(
    AUTHORED_FRAME_CORRECTION.clone().multiply(measurement.nodeQuaternion),
  );

  // Offset from the node's origin to its geometric center, rotated to match.
  const originToCenter = measurement.center
    .clone()
    .sub(measurement.nodePosition)
    .applyQuaternion(AUTHORED_FRAME_CORRECTION);

  model.quaternion.copy(rotation);
  model.position.copy(originToCenter.negate());
}

/** Writes a piece's logical cell and orientation onto its anchor group. */
export function applyPieceTransform(
  anchor: THREE.Object3D,
  piece: PieceRuntime,
  cellSize: number,
) {
  anchor.position.set(
    piece.gridPos[0] * cellSize,
    piece.gridPos[1] * cellSize,
    piece.gridPos[2] * cellSize,
  );
  anchor.quaternion.set(
    piece.quaternion[0],
    piece.quaternion[1],
    piece.quaternion[2],
    piece.quaternion[3],
  );
}