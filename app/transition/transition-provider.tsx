"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { CubeCurtain } from "./cube-curtain";

export type TransitionPhase = "idle" | "filling" | "dropping";

type TransitionContextValue = {
  phase: TransitionPhase;
  go: (href: string) => void;
};

const TransitionContext = createContext<TransitionContextValue | null>(null);

export function TransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const pendingHref = useRef<string | null>(null);
  const locked = useRef(false);
  const waitingForRoute = useRef(false);

  const go = useCallback(
    (href: string) => {
      if (locked.current) {
        return;
      }

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        router.push(href);
        return;
      }

      locked.current = true;
      pendingHref.current = href;
      setPhase("filling");
    },
    [router],
  );

  const handleFilled = useCallback(() => {
    const href = pendingHref.current;

    if (!href) {
      return;
    }

    waitingForRoute.current = true;
    router.push(href);
  }, [router]);

  const handleDropped = useCallback(() => {
    pendingHref.current = null;
    locked.current = false;
    setPhase("idle");
  }, []);

  // fires once the new route has actually rendered, not just been requested
  useEffect(() => {
    if (!waitingForRoute.current || !pendingHref.current) {
      return;
    }

    const targetPath = pendingHref.current.split("?")[0].split("#")[0];

    if (pathname === targetPath) {
      waitingForRoute.current = false;
      setPhase("dropping");
    }
  }, [pathname]);

  return (
    <TransitionContext.Provider value={{ phase, go }}>
      {children}
      {phase !== "idle" && (
        <CubeCurtain
          phase={phase}
          onFilled={handleFilled}
          onDropped={handleDropped}
        />
      )}
    </TransitionContext.Provider>
  );
}

export function usePageTransition() {
  const context = useContext(TransitionContext);

  if (!context) {
    throw new Error(
      "usePageTransition must be used within TransitionProvider",
    );
  }

  return context;
}