export const CUBE_COLORS = [
  "white",
  "yellow",
  "red",
  "orange",
  "blue",
  "green",
] as const;

export type CubeColor = (typeof CUBE_COLORS)[number];

export const FACE_IDS = ["U", "L", "F", "R", "B", "D"] as const;

export type FaceId = (typeof FACE_IDS)[number];

export type StickerColor = CubeColor | null;

export type FaceStickers = StickerColor[][];

export type CubeState = Record<FaceId, FaceStickers>;

export const CUBE_COLOR_HEX: Record<CubeColor, string> = {
  white: "#f3f0d7",
  yellow: "#ffcf45",
  red: "#c23b3b",
  orange: "#ff8a1f",
  blue: "#3b6fc2",
  green: "#3d9a5c",
};

export const FACE_LABELS: Record<FaceId, string> = {
  U: "Up",
  D: "Down",
  F: "Front",
  B: "Back",
  L: "Left",
  R: "Right",
};

/** Standard Western color scheme centers for orientation. */
export const DEFAULT_CENTERS: Record<FaceId, CubeColor> = {
  U: "white",
  D: "yellow",
  F: "green",
  B: "blue",
  L: "orange",
  R: "red",
};

export function createEmptyFace(center: CubeColor): FaceStickers {
  return [
    [null, null, null],
    [null, center, null],
    [null, null, null],
  ];
}

export function createInitialCube(): CubeState {
  return {
    U: createEmptyFace(DEFAULT_CENTERS.U),
    D: createEmptyFace(DEFAULT_CENTERS.D),
    F: createEmptyFace(DEFAULT_CENTERS.F),
    B: createEmptyFace(DEFAULT_CENTERS.B),
    L: createEmptyFace(DEFAULT_CENTERS.L),
    R: createEmptyFace(DEFAULT_CENTERS.R),
  };
}
