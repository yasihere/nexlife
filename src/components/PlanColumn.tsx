import { format } from 'date-fns';
import { parseDayKey } from '../lib/time';
import PlanEntryChip from './PlanEntryChip';
import type { Entry } from '../data/types';

interface PlanColumnProps {
  day: string;
  entries: Entry[];
  isToday: boolean;
  isDropTarget: boolean;
  columnRef: (el: HTMLDivElement | null) => void;
  onDragUpdate: (entry: Entry | null, x: number, y: number) => void;
  onDrop: (entry: Entry, x: number, y: number) => void;
}

const MAX_BAR_HEIGHT = 32;
const BAR_UNIT = 6; // px per entry, capped — a density block, not a precise chart

/** One day of Plan's week — a density bar, a count, and its entries
 *  (PROMPTS.md Phase 12, #1). Read-mostly: no tap-to-edit here. */
export default function PlanColumn({
  day,
  entries,
  isToday,
  isDropTarget,
  columnRef,
  onDragUpdate,
  onDrop,
}: PlanColumnProps) {
  const barHeight = Math.min(MAX_BAR_HEIGHT, entries.length * BAR_UNIT);

  return (
    <div
      ref={columnRef}
      className="flex min-h-[120px] flex-1 flex-col gap-1 rounded p-1"
      style={{ outline: isDropTarget ? '1px solid var(--muted)' : 'none' }}
    >
      <span
        className={
          'text-center text-[11px] font-semibold uppercase tracking-[0.08em] ' +
          (isToday ? 'text-paper' : 'text-muted')
        }
      >
        {format(parseDayKey(day), 'EEE d')}
      </span>
      <div className="flex h-8 items-end justify-center">
        <div className="w-4 rounded-sm bg-rule" style={{ height: barHeight }} />
      </div>
      <span className="tabular-nums text-center text-[11px] text-muted">{entries.length}</span>

      <div className="flex flex-col gap-1">
        {entries.map((entry) => (
          <PlanEntryChip key={entry.id} entry={entry} onDragUpdate={onDragUpdate} onDrop={onDrop} />
        ))}
      </div>
    </div>
  );
}
