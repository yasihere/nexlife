import { useRef, type PointerEvent } from 'react';

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 10;

interface LongPressHandlers {
  onPointerDown: (e: PointerEvent) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
  onPointerCancel: (e: PointerEvent) => void;
}

/**
 * Disambiguates a tap from a long-press on the same element. Today's rows tap
 * to complete — the fast daily-loop path, unchanged since Phase 3 — and
 * long-press to open the edit sheet, rather than making every tap open detail
 * and demoting completion to a secondary action.
 */
export function useLongPress(onTap: () => void, onLongPress: () => void): LongPressHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedLongPress = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  function clear(): void {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  return {
    onPointerDown(e) {
      firedLongPress.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        firedLongPress.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove(e) {
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) clear();
    },
    onPointerUp() {
      const wasLongPress = firedLongPress.current;
      clear();
      if (!wasLongPress) onTap();
    },
    onPointerCancel() {
      clear();
    },
  };
}
