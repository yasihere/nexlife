import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { format } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import NowLine from '../components/NowLine';
import EntryRow from '../components/EntryRow';
import BottomNav from '../components/BottomNav';
import Sheet from '../components/Sheet';
import QuickAdd from '../components/QuickAdd';
import EmptyState from '../components/EmptyState';
import { getByDay, complete, uncomplete } from '../data/entries';
import { seed } from '../data/seed';
import { todayKey, DEFAULT_DAY_START_HOUR } from '../lib/time';
import { subscribeNow, now } from '../lib/clock';
import { layoutDay } from '../lib/layout';
import type { Entry } from '../data/types';

const ROW_HEIGHT = 64; // px per hour
const GUTTER = 64; // px — hour-label column, wide enough for "12:27 PM"
const RIGHT_MARGIN = 8; // px — matches the grid's px-4 minus the outer px-4 already on the scroller
const COLUMN_GAP = 4; // px between side-by-side overlapping entries
const MIN_TOUCH_HEIGHT = 44; // px — CLAUDE.md §5, even for a 5-minute entry
const SCROLL_BIAS = 0.35; // Now Line sits ~35% from the top on first render

// A day-start hour shifts which calendar hour opens the grid (e.g. 4am instead of
// midnight) — see CLAUDE.md §7. No Settings UI exists yet to change it (Phase 7),
// so this is wired to the default but is otherwise the real, final code path.
const DAY_START_HOUR = DEFAULT_DAY_START_HOUR;

/** Minutes-from-midnight, shifted so the day-start hour becomes minute 0. */
function relativeMinutes(min: number, dayStartHour: number): number {
  return (((min - dayStartHour * 60) % 1440) + 1440) % 1440;
}

export default function Today() {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [parseTestSummary, setParseTestSummary] = useState<string | null>(null);

  async function runParseTests(): Promise<void> {
    const { runParseTests: run } = await import('../data/parseTestCases');
    const results = await run();
    const failed = results.filter((r) => r.failures.length > 0);
    setParseTestSummary(`${results.length - failed.length}/${results.length} passed`);
    if (failed.length) {
      // eslint-disable-next-line no-console
      console.table(failed.map((r) => ({ name: r.name, failures: r.failures.join('; ') })));
    }
  }

  const nowMs = useSyncExternalStore(subscribeNow, now, now);
  const nowDate = new Date(nowMs);
  const nowMinAbs = nowDate.getHours() * 60 + nowDate.getMinutes();
  const nowMinRel = relativeMinutes(nowMinAbs, DAY_START_HOUR);
  const nowTop = (nowMinRel / 60) * ROW_HEIGHT;

  // Scroll so the Now Line sits ~35% from the top, the first time the grid
  // actually exists. A plain mount-effect isn't enough: if Today starts in the
  // empty state, the grid element doesn't exist yet at mount, and a one-shot
  // effect would never get a second chance once real data makes it appear. A
  // callback ref fires exactly when the DOM node itself mounts, whichever
  // render that happens on. nowTopRef keeps it reading a fresh value without
  // making the callback's identity (and therefore its one-shot guard) churn
  // every minute when the clock ticks.
  const nowTopRef = useRef(nowTop);
  nowTopRef.current = nowTop;
  const hasScrolled = useRef(false);
  const setGridRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || hasScrolled.current) return;
    hasScrolled.current = true;
    node.scrollTop = Math.max(0, nowTopRef.current - node.clientHeight * SCROLL_BIAS);
  }, []);

  const today = todayKey(DAY_START_HOUR);
  const entries = useLiveQuery(() => getByDay(today), [today]) ?? [];

  const scheduled = entries.filter(
    (e): e is Entry & { startMin: number } => e.startMin != null
  );
  const unscheduled = entries.filter((e) => e.startMin == null);

  const layout = layoutDay(
    scheduled.map((e) => {
      const start = relativeMinutes(e.startMin, DAY_START_HOUR);
      return { id: e.id, start, end: start + (e.estimateMin ?? 30) };
    })
  );

  const remaining = entries.filter((e) => !e.completedAt).length;
  const progress = entries.length === 0 ? 0 : (entries.length - remaining) / entries.length;

  function toggleComplete(entry: Entry): void {
    void (entry.completedAt ? uncomplete(entry.id) : complete(entry.id));
  }

  const HOURS = Array.from({ length: 24 }, (_, i) => (DAY_START_HOUR + i) % 24);

  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-void">
      <header className="px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex items-baseline justify-between">
          <h1 className="text-heading text-paper">{format(nowDate, 'EEEE, MMM d')}</h1>
          {import.meta.env.DEV && (
            <div className="flex items-center gap-3">
              {parseTestSummary && (
                <span className="text-[11px] text-muted">{parseTestSummary}</span>
              )}
              <button
                type="button"
                className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
                onClick={() => void runParseTests()}
              >
                Tests
              </button>
              <button
                type="button"
                className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
                onClick={() => void seed()}
              >
                Seed
              </button>
            </div>
          )}
        </div>
        <p className="tabular-nums mt-1 text-sm text-muted">{remaining} remaining</p>
        <div className="mt-2 h-px w-full bg-rule">
          <div className="h-px bg-paper/60" style={{ width: `${progress * 100}%` }} />
        </div>
      </header>

      {entries.length === 0 ? (
        <EmptyState
          message="Nothing scheduled. Add the first thing you'll do today."
          actionLabel="Add task"
          onAction={() => setQuickAddOpen(true)}
        />
      ) : (
        <div ref={setGridRef} className="relative flex-1 overflow-y-auto px-4">
          <div className="relative" style={{ height: HOURS.length * ROW_HEIGHT }}>
            {HOURS.map((hour, i) => (
              <div
                key={hour}
                className="absolute inset-x-0 border-t border-rule"
                style={{ top: i * ROW_HEIGHT }}
              >
                <span
                  className="tabular-nums absolute -top-[6px] whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
                  style={{ width: GUTTER - 8 }}
                >
                  {format(new Date(0, 0, 0, hour), 'h a')}
                </span>
              </div>
            ))}

            {scheduled.map((entry) => {
              const rel = relativeMinutes(entry.startMin, DAY_START_HOUR);
              const top = (rel / 60) * ROW_HEIGHT;
              const rawHeight = ((entry.estimateMin ?? 30) / 60) * ROW_HEIGHT;
              const height = Math.max(rawHeight, MIN_TOUCH_HEIGHT);
              const { col, cols } = layout.get(entry.id) ?? { col: 0, cols: 1 };
              const totalGap = COLUMN_GAP * (cols - 1);
              const trackWidth = `(100% - ${GUTTER + RIGHT_MARGIN}px - ${totalGap}px)`;
              const width = `calc(${trackWidth} / ${cols})`;
              const left = `calc(${GUTTER}px + ${trackWidth} * ${col} / ${cols} + ${
                col * COLUMN_GAP
              }px)`;

              return (
                <EntryRow
                  key={entry.id}
                  title={entry.title}
                  time={format(new Date(0, 0, 0, 0, entry.startMin), 'h:mm a')}
                  top={top}
                  height={height}
                  left={left}
                  width={width}
                  onToggleComplete={() => toggleComplete(entry)}
                  completed={!!entry.completedAt}
                  overdue={rel < nowMinRel && !entry.completedAt}
                />
              );
            })}

            <NowLine top={nowTop} gutter={GUTTER} label={format(nowDate, 'h:mm a')} />
          </div>

          {unscheduled.length > 0 && (
            <div className="mb-4 mt-2 border-t border-rule pt-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Unscheduled
              </h2>
              <ul className="mt-2 flex flex-col gap-2">
                {unscheduled.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => toggleComplete(entry)}
                      className="flex min-h-[44px] w-full min-w-0 items-center rounded bg-panel px-3 text-left transition-opacity duration-[120ms]"
                      style={{ opacity: entry.completedAt ? 0.35 : 1 }}
                    >
                      <span
                        className="block w-full truncate text-title text-paper"
                        style={{ textDecoration: entry.completedAt ? 'line-through' : 'none' }}
                      >
                        {entry.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setQuickAddOpen(true)}
        className="min-h-[44px] border-t border-rule bg-panel text-title text-muted"
      >
        Add task
      </button>

      <BottomNav />

      <Sheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)}>
        <QuickAdd onClose={() => setQuickAddOpen(false)} />
      </Sheet>
    </div>
  );
}
