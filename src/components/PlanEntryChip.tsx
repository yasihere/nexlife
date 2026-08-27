import { useRef, type PointerEvent } from 'react';
import type { Entry } from '../data/types';

interface PlanEntryChipProps {
  entry: Entry;
  /** Fires repeatedly while dragging, with the current pointer position; null entry = drag ended. */
  onDragUpdate: (entry: Entry | null, x: number, y: number) => void;
  onDrop: (entry: Entry, x: number, y: number) => void;
}

const LONG_PRESS_MS = 350;
const MOVE_CANCEL_PX = 10;

/**
 * Long-press-then-drag, via pointer events — not native HTML5 drag-and-drop,
 * which doesn't work reliably on touch/WebView (this app's only real target).
 * The same disambiguation technique as useLongPress: a plain tap or a scroll
 * gesture must not accidentally start a drag.
 */
export default function PlanEntryChip({ entry, onDragUpdate, onDrop }: PlanEntryChipProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  function clearTimer(): void {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>): void {
    start.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    timer.current = setTimeout(() => {
      dragging.current = true;
      onDragUpdate(entry, e.clientX, e.clientY);
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>): void {
    if (dragging.current) {
      onDragUpdate(entry, e.clientX, e.clientY);
      return;
    }
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) clearTimer(); // a scroll, not a drag
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>): void {
    clearTimer();
    if (dragging.current) {
      dragging.current = false;
      onDrop(entry, e.clientX, e.clientY);
    }
  }

  function handlePointerCancel(): void {
    clearTimer();
    if (dragging.current) {
      dragging.current = false;
      onDragUpdate(null, 0, 0);
    }
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        opacity: entry.completedAt ? 0.35 : 1,
        textDecoration: entry.completedAt ? 'line-through' : 'none',
      }}
      className="truncate rounded bg-panel px-2 py-1 text-[11px] text-paper"
    >
      {entry.title}
    </div>
  );
}
