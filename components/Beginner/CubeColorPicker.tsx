"use client";

import { useMemo, useState } from "react";
import { usePageTransition } from "@/app/transition/transition-provider";
import {
  CUBE_COLORS,
  CUBE_COLOR_HEX,
  DEFAULT_CENTERS,
  FACE_LABELS,
  createInitialCube,
  type CubeColor,
  type CubeState,
  type FaceId,
  type FaceStickers,
  type StickerColor,
} from "@/utils/cubeColors";
import {
  peekBeginnerStickers,
  saveBeginnerCube,
} from "@/utils/beginnerCubeSession";
import {
  describeStickerIssues,
  stickerCubeToSimState,
} from "@/utils/stickerToSimState";

/**
 * Paint order and hold cues. Neighbor labels match the sticker-net convention
 * in stickerToSimState: each face is painted as seen from outside with the
 * listed edge colors at top/bottom/left/right of the 3×3.
 */
const FACE_STEPS: {
  faceId: FaceId;
  towardYou: CubeColor;
  keepEdge: CubeColor;
  keepWhere: "top" | "bottom";
  neighbors: {
    top: CubeColor;
    bottom: CubeColor;
    left: CubeColor;
    right: CubeColor;
  };
}[] = [
  {
    faceId: "U",
    towardYou: "white",
    keepEdge: "green",
    keepWhere: "bottom",
    neighbors: {
      top: "blue",
      bottom: "green",
      left: "orange",
      right: "red",
    },
  },
  {
    faceId: "D",
    towardYou: "yellow",
    keepEdge: "green",
    keepWhere: "top",
    neighbors: {
      top: "green",
      bottom: "blue",
      left: "orange",
      right: "red",
    },
  },
  {
    faceId: "F",
    towardYou: "green",
    keepEdge: "white",
    keepWhere: "top",
    neighbors: {
      top: "white",
      bottom: "yellow",
      left: "orange",
      right: "red",
    },
  },
  {
    faceId: "R",
    towardYou: "red",
    keepEdge: "white",
    keepWhere: "top",
    neighbors: {
      top: "white",
      bottom: "yellow",
      left: "green",
      right: "blue",
    },
  },
  {
    faceId: "B",
    towardYou: "blue",
    keepEdge: "white",
    keepWhere: "top",
    neighbors: {
      top: "white",
      bottom: "yellow",
      left: "red",
      right: "orange",
    },
  },
  {
    faceId: "L",
    towardYou: "orange",
    keepEdge: "white",
    keepWhere: "top",
    neighbors: {
      top: "white",
      bottom: "yellow",
      left: "blue",
      right: "green",
    },
  },
];

function stickerBackground(color: StickerColor) {
  if (!color) return "var(--bg-mid)";
  return CUBE_COLOR_HEX[color];
}

function emptyStickersOnFace(stickers: FaceStickers): number {
  let empty = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r === 1 && c === 1) continue;
      if (stickers[r][c] == null) empty++;
    }
  }
  return empty;
}

function isFaceComplete(stickers: FaceStickers): boolean {
  return emptyStickersOnFace(stickers) === 0;
}

function firstIncompleteStep(cube: CubeState): number {
  const index = FACE_STEPS.findIndex(
    (step) => !isFaceComplete(cube[step.faceId]),
  );
  return index === -1 ? FACE_STEPS.length - 1 : index;
}

function NeighborChip({ color, side }: { color: CubeColor; side: string }) {
  return (
    <div
      className="flex items-center justify-center gap-1.5"
      aria-label={`${side} edge should be toward ${color}`}
    >
      <span
        className="size-3 shrink-0 rounded-[1px] border border-black/60 sm:size-3.5"
        style={{ backgroundColor: CUBE_COLOR_HEX[color] }}
        aria-hidden="true"
      />
      <span className="font-(family-name:--font-press-start) text-[clamp(0.3rem,0.9vw,0.45rem)] uppercase text-foreground/55 [text-shadow:2px_2px_0_var(--prompt-shadow)]">
        {color}
      </span>
    </div>
  );
}

function FaceGrid({
  faceId,
  stickers,
  onPaint,
}: {
  faceId: FaceId;
  stickers: StickerColor[][];
  onPaint: (row: number, col: number) => void;
}) {
  return (
    <div
      className="grid grid-cols-3 gap-[3px] rounded-sm bg-black p-[3px]"
      role="group"
      aria-label={`${FACE_LABELS[faceId]} face`}
    >
      {stickers.map((row, rowIndex) =>
        row.map((color, colIndex) => {
          const isCenter = rowIndex === 1 && colIndex === 1;
          const displayColor = isCenter ? DEFAULT_CENTERS[faceId] : color;
          const label = `${FACE_LABELS[faceId]} sticker ${rowIndex + 1},${colIndex + 1}${displayColor ? `, ${displayColor}` : ", empty"}`;

          if (isCenter) {
            return (
              <div
                key={`${faceId}-${rowIndex}-${colIndex}`}
                aria-label={`${label} (fixed center)`}
                className="size-[clamp(2.25rem,12vw,3.5rem)] rounded-[2px] border border-black/50"
                style={{
                  backgroundColor: stickerBackground(displayColor),
                  boxShadow: "inset 0 0 0 2px rgb(0 0 0 / 0.35)",
                }}
              />
            );
          }

          return (
            <button
              key={`${faceId}-${rowIndex}-${colIndex}`}
              type="button"
              aria-label={label}
              className="size-[clamp(2.25rem,12vw,3.5rem)] cursor-pointer rounded-[2px] border border-black/50 transition-[filter,transform] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caret active:scale-95"
              style={{ backgroundColor: stickerBackground(displayColor) }}
              onClick={() => onPaint(rowIndex, colIndex)}
            />
          );
        }),
      )}
    </div>
  );
}

export function CubeColorPicker() {
  const { go } = usePageTransition();
  const [cube, setCube] = useState<CubeState>(() => {
    return peekBeginnerStickers() ?? createInitialCube();
  });
  const [stepIndex, setStepIndex] = useState(() => {
    const initial = peekBeginnerStickers() ?? createInitialCube();
    return firstIncompleteStep(initial);
  });
  const [paintColor, setPaintColor] = useState<CubeColor>("white");
  const [error, setError] = useState<string | null>(null);

  const step = FACE_STEPS[stepIndex];
  const faceStickers = cube[step.faceId];
  const faceEmpty = emptyStickersOnFace(faceStickers);
  const isLastStep = stepIndex === FACE_STEPS.length - 1;
  const faceReady = faceEmpty === 0;

  const completedFaces = useMemo(
    () =>
      FACE_STEPS.map((faceStep) => isFaceComplete(cube[faceStep.faceId])),
    [cube],
  );

  const paintSticker = (row: number, col: number) => {
    if (row === 1 && col === 1) return;

    setError(null);
    setCube((current) => {
      const face = current[step.faceId].map((stickers) => [...stickers]);
      face[row][col] = face[row][col] === paintColor ? null : paintColor;
      return { ...current, [step.faceId]: face };
    });
  };

  const resetCube = () => {
    setError(null);
    setCube(createInitialCube());
    setStepIndex(0);
  };

  const goPrev = () => {
    setError(null);
    if (stepIndex === 0) {
      go("/skill-select");
      return;
    }
    setStepIndex((index) => index - 1);
  };

  const goNextFace = () => {
    if (!faceReady) {
      setError(
        `Paint every sticker on this face — ${faceEmpty} still empty.`,
      );
      return;
    }

    setError(null);
    if (!isLastStep) {
      setStepIndex((index) => index + 1);
      return;
    }

    const result = stickerCubeToSimState(cube);
    if (!result.ok) {
      setError(describeStickerIssues(result.issues));
      return;
    }

    saveBeginnerCube(cube, result.state);
    go("/rubiks");
  };

  const keepPhrase =
    step.keepWhere === "top"
      ? `Keep ${step.keepEdge.toUpperCase()} along the top edge.`
      : `Keep ${step.keepEdge.toUpperCase()} along the bottom edge.`;

  return (
    <main className="relative flex min-h-svh flex-col items-center overflow-hidden bg-[radial-gradient(circle_at_center,var(--bg-mid)_0%,var(--background)_67%)] px-4 py-8 sm:px-8">
      <div
        className="pointer-events-none absolute inset-0 animate-scanlines bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_12px,var(--scanline)_12px,var(--scanline)_15px)] motion-reduce:animate-none"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 animate-console-flicker bg-white/3 motion-reduce:animate-none"
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full max-w-xl flex-1 flex-col items-center gap-[clamp(1rem,3vh,2rem)]">
        <header className="flex w-full flex-col items-center gap-3 text-center">
          <h1 className="font-(family-name:--font-press-start) text-[clamp(0.75rem,2.8vw,1.45rem)] leading-normal text-foreground uppercase [text-shadow:4px_4px_0_var(--prompt-shadow)]">
            Recreate Your Cube
          </h1>
          <p className="font-(family-name:--font-press-start) text-[clamp(0.4rem,1.2vw,0.6rem)] uppercase text-foreground/55 [text-shadow:2px_2px_0_var(--prompt-shadow)]">
            Face {stepIndex + 1} of {FACE_STEPS.length}
          </p>
        </header>

        <div
          className="flex flex-wrap items-center justify-center gap-2"
          role="list"
          aria-label="Face progress"
        >
          {FACE_STEPS.map((faceStep, index) => {
            const done = completedFaces[index];
            const current = index === stepIndex;
            return (
              <button
                key={faceStep.faceId}
                type="button"
                role="listitem"
                aria-label={`${FACE_LABELS[faceStep.faceId]}${done ? ", complete" : ""}${current ? ", current" : ""}`}
                aria-current={current ? "step" : undefined}
                className="flex size-8 cursor-pointer items-center justify-center rounded-[2px] border-2 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caret active:scale-95 sm:size-9"
                style={{
                  backgroundColor: CUBE_COLOR_HEX[faceStep.towardYou],
                  borderColor: current ? "var(--caret)" : "#000",
                  boxShadow: current
                    ? "0 0 0 2px var(--caret-shadow)"
                    : done
                      ? "inset 0 0 0 2px rgb(0 0 0 / 0.35)"
                      : "3px 3px 0 rgb(0 0 0 / 0.35)",
                  opacity: done || current ? 1 : 0.45,
                }}
                onClick={() => {
                  setError(null);
                  setStepIndex(index);
                }}
              />
            );
          })}
        </div>

        <section className="flex w-full flex-col items-center gap-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <h2 className="font-(family-name:--font-press-start) text-[clamp(0.55rem,1.8vw,0.85rem)] uppercase text-foreground [text-shadow:3px_3px_0_var(--prompt-shadow)]">
              {FACE_LABELS[step.faceId]} — {step.towardYou} center
            </h2>
            <p className="max-w-md font-(family-name:--font-press-start) text-[clamp(0.38rem,1.15vw,0.58rem)] leading-[1.9] text-foreground/70 uppercase [text-shadow:2px_2px_0_var(--prompt-shadow)]">
              Turn the cube so{" "}
              <span className="text-foreground">{step.towardYou.toUpperCase()}</span>{" "}
              faces you. {keepPhrase}
            </p>
          </div>

          <div className="grid grid-cols-[auto_auto_auto] grid-rows-[auto_auto_auto] items-center justify-items-center gap-2 sm:gap-3">
            <div className="col-start-2 row-start-1">
              <NeighborChip color={step.neighbors.top} side="top" />
            </div>
            <div className="col-start-1 row-start-2">
              <NeighborChip color={step.neighbors.left} side="left" />
            </div>
            <div className="col-start-2 row-start-2">
              <FaceGrid
                faceId={step.faceId}
                stickers={faceStickers}
                onPaint={paintSticker}
              />
            </div>
            <div className="col-start-3 row-start-2">
              <NeighborChip color={step.neighbors.right} side="right" />
            </div>
            <div className="col-start-2 row-start-3">
              <NeighborChip color={step.neighbors.bottom} side="bottom" />
            </div>
          </div>
        </section>

        <div className="flex flex-col items-center gap-4">
          <p className="font-(family-name:--font-press-start) text-[clamp(0.4rem,1.2vw,0.6rem)] uppercase text-foreground/55 [text-shadow:2px_2px_0_var(--prompt-shadow)]">
            Paint Color
          </p>
          <div
            className="flex flex-wrap items-start justify-center gap-3"
            role="radiogroup"
            aria-label="Paint color"
          >
            {CUBE_COLORS.map((color) => {
              const selected = paintColor === color;

              return (
                <div key={color} className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={color}
                    className="size-[clamp(1.75rem,5vw,2.5rem)] cursor-pointer rounded-[3px] border-2 transition-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-caret active:scale-95"
                    style={{
                      backgroundColor: CUBE_COLOR_HEX[color],
                      borderColor: selected ? "var(--caret)" : "#000",
                      boxShadow: selected
                        ? "0 0 0 2px var(--caret-shadow)"
                        : "3px 3px 0 rgb(0 0 0 / 0.55)",
                    }}
                    onClick={() => setPaintColor(color)}
                  />
                  <span
                    className="font-(family-name:--font-press-start) text-[0.55rem] text-caret [text-shadow:2px_2px_0_var(--caret-shadow)]"
                    aria-hidden="true"
                  >
                    {selected ? "▲" : "\u00a0"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {(error || faceEmpty > 0) && (
          <p
            className={`max-w-lg text-center font-(family-name:--font-press-start) text-[clamp(0.35rem,1.1vw,0.55rem)] leading-[1.9] uppercase [text-shadow:2px_2px_0_var(--prompt-shadow)] ${error ? "text-caret" : "text-foreground/55"}`}
            aria-live="polite"
          >
            {error ??
              `${faceEmpty} sticker${faceEmpty === 1 ? "" : "s"} left on this face`}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-4">
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent font-(family-name:--font-press-start) text-[clamp(0.5rem,1.6vw,0.8rem)] uppercase text-foreground [text-shadow:3px_3px_0_var(--prompt-shadow)] focus-visible:outline-4 focus-visible:outline-offset-8 focus-visible:outline-foreground"
            onClick={resetCube}
          >
            Reset
          </button>
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent font-(family-name:--font-press-start) text-[clamp(0.5rem,1.6vw,0.8rem)] uppercase text-foreground [text-shadow:3px_3px_0_var(--prompt-shadow)] focus-visible:outline-4 focus-visible:outline-offset-8 focus-visible:outline-foreground"
            onClick={goPrev}
          >
            <span className="text-caret [text-shadow:2px_2px_0_var(--caret-shadow)]">
              ▶
            </span>{" "}
            {stepIndex === 0 ? "Exit" : "Back"}
          </button>
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent font-(family-name:--font-press-start) text-[clamp(0.5rem,1.6vw,0.8rem)] uppercase text-foreground [text-shadow:3px_3px_0_var(--prompt-shadow)] focus-visible:outline-4 focus-visible:outline-offset-8 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-40"
            onClick={goNextFace}
          >
            {isLastStep ? "Done" : "Next Face"}{" "}
            <span className="text-caret [text-shadow:2px_2px_0_var(--caret-shadow)]">
              ▶
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}
