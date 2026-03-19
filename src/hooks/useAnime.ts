import { useEffect, useRef, type RefObject } from "react";
import { animate, type AnimationParams } from "animejs";

/** Animate a single element on mount. */
export function useAnimeIn(
  ref: RefObject<HTMLElement | null>,
  animation: AnimationParams,
  deps: unknown[] = [],
) {
  const ran = useRef(false);
  useEffect(() => {
    if (!ref.current || ran.current) return;
    ran.current = true;
    animate(ref.current, animation);
  }, [ref.current, ...deps]);
}

/** Stagger-animate children matching `selector` on mount. */
export function useStaggerIn(
  ref: RefObject<HTMLElement | null>,
  selector: string,
  animation: AnimationParams,
  deps: unknown[] = [],
) {
  useEffect(() => {
    if (!ref.current) return;
    const els = ref.current.querySelectorAll(selector);
    if (els.length === 0) return;
    animate(els, animation);
  }, [ref.current, ...deps]);
}
