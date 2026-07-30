import assignFaces from "./assignFaces";

const WORLD_HEIGHT = 10;
export const CELL_SIZE = 1;
const STAGGER = 0.025;
const FACE_ROTATIONS: [number, number, number][] = [
  [0, 0, 0],           // 0: Front
  [0, Math.PI, 0],      // 1: Back
  [0, -Math.PI / 2, 0], // 2: Right
  [0, Math.PI / 2, 0],  // 3: Left
  [Math.PI / 2, 0, 0],  // 4: Top
  [-Math.PI / 2, 0, 0], // 5: Bottom
];

export type GridCube = {
  key: string;
  position: [number, number, number];
  delay: number;
  seed: number;
  rotation: [number, number, number];
};

export default function createGrid(aspect: number): GridCube[] {
    const worldWidth = WORLD_HEIGHT * aspect;
    const columns = Math.ceil(worldWidth / CELL_SIZE) + 2;
    const rows = Math.ceil(WORLD_HEIGHT / CELL_SIZE) + 2;
    const cubes: GridCube[] = [];
    const faces = assignFaces(columns, rows);
  
    for (let diagonal = 0; diagonal <= columns + rows - 2; diagonal += 1) {
      for (let row = 0; row < rows; row += 1) {
        const column = diagonal - row;
  
        if (column < 0 || column >= columns) {
          continue;
        }
  
        const x = (column - (columns - 1) / 2) * CELL_SIZE;
        const y = ((rows - 1) / 2 - row) * CELL_SIZE;
        const seed = row * columns + column + 1;
        cubes.push({
          key: `${column}-${row}`,
          position: [x, y, 0],
          delay: diagonal * STAGGER,
          seed,
          rotation: FACE_ROTATIONS[faces[row][column]],
        });
      }
    }
  
    return cubes;
  }