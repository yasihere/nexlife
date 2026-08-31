import type { PointerEvent } from 'react';

interface DragHandleProps {
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLButtonElement>) => void;
}

/**
 * Grip affordance that starts a drag-reorder gesture (useDragReorder.ts) — a
 * dedicated target so grabbing it never competes with a row's own tap
 * (complete) or long-press (open) gesture. Three hand-drawn bars, not an
 * icon library (CLAUDE.md §3). `touch-action: none` stops the browser's own
 * scroll from stealing a touch that starts here.
 */
export default function DragHandle({ onPointerDown, onPointerMove, onPointerUp }: DragHandleProps) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(e) => e.stopPropagation()}
      style={{ touchAction: 'none' }}
      className="flex h-11 w-11 shrink-0 cursor-grab items-center justify-center text-muted"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2" y="3" width="12" height="1.5" fill="currentColor" />
        <rect x="2" y="7.25" width="12" height="1.5" fill="currentColor" />
        <rect x="2" y="11.5" width="12" height="1.5" fill="currentColor" />
      </svg>
    </button>
  );
}
