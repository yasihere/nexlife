import { format } from 'date-fns';
import { parseDayKey } from '../lib/time';
import type { DayCount } from '../lib/weekAggregation';

interface WeekBarsProps {
  dayCounts: DayCount[];
}

const MAX_BAR_HEIGHT = 40;
const BAR_UNIT = 6;

/**
 * The one chart in Review — the week's shape, which "Wednesday was busiest"
 * alone doesn't show (PROMPTS.md Phase 12, #2: "a chart only where a chart
 * says something a sentence can't"). Static — Plan already owns interaction.
 */
export default function WeekBars({ dayCounts }: WeekBarsProps) {
  return (
    <div className="flex justify-between gap-2">
      {dayCounts.map(({ dayKey, count }) => (
        <div key={dayKey} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-10 items-end">
            <div
              className="w-4 rounded-sm bg-rule"
              style={{ height: Math.min(MAX_BAR_HEIGHT, count * BAR_UNIT) }}
            />
          </div>
          <span className="text-[11px] uppercase tracking-[0.08em] text-muted">
            {format(parseDayKey(dayKey), 'EEEEE')}
          </span>
        </div>
      ))}
    </div>
  );
}
