import { createContext, useContext, useRef, type MutableRefObject } from "react";

interface ScrollCtx {
  /** true while the message list is being panned/scrolled */
  isScrolling: MutableRefObject<boolean>;
  /** bumped on every scroll event; long-press timers compare against it */
  lastScrollAt: MutableRefObject<number>;
}

export const ScrollStateContext = createContext<ScrollCtx | null>(null);

export function useScrollState() {
  return useContext(ScrollStateContext);
}

export function useScrollRefs() {
  const isScrolling = useRef(false);
  const lastScrollAt = useRef(0);
  return { isScrolling, lastScrollAt };
}