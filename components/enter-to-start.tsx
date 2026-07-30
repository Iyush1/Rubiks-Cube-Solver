"use client";

import { useEffect } from "react";
import { TransitionLink } from "@/app/transition/transition-link";
import { usePageTransition } from "@/app/transition/transition-provider";
import { RubiksCube } from "@/components/rubiks-cube";

const destination = "/skill-select";

export function EnterToStart() {
  const { go } = usePageTransition();

  useEffect(() => {
    const start = (event: KeyboardEvent) => {
      const target = event.target;
      const isInteractive =
        target instanceof HTMLElement &&
        target.closest("a, button, input, select, textarea");

      if (event.key !== "Enter" || event.repeat || isInteractive) {
        return;
      }

      go(destination);
    };

    window.addEventListener("keydown", start);
    return () => window.removeEventListener("keydown", start);
  }, [go]);

  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden bg-[radial-gradient(circle_at_center,var(--bg-mid)_0%,var(--background)_67%)] p-8">
      <div
        className="pointer-events-none absolute inset-0 animate-scanlines bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_12px,var(--scanline)_12px,var(--scanline)_15px)] motion-reduce:animate-none"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 animate-console-flicker bg-white/3 motion-reduce:animate-none"
        aria-hidden="true"
      />
      <div className="relative z-10 flex flex-col items-center gap-[clamp(1rem,3vh,2rem)]">
        <h1 className="max-w-3xl text-center font-(family-name:--font-press-start) text-[clamp(1rem,3.5vw,2rem)] leading-normal text-foreground uppercase [text-shadow:4px_4px_0_var(--prompt-shadow)]">
          Master the Classic Cube
        </h1>
        <RubiksCube />
        <TransitionLink
          className="flex animate-[pulse_1.35s_steps(2,end)_infinite] items-center gap-[clamp(0.65rem,2vw,1.25rem)] text-center font-(family-name:--font-press-start) text-[clamp(0.75rem,2.4vw,1.35rem)] leading-[1.8] text-foreground uppercase no-underline [text-shadow:3px_3px_0_var(--prompt-shadow)] focus-visible:outline-4 focus-visible:outline-offset-10 focus-visible:outline-foreground motion-reduce:animate-none"
          href={destination}
        >
          <span
            className="text-caret [text-shadow:3px_3px_0_var(--caret-shadow)]"
            aria-hidden="true"
          >
            ▶
          </span>
          Press Enter to Start
        </TransitionLink>
      </div>
    </main>
  );
}
