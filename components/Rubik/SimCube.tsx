"use client";

import {
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import * as THREE from "three";
import {
  applyModelCorrection,
  deriveCubeCalibration,
  logicalCellOf,
  PIECE_MANIFEST,
} from "@/utils/cubeGeometry";
import {
  beginnerDaisyInstruction,
  topCenterButtonLabel,
} from "@/utils/cubeOrientation";
import {
  createSolvedState,
  FACES,
  gridPosEqual,
  isSolved,
  type SimCubeState,
} from "@/utils/simCubeState";
import { Cubelet, type CubeletReady } from "./Cublet";
import {
  applyStateToScene,
  useCubeController,
  type CubeControllerApi,
} from "./useCubeController";
import { usePageTransition } from "@/app/transition/transition-provider";
import { takeBeginnerSimState } from "@/utils/beginnerCubeSession";

const PIXELATION = 2; // 1 = normal resolution, higher = chunkier pixels
const PIECE_COUNT = PIECE_MANIFEST.length;

/** Three-quarter view — showing three faces at once is what reads as a cube. */
const VIEW_DIRECTION = new THREE.Vector3(1, 0.8, 1.35).normalize();
const VIEW_MARGIN = 1.15;

/**
 * Distance at which the cube fits the frustum from any orbit angle. Uses the
 * bounding sphere so rotating never swings a corner out of frame, and the
 * narrower of the two field-of-view axes so it holds in portrait too.
 */
function framingDistance(camera: THREE.PerspectiveCamera, cubeSize: number) {
  const radius = (cubeSize * Math.sqrt(3)) / 2;
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov =
    2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  return (
    (VIEW_MARGIN * radius) / Math.sin(Math.min(verticalFov, horizontalFov) / 2)
  );
}

const MOVE_BUTTONS = FACES.flatMap((face) => [
  { label: face, face, quarterTurns: 1 },
  { label: `${face}'`, face, quarterTurns: -1 },
]);

type CubeSceneProps = {
  initialState: SimCubeState;
  onControllerReady: (api: CubeControllerApi) => void;
  onStateChange: (state: SimCubeState) => void;
};

/**
 * Owns the cube state and mutates the scene imperatively.
 *
 * Memoized with deliberately stable props so a turn never re-renders this
 * subtree: EffectComposer keys its passes on children identity and would tear
 * them down and rebuild on every render, which shows up as a flash.
 */
const CubeScene = memo(function CubeScene({
  initialState,
  onControllerReady,
  onStateChange,
}: CubeSceneProps) {
  const cubeRootRef = useRef<THREE.Group | null>(null);
  const piecesRef = useRef<Map<string, CubeletReady>>(new Map());
  const anchorsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const stateRef = useRef<SimCubeState>(initialState);
  const [loadedCount, setLoadedCount] = useState(0);
  const [view, setView] = useState<{ cellSize: number; distance: number }>();
  const calibratedRef = useRef(false);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;

  const ready = view !== undefined;

  const controller = useCubeController({
    cubeRootRef,
    anchorsRef,
    stateRef,
    onStateChange,
    cellSize: view?.cellSize ?? 0,
    ready,
  });

  useEffect(() => {
    onControllerReady(controller);
  }, [onControllerReady, controller]);

  const handleReady = useCallback((id: string, piece: CubeletReady) => {
    const alreadyLoaded = piecesRef.current.has(id);
    piecesRef.current.set(id, piece);
    anchorsRef.current.set(id, piece.anchor);
    if (!alreadyLoaded) setLoadedCount((count) => count + 1);
  }, []);

  // Calibrate once every piece has loaded: the cell size and cube centroid are
  // measured from the pieces collectively, so neither is knowable earlier.
  useEffect(() => {
    if (loadedCount < PIECE_COUNT || calibratedRef.current) return;
    calibratedRef.current = true;

    const pieces = piecesRef.current;
    const calibration = deriveCubeCalibration(
      [...pieces.values()].map((piece) => piece.measurement),
    );

    const solved = createSolvedState();
    const rows = PIECE_MANIFEST.map((piece) => {
      const measured = pieces.get(piece.id)!;
      const authored = logicalCellOf(measured.measurement, calibration);
      const expected = solved[piece.id].gridPos;
      return {
        id: piece.id,
        authored: authored.join(","),
        expected: expected.join(","),
        ok: gridPosEqual(authored, expected),
      };
    });

    const mismatched = rows.filter((row) => !row.ok);
    if (mismatched.length > 0) {
      console.table(rows);
      console.warn(
        `[SimCube] ${mismatched.length} piece(s) do not sit in the cell their colors imply. ` +
          `The GLBs were probably re-exported from a differently oriented scene — ` +
          `check AUTHORED_FRAME_CORRECTION in utils/cubeGeometry.ts.`,
      );
    } else {
      console.info(
        `[SimCube] ${PIECE_COUNT} pieces calibrated, cell size ${calibration.cellSize.toFixed(4)}`,
      );
    }

    for (const piece of pieces.values()) {
      applyModelCorrection(piece.model, piece.measurement);
    }
    applyStateToScene(stateRef.current, anchorsRef.current, calibration.cellSize);

    // Frame the camera from the now-known cube size. Doing this once, without
    // animation, is why the cube can be revealed already correctly framed.
    const distance = framingDistance(camera, 3 * calibration.cellSize);
    camera.position.copy(VIEW_DIRECTION).multiplyScalar(distance);
    camera.near = distance / 100;
    camera.far = distance * 10;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    setView({ cellSize: calibration.cellSize, distance });
  }, [loadedCount, camera]);

  // Held by identity so revealing the cube does not rebuild the effect passes.
  const effects = useMemo(
    () => (
      // Screen-space AO closes contact shadows between cubelets — the biggest
      // single factor in matching Eevee's grounded look.
      <EffectComposer>
        <N8AO aoRadius={0.4} intensity={1.5} />
      </EffectComposer>
    ),
    [],
  );

  return (
    <>
      {/* Image-based lighting — gives PBR materials something realistic to
          reflect, which is what Blender's viewport/render was giving you
          for free. This does most of the "soft ambient" work now. */}
      <Environment preset="studio" />

      {/* Small amount of direct light left for a defined key highlight /
          shadow direction. */}
      <hemisphereLight args={[0xffffff, 0x4a4a5a, 0.5]} />
      <directionalLight
        castShadow
        position={[3, 4, 6]}
        intensity={0.1}
        shadow-mapSize={[2048, 2048]}
      />

      <Suspense fallback={null}>
        {/* Anchors sit at gridPos * cellSize, so this group's origin is the
            cube's center cell — which is what turn pivots rotate about.
            Wrapping it in <Center> would offset that and shear the layer.

            Hidden until calibrated: before that the pieces still sit where the
            GLBs put them, off-origin and in the authored orientation. Hiding
            costs nothing, since bounding boxes ignore visibility. */}
        <group ref={cubeRootRef} visible={ready}>
          {PIECE_MANIFEST.map((piece) => (
            <Cubelet key={piece.id} piece={piece} onReady={handleReady} />
          ))}
        </group>
      </Suspense>

      {effects}

      <OrbitControls
        enablePan={false}
        minDistance={view ? view.distance * 0.55 : 1}
        maxDistance={view ? view.distance * 2.2 : 1000}
      />
    </>
  );
});

const idleController: CubeControllerApi = {
  requestTurn: () => {},
  requestWholeCubeTurn: () => {},
  requestToggleTopCenter: () => {},
  getState: () => createSolvedState(),
};

export function RubiksCube() {
  const { go } = usePageTransition();
  const controllerRef = useRef<CubeControllerApi>(idleController);
  // Beginner picker stashes a converted state in sessionStorage; Advanced (and
  // a bare visit) fall back to solved. Captured once so the scene props stay
  // stable — see CubeScene's memo note about EffectComposer.
  const [initialState] = useState(
    () => takeBeginnerSimState() ?? createSolvedState(),
  );
  // Only what the UI actually displays lives in React state; the cube itself is
  // owned by the scene, so turning never re-renders the Canvas subtree.
  const [solved, setSolved] = useState(() => isSolved(initialState));
  const [instruction, setInstruction] = useState(() =>
    beginnerDaisyInstruction(initialState),
  );
  const [topButtonLabel, setTopButtonLabel] = useState(() =>
    topCenterButtonLabel(initialState),
  );

  const onControllerReady = useCallback((api: CubeControllerApi) => {
    controllerRef.current = api;
  }, []);

  const onStateChange = useCallback((next: SimCubeState) => {
    setSolved(isSolved(next));
    setInstruction(beginnerDaisyInstruction(next));
    setTopButtonLabel(topCenterButtonLabel(next));
  }, []);

  return (
    <div className="flex h-[85vh] w-full flex-col items-center gap-y-6 px-4">
      <Canvas
        shadows="percentage"
        dpr={1 / PIXELATION}
        camera={{ fov: 35, position: [11.8, 9.5, 16] }}
        className="min-h-0 w-full flex-1 [image-rendering:pixelated]"
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.5,
        }}
      >
        <CubeScene
          initialState={initialState}
          onControllerReady={onControllerReady}
          onStateChange={onStateChange}
        />
      </Canvas>

      <p
        className="max-w-xl text-center font-(family-name:--font-press-start) text-[clamp(0.35rem,1.1vw,0.55rem)] leading-[1.9] uppercase text-foreground/70 [text-shadow:2px_2px_0_var(--prompt-shadow)]"
        aria-live="polite"
      >
        {instruction}
      </p>

      <p
        className="font-(family-name:--font-press-start) text-[clamp(0.45rem,1.2vw,0.65rem)] uppercase tracking-wide text-foreground [text-shadow:2px_2px_0_var(--prompt-shadow)]"
        aria-live="polite"
      >
        {solved ? "solved" : "scrambled"}
      </p>

      <button
        type="button"
        aria-label={`Rotate the cube so ${topButtonLabel.toLowerCase()}`}
        className="cursor-pointer border border-caret/60 bg-transparent px-3 py-2 font-(family-name:--font-press-start) text-[clamp(0.4rem,1.1vw,0.55rem)] uppercase text-caret [text-shadow:2px_2px_0_var(--caret-shadow)] transition-colors hover:bg-caret/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-caret"
        onClick={() => controllerRef.current.requestToggleTopCenter()}
      >
        {topButtonLabel}
      </button>

      <div className="flex max-w-xl flex-wrap justify-center gap-2">
        {MOVE_BUTTONS.map(({ label, face, quarterTurns }) => (
          <button
            key={label}
            type="button"
            aria-label={`Turn ${face} ${quarterTurns === -1 ? "counter-clockwise" : "clockwise"}`}
            className="cursor-pointer border border-foreground/40 bg-transparent px-2.5 py-1.5 font-(family-name:--font-press-start) text-[clamp(0.4rem,1vw,0.55rem)] uppercase text-foreground [text-shadow:2px_2px_0_var(--prompt-shadow)] transition-colors hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
            onClick={() =>
              controllerRef.current.requestTurn(face, quarterTurns)
            }
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="cursor-pointer border-0 bg-transparent font-(family-name:--font-press-start) text-[clamp(0.5rem,1.6vw,0.8rem)] uppercase text-foreground [text-shadow:3px_3px_0_var(--prompt-shadow)] focus-visible:outline-4 focus-visible:outline-offset-8 focus-visible:outline-foreground"
        onClick={() => go("/skill-select")}
      >
        Back
      </button>
    </div>
  );
}
