import { useRef, type RefObject } from "react";
import { haptic } from "./jump";

const MOVE_TOLERANCE = 10;
const HOLD_MS = 500;
const SCROLL_GRACE_MS = 180;

export interface GestureHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
}

/**
 * Telegram-style deliberate hold: the menu opens only after a ~500ms press
 * that never turned into a scroll. Any pan/touchmove or list scroll cancels
 * the timer instantly, so scrolling can never trigger the action menu.
 */
export function useHoldToAct(opts: {
  onHold: (x: number, y: number) => void;
  isScrolling?: RefObject<boolean>;
  lastScrollAt?: RefObject<number>;
  enabled?: boolean;
}) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const timer = useRef<number | null>(null);
  const moved = useRef(false);

  const clear = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const cancelled = () => {
    if (opts.isScrolling?.current) return true;
    if (opts.lastScrollAt?.current && Date.now() - opts.lastScrollAt.current < SCROLL_GRACE_MS) return true;
    return false;
  };

  const handlers: GestureHandlers = {
    onTouchStart: (e) => {
      if (opts.enabled === false) return;
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY, id: Date.now() };
      moved.current = false;
      clear();
      timer.current = window.setTimeout(() => {
        timer.current = null;
        if (moved.current || !start.current || cancelled()) return;
        const { x, y } = start.current;
        haptic();
        opts.onHold(x, y);
      }, HOLD_MS);
    },

    onTouchMove: (e) => {
      if (!start.current) return;
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - start.current.x);
      const dy = Math.abs(t.clientY - start.current.y);
      if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) {
        moved.current = true;
        clear();
      }
    },

    onTouchEnd: () => {
      clear();
      start.current = null;
      moved.current = false;
    },

    onTouchCancel: () => {
      clear();
      start.current = null;
      moved.current = false;
    },
  };

  return handlers;
}

