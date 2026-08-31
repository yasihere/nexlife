import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getByDayRange, getLogsByDayRange } from '../data/queries';
import { weekDayKeys } from '../lib/weekAggregation';
import { buildReview } from '../lib/reviewSummary';
import { todayKey, addDays } from '../lib/time';
import BottomNav from '../components/BottomNav';
import WeekBars from '../components/WeekBars';

/**
 * Five honest sentences, weekly (PROMPTS.md Phase 12, #2), plus a sixth only
 * when the week actually had money logged (reviewSummary.ts) — a deliberate,
 * flagged nudge past the phase's original "exactly five" gate, still bounded
 * and still one fact per sentence, never a dashboard. Defaults to last week,
 * not this one — a review looks back at something actually finished, not a
 * week still in progress.
 */
export default function Review() {
  const today = todayKey();
  const [weekOffset, setWeekOffset] = useState(-1);

  const anchorDay = addDays(today, weekOffset * 7);
  const days = weekDayKeys(anchorDay);
  const [fromDay, toDay] = [days[0], days[6]];
  const priorFromDay = addDays(fromDay, -7);
  const priorToDay = addDays(fromDay, -1);

  const weekTasks = useLiveQuery(() => getByDayRange(fromDay, toDay), [fromDay, toDay]) ?? [];
  const weekLogs = useLiveQuery(() => getLogsByDayRange(fromDay, toDay), [fromDay, toDay]) ?? [];
  const priorWeekLogs =
    useLiveQuery(() => getLogsByDayRange(priorFromDay, priorToDay), [priorFromDay, priorToDay]) ?? [];

  const { completedCount, droppedCount, sentences, dayCounts, busiestDayKey, emptiestDayKey } = buildReview(
    weekTasks,
    days,
    weekLogs,
    priorWeekLogs
  );
  const weekLabel = `${fromDay.slice(5)} – ${toDay.slice(5)}`;
  // The stat pair above already carries s1 (done/dropped) as numbers —
  // "Patterns" holds everything else so nothing repeats itself twice.
  const patterns = sentences.slice(1);

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

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="mt-1 flex gap-8">
          <div className="flex flex-col">
            <span className="tabular-nums text-[40px] font-bold leading-none text-paper">{completedCount}</span>
            <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Done</span>
          </div>
          <div className="flex flex-col">
            <span className="tabular-nums text-[40px] font-bold leading-none text-muted">{droppedCount}</span>
            <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Dropped
            </span>
          </div>
        </div>

        <div className="mt-6">
          <WeekBars dayCounts={dayCounts} busiestDayKey={busiestDayKey} emptiestDayKey={emptiestDayKey} />
        </div>

        <div className="mt-6 flex flex-col">
          <span className="pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Patterns</span>
          {patterns.map((sentence, i) => (
            <p key={i} className="border-t border-rule py-3 text-title text-paper first:border-t-0">
              {sentence}
            </p>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
