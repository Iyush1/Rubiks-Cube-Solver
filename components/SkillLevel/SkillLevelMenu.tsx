"use client";

import { useEffect, useState } from "react";
import { usePageTransition } from "@/app/transition/transition-provider";

export type SkillLevel = "beginner" | "advanced";

type MenuOption =
  | { id: SkillLevel; label: string; action: "select" }
  | { id: "exit"; label: string; action: "exit" };

const OPTIONS: MenuOption[] = [
  { id: "beginner", label: "Complete Beginner", action: "select" },
  { id: "advanced", label: "I Know What I'm Doing", action: "select" },
  { id: "exit", label: "Exit", action: "exit" },
];

type SkillLevelMenuProps = {
  onSelect?: (level: SkillLevel) => void;
};

export function  SkillLevelMenu({ onSelect }: SkillLevelMenuProps) {
  const { go } = usePageTransition();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const confirm = (option: MenuOption) => {
    if (option.action === "exit") {
      go("/");
      return;
    }

    if (option.id === "advanced") {
      go("/rubiks");
      return;
    }

    if (option.id === "beginner") {
      go("/beginner");
      return;
    }

    onSelect?.(option.id);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isInteractive =
        target instanceof HTMLElement &&
        target.closest("a, button, input, select, textarea");

      if (isInteractive) {
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedIndex((index) => (index + 1) % OPTIONS.length);
        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedIndex(
          (index) => (index - 1 + OPTIONS.length) % OPTIONS.length,
        );
        return;
      }

      if (event.key === "Enter" && !event.repeat) {
        event.preventDefault();
        confirm(OPTIONS[selectedIndex]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go, onSelect, selectedIndex]);

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

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-[clamp(1.5rem,4vh,2.75rem)]">
        <h1 className="text-center font-(family-name:--font-press-start) text-[clamp(0.85rem,3vw,1.65rem)] leading-normal text-foreground uppercase [text-shadow:4px_4px_0_var(--prompt-shadow)]">
          Select Your Skill Level
        </h1>

        <ul
          className="flex w-full flex-col items-stretch gap-[clamp(0.85rem,2.5vh,1.35rem)]"
          role="listbox"
          aria-label="Skill level"
          aria-activedescendant={OPTIONS[selectedIndex].id}
        >
          {OPTIONS.map((option, index) => {
            const isSelected = index === selectedIndex;

            return (
              <li key={option.id} role="option" aria-selected={isSelected}>
                <button
                  id={option.id}
                  type="button"
                  className="group flex w-full cursor-pointer items-center gap-[clamp(0.65rem,2vw,1.25rem)] border-0 bg-transparent p-0 text-left font-(family-name:--font-press-start) text-[clamp(0.6rem,2vw,1.05rem)] leading-[1.8] text-foreground uppercase [text-shadow:3px_3px_0_var(--prompt-shadow)] transition-opacity focus-visible:outline-4 focus-visible:outline-offset-8 focus-visible:outline-foreground"
                  style={{ opacity: isSelected ? 1 : 0.45 }}
                  onClick={() => {
                    setSelectedIndex(index);
                    confirm(option);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span
                    className="inline-block w-[1.25em] shrink-0 text-caret [text-shadow:3px_3px_0_var(--caret-shadow)]"
                    aria-hidden="true"
                  >
                    {isSelected ? "▶" : ""}
                  </span>
                  <span>{option.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="text-center font-(family-name:--font-press-start) text-[clamp(0.45rem,1.4vw,0.7rem)] leading-[1.9] text-foreground/55 uppercase [text-shadow:2px_2px_0_var(--prompt-shadow)]">
          ↑↓ Move · Enter Confirm
        </p>
      </div>
    </main>
  );
}
