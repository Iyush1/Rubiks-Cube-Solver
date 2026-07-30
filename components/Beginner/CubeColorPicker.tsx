"use client";

import { useState } from "react";
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
  type StickerColor,
} from "@/utils/cubeColors";

const NET_FACES: FaceId[] = ["U", "L", "F", "R", "B", "D"];

const FACE_AREA: Record<FaceId, string> = {
  U: "up",
  L: "left",
  F: "front",
  R: "right",
  B: "back",
  D: "down",
};

function stickerBackground(color: StickerColor) {
  if (!color) {
    return "var(--bg-mid)";
  }

  return CUBE_COLOR_HEX[color];
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
      className="flex flex-col items-center gap-2"
      style={{ gridArea: FACE_AREA[faceId] }}
    >
      <span className="font-(family-name:--font-press-start) text-[clamp(0.35rem,1.1vw,0.55rem)] uppercase text-foreground/60 [text-shadow:2px_2px_0_var(--prompt-shadow)]">
        {FACE_LABELS[faceId]}
      </span>
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
                  className="size-[clamp(1.35rem,4.5vw,2.35rem)] rounded-[2px] border border-black/50"
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
                className="size-[clamp(1.35rem,4.5vw,2.35rem)] cursor-pointer rounded-[2px] border border-black/50 transition-[filter,transform] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caret active:scale-95"
                style={{ backgroundColor: stickerBackground(displayColor) }}
                onClick={() => onPaint(rowIndex, colIndex)}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

export function CubeColorPicker() {
  const { go } = usePageTransition();
  const [cube, setCube] = useState<CubeState>(() => createInitialCube());
  const [paintColor, setPaintColor] = useState<CubeColor>("white");

  const paintSticker = (faceId: FaceId, row: number, col: number) => {
    if (row === 1 && col === 1) {
      return;
    }

    setCube((current) => {
      const face = current[faceId].map((stickers) => [...stickers]);
      face[row][col] =
        face[row][col] === paintColor ? null : paintColor;

      return { ...current, [faceId]: face };
    });
  };

  const resetCube = () => setCube(createInitialCube());

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

      <div className="relative z-10 flex w-full max-w-4xl flex-1 flex-col items-center gap-[clamp(1.25rem,3.5vh,2.5rem)]">
        <header className="flex w-full flex-col items-center gap-3 text-center">
          <h1 className="font-(family-name:--font-press-start) text-[clamp(0.75rem,2.8vw,1.45rem)] leading-normal text-foreground uppercase [text-shadow:4px_4px_0_var(--prompt-shadow)]">
            Recreate Your Cube
          </h1>
          <p className="max-w-xl font-(family-name:--font-press-start) text-[clamp(0.4rem,1.2vw,0.65rem)] leading-[1.9] text-foreground/55 uppercase [text-shadow:2px_2px_0_var(--prompt-shadow)]">
            Hold white on top, green in front, orange on the left. Tap a color,
            then paint each sticker to match your cube.
          </p>
        </header>

        <div
          className="grid w-fit justify-items-center gap-x-[clamp(0.5rem,2vw,1rem)] gap-y-[clamp(0.65rem,2vh,1rem)]"
          style={{
            gridTemplateAreas: `
              ". up . ."
              "left front right back"
              ". down . ."
            `,
            gridTemplateColumns: "repeat(4, auto)",
          }}
        >
          {NET_FACES.map((id) => (
            <FaceGrid
              key={id}
              faceId={id}
              stickers={cube[id]}
              onPaint={(row, col) => paintSticker(id, row, col)}
            />
          ))}
        </div>

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
            onClick={() => go("/skill-select")}
          >
            <span className="text-caret [text-shadow:2px_2px_0_var(--caret-shadow)]">
              ▶
            </span>{" "}
            Back
          </button>
        </div>
      </div>
    </main>
  );
}
