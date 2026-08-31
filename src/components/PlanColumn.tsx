import { format } from 'date-fns';
import { parseDayKey } from '../lib/time';
import PlanEntryChip from './PlanEntryChip';
import type { Entry } from '../data/types';

interface PlanColumnProps {
  day: string;
  entries: Entry[];
  isToday: boolean;
  isPast: boolean;
  isDropTarget: boolean;
  columnRef: (el: HTMLDivElement | null) => void;
  onDragUpdate: (entry: Entry | null, x: number, y: number) => void;
  onDrop: (entry: Entry, x: number, y: number) => void;
  /** False in Plan's single-day view, where the screen's own header already
   *  names the day — repeating a mini weekday/date header on top of that
   *  would be redundant. True (the default) for the week grid, where each
   *  column needs its own label. */
  showHeader?: boolean;
}

/**
 * One day of Plan's week — a calendar-cell header (weekday, day number) and
 * its entries, weighted by priority/overdue exactly as Today's own grid does
 * (EntryRow's priorityBorder, --signal's overdue use) so the two screens
 * read as one visual language rather than two different apps. No separate
 * density bar/count: the chip stack already shows how full a day is — a bar
 * restating that wouldn't earn its space (same call Review's WeekBars makes
 * for its own chart). Read-mostly: no tap-to-edit here (PROMPTS.md Phase 12).
 */
export default function PlanColumn({
  day,
  entries,
  isToday,
  isPast,
  isDropTarget,
  columnRef,
  onDragUpdate,
  onDrop,
  showHeader = true,
}: PlanColumnProps) {
  const date = parseDayKey(day);

  return (
    <div
      ref={columnRef}
      className="flex min-h-[140px] flex-1 flex-col gap-1.5 rounded p-1"
      style={{
        backgroundColor: isToday ? 'var(--panel)' : 'transparent',
        outline: isDropTarget ? '1px solid var(--muted)' : 'none',
      }}
    >
      {showHeader && (
        <div
          className="flex flex-col items-center gap-0.5 border-b pb-1.5"
          style={{ borderColor: isToday ? 'var(--paper)' : 'var(--rule)' }}
        >
          <span
            className={
              'text-center text-[10px] uppercase tracking-[0.08em] ' +
              (isToday ? 'font-bold text-paper' : 'font-semibold text-muted')
            }
          >
            {format(date, 'EEE')}
          </span>
          <span
            className={'tabular-nums text-center text-[15px] leading-none ' + (isToday ? 'font-bold text-paper' : 'font-medium text-muted')}
          >
            {format(date, 'd')}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {entries.map((entry) => (
          <PlanEntryChip
            key={entry.id}
            entry={entry}
            overdue={isPast && !entry.completedAt}
            onDragUpdate={onDragUpdate}
            onDrop={onDrop}
          />
        ))}
      </div>
    </div>
  );
}
