import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

//  Types 

type Direction = "left" | "right" | "bottom";

interface RevealContextValue {
  /** Register an element; returns an unregister callback */
  register: (el: HTMLElement, dir: Direction, delay: number) => () => void;
  /** The scroll container ref — attach to your <main> */
  containerRef: React.RefObject<HTMLDivElement>;
}

// ── Context ──────────────────────────────────────────────────────────────────

const RevealContext = createContext<RevealContextValue | null>(null);

// ── Off-screen / on-screen transform presets ─────────────────────────────────

const OFFSCREEN: Record<Direction, string> = {
  left: "translate3d(-80px, 0,    -50px) rotateY( 16deg) rotateX(0deg)",
  right: "translate3d( 80px, 0,    -50px) rotateY(-16deg) rotateX(0deg)",
  bottom: "translate3d(0,     60px, -40px) rotateY(  0deg) rotateX(-12deg)",
};
const ONSCREEN = "translate3d(0, 0, 0) rotateY(0deg) rotateX(0deg)";

// ── Provider ──────────────────────────────────────────────────────────────────

export function ScrollRevealProvider({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null!);

  // Each registered card: element + direction + delay
  const cardsRef = useRef<
    Map<HTMLElement, { dir: Direction; delay: number; visible: boolean }>
  >(new Map());

  const applyState = useCallback(
    (el: HTMLElement, dir: Direction, visible: boolean, delay = 0) => {
      el.style.transition = visible
        ? `transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}ms,
           opacity  0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms`
        : `transform 0.45s cubic-bezier(0.55,0,0.45,1) ${delay}ms,
           opacity  0.35s cubic-bezier(0.55,0,0.45,1) ${delay}ms`;
      el.style.transform = visible ? ONSCREEN : OFFSCREEN[dir];
      el.style.opacity = visible ? "1" : "0";
    },
    []
  );

  const checkAll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();

    cardsRef.current.forEach(({ dir, delay, visible }, el) => {
      const r = el.getBoundingClientRect();
      const inView = r.bottom > cRect.top + 48 && r.top < cRect.bottom - 48;
      if (inView !== visible) {
        cardsRef.current.set(el, { dir, delay, visible: inView });
        applyState(el, dir, inView, inView ? delay : 0);
      }
    });
  }, [applyState]);

  // Register / unregister
  const register = useCallback(
    (el: HTMLElement, dir: Direction, delay: number) => {
      // Initialise off-screen immediately (no transition)
      el.style.willChange = "transform, opacity";
      el.style.transformStyle = "preserve-3d";
      el.style.transform = OFFSCREEN[dir];
      el.style.opacity = "0";
      cardsRef.current.set(el, { dir, delay, visible: false });
      // Kick a check after a tick so it catches already-visible cards on mount
      requestAnimationFrame(checkAll);
      return () => {
        cardsRef.current.delete(el);
      };
    },
    [checkAll]
  );

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("scroll", checkAll, { passive: true });
    checkAll();
    return () => container.removeEventListener("scroll", checkAll);
  }, [checkAll]);

  return (
    <RevealContext.Provider value={{ register, containerRef }}>
      {/* perspective wrapper so children get depth */}
      <div style={{ perspective: "1100px", width: "100%", height: "100%" }}>
        {children}
      </div>
    </RevealContext.Provider>
  );
}

// ── <Reveal3D> wrapper ───────────────────────────────────────────────────────

interface Reveal3DProps {
  direction?: Direction;
  delay?: number;        // ms stagger per card
  className?: string;
  children: ReactNode;
}

export function Reveal3D({
  direction = "bottom",
  delay = 0,
  className,
  children,
}: Reveal3DProps) {
  const ctx = useContext(RevealContext);
  const ref = useRef<HTMLDivElement>(null!);

  useLayoutEffect(() => {
    if (!ctx || !ref.current) return;
    return ctx.register(ref.current, direction, delay);
  }, [ctx, direction, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// ── Hook for imperative access ───────────────────────────────────────────────

export function useScrollReveal() {
  const ctx = useContext(RevealContext);
  if (!ctx) throw new Error("useScrollReveal must be used inside ScrollRevealProvider");
  return ctx;
}
