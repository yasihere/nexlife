import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getByDayRange } from '../data/queries';
import { weekDayKeys } from '../lib/weekAggregation';
import { buildReview } from '../lib/reviewSummary';
import { todayKey, addDays } from '../lib/time';
import BottomNav from '../components/BottomNav';
import WeekBars from '../components/WeekBars';

/**
 * Five honest sentences, weekly (PROMPTS.md Phase 12, #2). Defaults to last
 * week, not this one — a review looks back at something actually finished,
 * not a week still in progress.
 */
export default function Review() {
  const today = todayKey();
  const [weekOffset, setWeekOffset] = useState(-1);

  const anchorDay = addDays(today, weekOffset * 7);
  const days = weekDayKeys(anchorDay);
  const [fromDay, toDay] = [days[0], days[6]];

  const weekTasks = useLiveQuery(() => getByDayRange(fromDay, toDay), [fromDay, toDay]) ?? [];
  const { sentences, dayCounts } = buildReview(weekTasks, days);
  const weekLabel = `${fromDay.slice(5)} – ${toDay.slice(5)}`;

  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-void">
      <header className="flex items-center justify-between px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w - 1)}
          className="min-h-[44px] min-w-[44px] text-title text-muted"
        >
          ‹
        </button>
        <h1 className="text-heading text-paper">{weekOffset === -1 ? 'Last week' : weekLabel}</h1>
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w + 1)}
          className="min-h-[44px] min-w-[44px] text-title text-muted"
        >
          ›
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4">
        <WeekBars dayCounts={dayCounts} />

        <div className="mt-6 flex flex-col gap-3">
          {sentences.map((sentence, i) => (
            <p key={i} className="text-title text-paper">
              {sentence}
            </p>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
