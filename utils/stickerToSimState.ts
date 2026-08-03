import * as THREE from "three";
import {
  DEFAULT_CENTERS,
  FACE_IDS,
  type CubeColor,
  type CubeState,
  type FaceId,
  type StickerColor,
} from "@/utils/cubeColors";
import { COLOR_DIRECTION, PIECE_MANIFEST, type Color } from "@/utils/cubeGeometry";
import {
  FACE_NORMAL,
  homeGridPos,
  type Face,
  type GridPos,
  type Quat,
  type SimCubeState,
} from "@/utils/simCubeState";

export const CUBE_COLOR_TO_SHORT: Record<CubeColor, Color> = {
  white: "w",
  yellow: "y",
  green: "g",
  blue: "b",
  red: "r",
  orange: "o",
};

export const SHORT_TO_CUBE_COLOR: Record<Color, CubeColor> = {
  w: "white",
  y: "yellow",
  g: "green",
  b: "blue",
  r: "red",
  o: "orange",
};

/** Which face a center color belongs on (fixed Western scheme). */
const FACE_OF_COLOR: Record<Color, Face> = {
  w: "U",
  y: "D",
  g: "F",
  b: "B",
  r: "R",
  o: "L",
};

type StickerRef = { face: FaceId; row: number; col: number };

/**
 * Corner and edge slots on the cube, with the stickers that meet there.
 *
 * Net layout (U above F, D below F, L F R B in a row) — each face is painted
 * as seen from outside:
 *   U/D/F/L/R: row 0 toward U for side faces; U row 0 toward B; D row 0 toward F
 *   B: row 0 toward U, col 0 toward R (continues the L-F-R-B strip)
 */
const CORNER_SLOTS: { gridPos: GridPos; stickers: StickerRef[] }[] = [
  {
    gridPos: [-1, 1, 1], // UFL
    stickers: [
      { face: "U", row: 2, col: 0 },
      { face: "F", row: 0, col: 0 },
      { face: "L", row: 0, col: 2 },
    ],
  },
  {
    gridPos: [1, 1, 1], // UFR
    stickers: [
      { face: "U", row: 2, col: 2 },
      { face: "F", row: 0, col: 2 },
      { face: "R", row: 0, col: 0 },
    ],
  },
  {
    gridPos: [-1, 1, -1], // UBL
    stickers: [
      { face: "U", row: 0, col: 0 },
      { face: "B", row: 0, col: 2 },
      { face: "L", row: 0, col: 0 },
    ],
  },
  {
    gridPos: [1, 1, -1], // UBR
    stickers: [
      { face: "U", row: 0, col: 2 },
      { face: "B", row: 0, col: 0 },
      { face: "R", row: 0, col: 2 },
    ],
  },
  {
    gridPos: [-1, -1, 1], // DFL
    stickers: [
      { face: "D", row: 0, col: 0 },
      { face: "F", row: 2, col: 0 },
      { face: "L", row: 2, col: 2 },
    ],
  },
  {
    gridPos: [1, -1, 1], // DFR
    stickers: [
      { face: "D", row: 0, col: 2 },
      { face: "F", row: 2, col: 2 },
      { face: "R", row: 2, col: 0 },
    ],
  },
  {
    gridPos: [-1, -1, -1], // DBL
    stickers: [
      { face: "D", row: 2, col: 0 },
      { face: "B", row: 2, col: 2 },
      { face: "L", row: 2, col: 0 },
    ],
  },
  {
    gridPos: [1, -1, -1], // DBR
    stickers: [
      { face: "D", row: 2, col: 2 },
      { face: "B", row: 2, col: 0 },
      { face: "R", row: 2, col: 2 },
    ],
  },
];

const EDGE_SLOTS: { gridPos: GridPos; stickers: StickerRef[] }[] = [
  {
    gridPos: [0, 1, 1], // UF
    stickers: [
      { face: "U", row: 2, col: 1 },
      { face: "F", row: 0, col: 1 },
    ],
  },
  {
    gridPos: [1, 1, 0], // UR
    stickers: [
      { face: "U", row: 1, col: 2 },
      { face: "R", row: 0, col: 1 },
    ],
  },
  {
    gridPos: [0, 1, -1], // UB
    stickers: [
      { face: "U", row: 0, col: 1 },
      { face: "B", row: 0, col: 1 },
    ],
  },
  {
    gridPos: [-1, 1, 0], // UL
    stickers: [
      { face: "U", row: 1, col: 0 },
      { face: "L", row: 0, col: 1 },
    ],
  },
  {
    gridPos: [0, -1, 1], // DF
    stickers: [
      { face: "D", row: 0, col: 1 },
      { face: "F", row: 2, col: 1 },
    ],
  },
  {
    gridPos: [1, -1, 0], // DR
    stickers: [
      { face: "D", row: 1, col: 2 },
      { face: "R", row: 2, col: 1 },
    ],
  },
  {
    gridPos: [0, -1, -1], // DB
    stickers: [
      { face: "D", row: 2, col: 1 },
      { face: "B", row: 2, col: 1 },
    ],
  },
  {
    gridPos: [-1, -1, 0], // DL
    stickers: [
      { face: "D", row: 1, col: 0 },
      { face: "L", row: 2, col: 1 },
    ],
  },
  {
    gridPos: [1, 0, 1], // FR
    stickers: [
      { face: "F", row: 1, col: 2 },
      { face: "R", row: 1, col: 0 },
    ],
  },
  {
    gridPos: [-1, 0, 1], // FL
    stickers: [
      { face: "F", row: 1, col: 0 },
      { face: "L", row: 1, col: 2 },
    ],
  },
  {
    gridPos: [1, 0, -1], // BR
    stickers: [
      { face: "B", row: 1, col: 0 },
      { face: "R", row: 1, col: 2 },
    ],
  },
  {
    gridPos: [-1, 0, -1], // BL
    stickers: [
      { face: "B", row: 1, col: 2 },
      { face: "L", row: 1, col: 0 },
    ],
  },
];

export type StickerValidationIssue =
  | { kind: "incomplete"; remaining: number }
  | { kind: "colorCount"; color: CubeColor; count: number }
  | { kind: "unknownPiece"; colors: Color[]; gridPos: GridPos }
  | { kind: "duplicatePiece"; id: string }
  | { kind: "badOrientation"; id: string; gridPos: GridPos };

export type StickerConversionResult =
  | { ok: true; state: SimCubeState }
  | { ok: false; issues: StickerValidationIssue[] };

function readSticker(cube: CubeState, ref: StickerRef): StickerColor {
  return cube[ref.face][ref.row][ref.col];
}

function colorKey(colors: Color[]): string {
  return [...colors].sort().join("");
}

function pieceByColors(): Map<string, (typeof PIECE_MANIFEST)[number]> {
  const map = new Map<string, (typeof PIECE_MANIFEST)[number]>();
  for (const piece of PIECE_MANIFEST) {
    map.set(colorKey(piece.colors), piece);
  }
  return map;
}

/**
 * Rotation that takes each sticker's home direction to the face it is painted on.
 * Returns null if the mapping is not a proper rotation (impossible stickers).
 */
function quatFromStickerMap(
  colors: Color[],
  facing: Partial<Record<Color, THREE.Vector3>>,
): Quat | null {
  const homes = colors.map((c) => COLOR_DIRECTION[c].clone().normalize());
  const targets = colors.map((c) => facing[c]!.clone().normalize());

  let h0: THREE.Vector3;
  let h1: THREE.Vector3;
  let h2: THREE.Vector3;
  let t0: THREE.Vector3;
  let t1: THREE.Vector3;
  let t2: THREE.Vector3;

  if (colors.length === 1) {
    const q = new THREE.Quaternion().setFromUnitVectors(homes[0], targets[0]);
    return [q.x, q.y, q.z, q.w];
  }

  if (colors.length === 2) {
    h0 = homes[0];
    h1 = homes[1];
    t0 = targets[0];
    t1 = targets[1];
    h2 = new THREE.Vector3().crossVectors(h0, h1).normalize();
    t2 = new THREE.Vector3().crossVectors(t0, t1).normalize();
  } else {
    h0 = homes[0];
    h1 = homes[1];
    h2 = homes[2];
    t0 = targets[0];
    t1 = targets[1];
    t2 = targets[2];
  }

  // Reject reflections / non-orthogonal paint jobs before building a quaternion.
  const homeDet = new THREE.Matrix4().makeBasis(h0, h1, h2).determinant();
  const targetDet = new THREE.Matrix4().makeBasis(t0, t1, t2).determinant();
  if (homeDet * targetDet < 0 || Math.abs(targetDet) < 0.5) {
    return null;
  }

  const mHome = new THREE.Matrix4().makeBasis(h0, h1, h2);
  const mTarget = new THREE.Matrix4().makeBasis(t0, t1, t2);
  const rotation = mTarget.multiply(mHome.invert());
  const q = new THREE.Quaternion().setFromRotationMatrix(rotation);

  // Every sticker must land on its painted face.
  for (let i = 0; i < colors.length; i++) {
    const dir = homes[i].clone().applyQuaternion(q);
    if (dir.distanceToSquared(targets[i]) > 1e-6) return null;
  }

  return [q.x, q.y, q.z, q.w];
}

/** Fully solved sticker net matching DEFAULT_CENTERS / COLOR_DIRECTION. */
export function createSolvedStickerCube(): CubeState {
  const faceColor: Record<FaceId, CubeColor> = { ...DEFAULT_CENTERS };
  const cube = {} as CubeState;
  for (const face of FACE_IDS) {
    const c = faceColor[face];
    cube[face] = [
      [c, c, c],
      [c, c, c],
      [c, c, c],
    ];
  }
  return cube;
}

export function countEmptyStickers(cube: CubeState): number {
  let empty = 0;
  for (const face of FACE_IDS) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (r === 1 && c === 1) continue;
        if (cube[face][r][c] == null) empty++;
      }
    }
  }
  return empty;
}

/**
 * Convert a painted sticker net into the sim's piece placements.
 *
 * Centers are fixed by orientation instructions; edges and corners are located
 * by their color sets and oriented so each sticker faces the face it was painted on.
 */
export function stickerCubeToSimState(cube: CubeState): StickerConversionResult {
  const issues: StickerValidationIssue[] = [];

  const remaining = countEmptyStickers(cube);
  if (remaining > 0) {
    return { ok: false, issues: [{ kind: "incomplete", remaining }] };
  }

  const counts: Record<CubeColor, number> = {
    white: 0,
    yellow: 0,
    red: 0,
    orange: 0,
    blue: 0,
    green: 0,
  };
  for (const face of FACE_IDS) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const color =
          r === 1 && c === 1 ? DEFAULT_CENTERS[face] : cube[face][r][c];
        if (color) counts[color]++;
      }
    }
  }
  for (const color of Object.keys(counts) as CubeColor[]) {
    if (counts[color] !== 9) {
      issues.push({ kind: "colorCount", color, count: counts[color] });
    }
  }
  if (issues.length > 0) return { ok: false, issues };

  const lookup = pieceByColors();
  const used = new Set<string>();
  const state: SimCubeState = {};

  // Centers stay on their home faces.
  for (const piece of PIECE_MANIFEST) {
    if (piece.type !== "center") continue;
    state[piece.id] = {
      id: piece.id,
      gridPos: homeGridPos(piece.colors),
      quaternion: [0, 0, 0, 1],
    };
    used.add(piece.id);
  }

  const placeSlot = (
    gridPos: GridPos,
    stickers: StickerRef[],
  ): StickerValidationIssue | null => {
    const colors: Color[] = [];
    const facing: Partial<Record<Color, THREE.Vector3>> = {};

    for (const ref of stickers) {
      const painted = readSticker(cube, ref);
      if (!painted) {
        return { kind: "incomplete", remaining: 1 };
      }
      const short = CUBE_COLOR_TO_SHORT[painted];
      colors.push(short);
      facing[short] = FACE_NORMAL[ref.face as Face].clone();
    }

    const piece = lookup.get(colorKey(colors));
    if (!piece) {
      return { kind: "unknownPiece", colors, gridPos };
    }
    if (used.has(piece.id)) {
      return { kind: "duplicatePiece", id: piece.id };
    }

    // Orient using the piece's canonical color order (not sticker order).
    const orderedFacing: Partial<Record<Color, THREE.Vector3>> = {};
    for (const color of piece.colors) {
      orderedFacing[color] = facing[color];
    }
    const quaternion = quatFromStickerMap(piece.colors, orderedFacing);
    if (!quaternion) {
      return { kind: "badOrientation", id: piece.id, gridPos };
    }

    used.add(piece.id);
    state[piece.id] = { id: piece.id, gridPos, quaternion };
    return null;
  };

  for (const slot of CORNER_SLOTS) {
    const issue = placeSlot(slot.gridPos, slot.stickers);
    if (issue) issues.push(issue);
  }
  for (const slot of EDGE_SLOTS) {
    const issue = placeSlot(slot.gridPos, slot.stickers);
    if (issue) issues.push(issue);
  }

  if (issues.length > 0) return { ok: false, issues };

  // Sanity: every manifest piece present.
  for (const piece of PIECE_MANIFEST) {
    if (!state[piece.id]) {
      issues.push({ kind: "unknownPiece", colors: piece.colors, gridPos: [0, 0, 0] });
    }
  }
  if (issues.length > 0) return { ok: false, issues };

  return { ok: true, state };
}

export function describeStickerIssues(issues: StickerValidationIssue[]): string {
  const first = issues[0];
  if (!first) return "Cube colors look invalid.";

  switch (first.kind) {
    case "incomplete":
      return `Paint every sticker — ${first.remaining} still empty.`;
    case "colorCount":
      return `Need 9 ${first.color} stickers (found ${first.count}).`;
    case "unknownPiece":
      return `Those colors don't form a real piece (${first.colors.map((c) => SHORT_TO_CUBE_COLOR[c]).join("-")}).`;
    case "duplicatePiece":
      return `Piece ${first.id} appears more than once.`;
    case "badOrientation":
      return `Stickers on piece ${first.id} can't face those sides.`;
  }
}

/** Face of a color's home center — useful for tests and debugging. */
export function homeFaceOfColor(color: Color): Face {
  return FACE_OF_COLOR[color];
}
