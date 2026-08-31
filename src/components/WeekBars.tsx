import { format } from 'date-fns';
import { parseDayKey } from '../lib/time';
import type { DayCount } from '../lib/weekAggregation';

interface WeekBarsProps {
  dayCounts: DayCount[];
  busiestDayKey: string;
  emptiestDayKey: string;
}

const MAX_BAR_HEIGHT = 64;
const BAR_UNIT = 10;

/**
 * The one chart in Review — the week's shape, which "Wednesday was busiest"
 * alone doesn't show (PROMPTS.md Phase 12, #2: "a chart only where a chart
 * says something a sentence can't"). Weight carries the busiest/emptiest
 * distinction, never colour (CLAUDE.md §5: priority is weight, not colour,
 * same rule EntryRow's priorityBorder already follows) — the busiest bar
 * fills solid `--paper`, every other bar stays a quieter `--rule`. Static —
 * Plan already owns interaction.
 */
export default function WeekBars({ dayCounts, busiestDayKey, emptiestDayKey }: WeekBarsProps) {
  const anyActivity = dayCounts.some((d) => d.count > 0);

  return (
    <div className="flex items-end justify-between gap-2 border-b border-rule pb-3">
      {dayCounts.map(({ dayKey, count }) => {
        const isBusiest = anyActivity && dayKey === busiestDayKey && count > 0;
        const isEmptiest = anyActivity && dayKey === emptiestDayKey && count === 0;
        return (
          <div key={dayKey} className="flex flex-1 flex-col items-center gap-1.5">
            <span className={'tabular-nums text-[11px] ' + (isBusiest ? 'text-paper' : 'text-muted')}>
              {count}
            </span>
            <div className="flex items-end" style={{ height: MAX_BAR_HEIGHT }}>
              <div
                className="w-full rounded-sm"
                style={{
                  height: Math.max(2, Math.min(MAX_BAR_HEIGHT, count * BAR_UNIT)),
                  backgroundColor: isBusiest ? 'var(--paper)' : 'var(--rule)',
                  opacity: isEmptiest ? 0.5 : 1,
                }}
              />
            </div>
            <span
              className={
                'text-[11px] font-semibold uppercase tracking-[0.08em] ' +
                (isBusiest ? 'text-paper' : 'text-muted')
              }
            >
              {format(parseDayKey(dayKey), 'EEEEE')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
