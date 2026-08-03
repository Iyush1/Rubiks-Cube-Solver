import type { CubeState } from "@/utils/cubeColors";
import type { SimCubeState } from "@/utils/simCubeState";

const STICKER_KEY = "beginner-cube-stickers";
const SIM_KEY = "beginner-cube-sim";

/** Persist the painted net + converted sim state for the /rubiks handoff. */
export function saveBeginnerCube(stickers: CubeState, sim: SimCubeState) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(STICKER_KEY, JSON.stringify(stickers));
  sessionStorage.setItem(SIM_KEY, JSON.stringify(sim));
}

/** Consume the sim state once so a refresh of /rubiks does not re-apply it forever. */
export function takeBeginnerSimState(): SimCubeState | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(SIM_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(SIM_KEY);
  try {
    return JSON.parse(raw) as SimCubeState;
  } catch {
    return null;
  }
}

export function peekBeginnerStickers(): CubeState | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(STICKER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CubeState;
  } catch {
    return null;
  }
}

export function clearBeginnerCube() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STICKER_KEY);
  sessionStorage.removeItem(SIM_KEY);
}
