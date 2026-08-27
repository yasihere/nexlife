import { useRef, useState, type PointerEvent } from 'react';
import { format, parseISO } from 'date-fns';
import type { Entry } from '../data/types';

interface TriageCardProps {
  entry: Entry;
  onToday: () => void;
  onReschedule: () => void;
  onDrop: () => void;
}

const SWIPE_THRESHOLD = 80; // px of horizontal drag to commit, rather than snap back

/**
 * One Triage card. Swipe right = Today, swipe left = Drop — an accelerator over
 * the buttons below, which always stay (CLAUDE.md §5 / PROMPTS.md Phase 4). No
 * colour-coding the drag direction: --signal stays reserved, so the only
 * feedback is the card itself moving and a neutral text hint fading in.
 */
export default function TriageCard({ entry, onToday, onReschedule, onDrop }: TriageCardProps) {
  const [dragX, setDragX] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>): void {
    dragging.current = true;
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>): void {
    if (!dragging.current) return;
    setDragX(e.clientX - startX.current);
  }

  function handlePointerUp(): void {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragX > SWIPE_THRESHOLD) onToday();
    else if (dragX < -SWIPE_THRESHOLD) onDrop();
    setDragX(0);
  }

  const hintOpacity = Math.min(1, Math.abs(dragX) / SWIPE_THRESHOLD);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6">
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateX(${dragX}px) rotate(${dragX / 24}deg)`,
          transition: dragging.current ? 'none' : 'transform 150ms ease-out',
          touchAction: 'pan-y',
        }}
        className="relative flex flex-1 flex-col justify-center gap-2 rounded bg-panel px-5 py-8"
      >
        {dragX !== 0 && (
          <span
            className="absolute top-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
            style={{ opacity: hintOpacity, ...(dragX > 0 ? { right: 20 } : { left: 20 }) }}
          >
            {dragX > 0 ? 'Today' : 'Drop'}
          </span>
        )}
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          Overdue since {format(parseISO(entry.dayKey!), 'EEE, MMM d')}
        </span>
        <span className="text-heading text-paper">{entry.title}</span>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onToday}
          className="min-h-[56px] rounded border border-rule text-title text-paper"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onReschedule}
          className="min-h-[56px] rounded border border-rule text-title text-paper"
        >
          Reschedule
        </button>
        <button
          type="button"
          onClick={onDrop}
          className="min-h-[56px] rounded border border-rule text-title text-muted"
        >
          Drop
        </button>
      </div>
    </div>
  );
}
