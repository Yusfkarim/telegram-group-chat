import { useCallback, useEffect, useRef, useState } from "react";

const TRIGGER = 58; // px of horizontal travel that fires the reply
const MAX_SHIFT = 60; // px the bubble is allowed to travel
const DIRECTION_LOCK = 8; // px before we decide the gesture is horizontal

/**
 * Telegram-style swipe-to-reply for both touch and mouse drags.
 * Window-level pointer listeners are attached once and guarded by pointerId,
 * so a pointerdown never depends on a re-render to start tracking the drag.
 */
export function useSwipeToReply(opts: {
  onReply: () => void;
  disabled?: boolean;
  /** true while the message list is scrolling — cancels the gesture */
  isScrolling?: React.RefObject<boolean>;
  lastScrollAt?: React.RefObject<number>;
}) {
  const [shift, setShift] = useState(0);
  const [dir, setDir] = useState<-1 | 1>(1);
  const [active, setActive] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef<"none" | "h" | "v">("none");
  const armed = useRef(false);
  const pointerId = useRef<number | null>(null);
  const shiftRef = useRef(0);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const reset = useCallback(() => {
    shiftRef.current = 0;
    setShift(0);
    setDir(1);
    setActive(false);
    axis.current = "none";
    armed.current = false;
    pointerId.current = null;
  }, []);

  const begin = useCallback((x: number, y: number, id: number | null) => {
    const o = optsRef.current;
    if (o.disabled) return false;
    if (o.isScrolling?.current) return false;
    if (o.lastScrollAt?.current && Date.now() - o.lastScrollAt.current < 160) return false;
    startX.current = x;
    startY.current = y;
    axis.current = "none";
    armed.current = true;
    pointerId.current = id;
    return true;
  }, []);

  const move = useCallback((x: number, y: number) => {
    if (!armed.current) return false;
    const dx = x - startX.current;
    const dy = y - startY.current;
    if (axis.current === "none") {
      if (Math.abs(dx) < DIRECTION_LOCK && Math.abs(dy) < DIRECTION_LOCK) return false;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (axis.current === "v") {
        armed.current = false;
        return false;
      }
    }
    const pull = Math.abs(dx);
    shiftRef.current = Math.min(MAX_SHIFT, pull);
    setDir(dx >= 0 ? 1 : -1);
    setShift(Math.min(MAX_SHIFT, pull));
    setActive(true);
    return true;
  }, []);

  /** true → the gesture consumed the interaction (callers may swallow the click) */
  const finish = useCallback(() => {
    const fired = armed.current && shiftRef.current >= TRIGGER && axis.current === "h";
    const moved = armed.current && axis.current === "h";
    reset();
    if (fired) optsRef.current.onReply();
    return moved;
  }, [reset]);

  /* window-level tracking for the mouse drag; attached once, pointerId-guarded */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (pointerId.current === null || e.pointerId !== pointerId.current) return;
      move(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      if (pointerId.current === null || e.pointerId !== pointerId.current) return;
      if (finish()) {
        // swallow the click that follows a completed swipe
        const swallow = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        window.addEventListener("click", swallow, { capture: true, once: true });
        window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 80);
      }
    };
    const onCancel = () => reset();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [move, finish, reset]);

  /** the bubble follows the finger; the arrow is revealed on the trailing edge */
  const style = active ? { transform: `translateX(${dir * shift}px)`, transition: "none" } : undefined;
  const arrowSide = dir >= 0 ? "left" : "right";

  return {
    shift,
    dir,
    active,
    style,
    arrowSide,
    /** true while the bubble is being dragged */
    dragging: active,
    handlers: {
      onTouchStart: (e: React.TouchEvent): void => {
        const t = e.touches[0];
        if (!t) return;
        begin(t.clientX, t.clientY, t.identifier);
      },
      onTouchMove: (e: React.TouchEvent): void => {
        const t = e.touches[0];
        if (!t) return;
        if (move(t.clientX, t.clientY)) e.preventDefault();
      },
      onTouchEnd: (): boolean => {
        return finish();
      },
      onTouchCancel: (): boolean => {
        reset();
        return false;
      },
      /* mouse drag goes through the window listeners above */
      onPointerDown: (e: React.PointerEvent): void => {
        if (e.pointerType === "touch") return;
        if (e.button !== 0) return;
        begin(e.clientX, e.clientY, e.pointerId);
      },
    },
  };
}