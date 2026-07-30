import seededRandom from "./seedRandom";

const FACE_ROTATIONS: [number, number, number][] = [
    [0, 0, 0],           // 0: Front
    [0, Math.PI, 0],      // 1: Back
    [0, -Math.PI / 2, 0], // 2: Right
    [0, Math.PI / 2, 0],  // 3: Left
    [Math.PI / 2, 0, 0],  // 4: Top
    [-Math.PI / 2, 0, 0], // 5: Bottom
  ];
  
  const FACE_COLORS = [
    "orange",    // 0: Front
    "red", // 1: Back
    "blue",   // 2: Right
    "green",  // 3: Left
    "white",  // 4: Top
    "yellow", // 5: Bottom
  ] as const;
  
  // only faces with these colors are allowed to be the outward-facing side
  const VISIBLE_FACE_INDICES = FACE_COLORS.reduce<number[]>((acc, color, index) => {
    if (color === "red" || color === "blue" || color === "yellow" || color === "white") {
      acc.push(index);
    }
    return acc;
  }, []);
  

export default function assignFaces(columns: number, rows: number) {
    const faces = Array.from({ length: rows }, () =>
      Array<number>(columns).fill(0),
    );
  
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const unavailable = new Set<number>();
  
        if (column > 0) {
          unavailable.add(faces[row][column - 1]);
        }
  
        if (row > 0) {
          unavailable.add(faces[row - 1][column]);
        }
  
        const available = VISIBLE_FACE_INDICES.filter(
          (face) => !unavailable.has(face),
        );
        const seed = row * columns + column + 101;
        const selected = Math.floor(seededRandom(seed) * available.length);
        faces[row][column] = available[selected];
      }
    }
  
    return faces;
  }