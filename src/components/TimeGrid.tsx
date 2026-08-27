import { format } from 'date-fns';
import EntryRow from './EntryRow';
import NowLine from './NowLine';
import type { Entry } from '../data/types';

export const ROW_HEIGHT = 64; // px per hour
const GUTTER = 64; // px — hour-label column, wide enough for "12:27 PM"
const RIGHT_MARGIN = 8; // px — matches the grid's px-4 minus the outer px-4 already on the scroller
const COLUMN_GAP = 4; // px between side-by-side overlapping entries
const MIN_TOUCH_HEIGHT = 44; // px — CLAUDE.md §5, even for a 5-minute entry

interface TimeGridProps {
  hours: number[];
  scheduled: (Entry & { startMin: number })[];
  layout: Map<string, { col: number; cols: number }>;
  relativeMinutes: (min: number) => number;
  nowTop: number;
  nowMinRel: number;
  nowLabel: string;
  childSummaries: Map<string, { done: number; total: number }>;
  onToggleComplete: (entry: Entry) => void;
  onOpen: (entry: Entry) => void;
}

/** The hour-ruled grid, its scheduled entries (overlap-packed), and the Now
 *  Line — Today's centrepiece, split out once Today.tsx grew past ~250 lines. */
export default function TimeGrid({
  hours,
  scheduled,
  layout,
  relativeMinutes,
  nowTop,
  nowMinRel,
  nowLabel,
  childSummaries,
  onToggleComplete,
  onOpen,
}: TimeGridProps) {
  return (
    <div className="relative" style={{ height: hours.length * ROW_HEIGHT }}>
      {hours.map((hour, i) => (
        <div key={hour} className="absolute inset-x-0 border-t border-rule" style={{ top: i * ROW_HEIGHT }}>
          <span
            className="tabular-nums absolute -top-[6px] whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
            style={{ width: GUTTER - 8 }}
          >
            {format(new Date(0, 0, 0, hour), 'h a')}
          </span>
        </div>
      ))}

      {scheduled.map((entry) => {
        const rel = relativeMinutes(entry.startMin);
        const top = (rel / 60) * ROW_HEIGHT;
        const rawHeight = ((entry.estimateMin ?? 30) / 60) * ROW_HEIGHT;
        const height = Math.max(rawHeight, MIN_TOUCH_HEIGHT);
        const { col, cols } = layout.get(entry.id) ?? { col: 0, cols: 1 };
        const totalGap = COLUMN_GAP * (cols - 1);
        const trackWidth = `(100% - ${GUTTER + RIGHT_MARGIN}px - ${totalGap}px)`;
        const width = `calc(${trackWidth} / ${cols})`;
        const left = `calc(${GUTTER}px + ${trackWidth} * ${col} / ${cols} + ${col * COLUMN_GAP}px)`;

        return (
          <EntryRow
            key={entry.id}
            title={entry.title}
            time={format(new Date(0, 0, 0, 0, entry.startMin), 'h:mm a')}
            top={top}
            height={height}
            left={left}
            width={width}
            onToggleComplete={() => onToggleComplete(entry)}
            onOpen={() => onOpen(entry)}
            completed={!!entry.completedAt}
            overdue={rel < nowMinRel && !entry.completedAt}
            priority={entry.priority}
            childProgress={childSummaries.get(entry.id)}
          />
        );
      })}

      <NowLine top={nowTop} gutter={GUTTER} label={nowLabel} />
    </div>
  );
}
