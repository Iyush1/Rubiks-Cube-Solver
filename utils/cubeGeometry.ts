import * as THREE from "three";

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

// Tune these once by looking at the rendered result — see notes below.
export const CORRECTIONS: Record<PieceType, THREE.Euler> = {
  center: new THREE.Euler(0, 0, 0),
  edge: new THREE.Euler(0, 0, 0),
  corner: new THREE.Euler(0, 0, 0),
};

export function snapPieceTransform(object: THREE.Object3D, cellSize: number) {
  // --- position: snap bounding-box center to nearest grid slot ---
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());

  const snappedCenter = new THREE.Vector3(
    Math.round(center.x / cellSize) * cellSize,
    Math.round(center.y / cellSize) * cellSize,
    Math.round(center.z / cellSize) * cellSize,
  );

  const positionCorrection = snappedCenter.clone().sub(center);
  object.position.add(positionCorrection);

  // --- rotation: snap each Euler axis to nearest 90° ---
  const snapAngle = (a: number) => Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
  object.rotation.set(
    snapAngle(object.rotation.x),
    snapAngle(object.rotation.y),
    snapAngle(object.rotation.z),
  );
}

export function inferGridPos(object: THREE.Object3D, cellSize: number): [number, number, number] {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  return [
    Math.round(center.x / cellSize),
    Math.round(center.y / cellSize),
    Math.round(center.z / cellSize),
  ];
}