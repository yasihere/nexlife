import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import NowLine from '../components/NowLine';
import EntryRow from '../components/EntryRow';
import BottomNav from '../components/BottomNav';
import Sheet from '../components/Sheet';
import QuickAdd from '../components/QuickAdd';
import EmptyState from '../components/EmptyState';
import EntrySheet from '../components/EntrySheet';
import UnscheduledList from '../components/UnscheduledList';
import FilterBar, { EMPTY_FILTERS, matchesFilters, type Filters } from '../components/FilterBar';
import DevTools from '../components/DevTools';
import { getByDay, getById, getChildrenSummaryBatch } from '../data/queries';
import { complete, uncomplete } from '../data/entries';
import { materializeDueOccurrences } from '../data/series';
import { getSettings } from '../data/settings';
import BackupNag from '../components/BackupNag';
import { todayKey, DEFAULT_DAY_START_HOUR } from '../lib/time';
import { subscribeNow, now } from '../lib/clock';
import { layoutDay } from '../lib/layout';
import type { Entry } from '../data/types';

const BACKUP_NAG_DAYS = 14;

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
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [nagDismissed, setNagDismissed] = useState(false);

  const settings = useLiveQuery(() => getSettings());
  const daysSinceExport = settings?.lastExportAt
    ? differenceInCalendarDays(new Date(), new Date(settings.lastExportAt))
    : null;
  const showBackupNag =
    !nagDismissed && settings !== undefined && (daysSinceExport === null || daysSinceExport > BACKUP_NAG_DAYS);

  // A live query, not the Entry object captured at open-time — so if something
  // in the sheet itself changes the entry (e.g. the subtask "Complete" nudge),
  // the sheet's own read of e.g. completedAt reflects it immediately instead of
  // staying stale until closed and reopened.
  const editingEntry = useLiveQuery(
    () => (editingEntryId ? getById(editingEntryId) : undefined),
    [editingEntryId]
  );

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

  // Lazily materialise today's recurring occurrences before reading the day —
  // SPEC.md: "materialised lazily for the visible window only".
  useEffect(() => {
    void materializeDueOccurrences(today);
  }, [today]);

  const entries = useLiveQuery(() => getByDay(today), [today]) ?? [];
  const childSummaries =
    useLiveQuery(() => getChildrenSummaryBatch(entries.map((e) => e.id)), [entries]) ??
    new Map<string, { done: number; total: number }>();

  const scheduled = entries.filter((e): e is Entry & { startMin: number } => e.startMin != null);
  const unscheduled = entries.filter((e) => e.startMin == null);
  const filteredScheduled = scheduled.filter((e) => matchesFilters(e, filters));
  const filteredUnscheduled = unscheduled.filter((e) => matchesFilters(e, filters));
  const availableTags = Array.from(new Set(entries.flatMap((e) => e.tags))).sort();

  const layout = layoutDay(
    filteredScheduled.map((e) => {
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
  const nothingToday = entries.length === 0;
  const filteredOutEverything =
    !nothingToday && filteredScheduled.length === 0 && filteredUnscheduled.length === 0;

  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-void">
      <header className="px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex items-baseline justify-between">
          <h1 className="text-heading text-paper">{format(nowDate, 'EEEE, MMM d')}</h1>
          {import.meta.env.DEV && <DevTools />}
        </div>
        <p className="tabular-nums mt-1 text-sm text-muted">{remaining} remaining</p>
        <div className="mt-2 h-px w-full bg-rule">
          <div className="h-px bg-paper/60" style={{ width: `${progress * 100}%` }} />
        </div>
      </header>

      {showBackupNag && (
        <BackupNag daysSinceExport={daysSinceExport} onDismiss={() => setNagDismissed(true)} />
      )}

      {!nothingToday && (
        <FilterBar availableTags={availableTags} filters={filters} onChange={setFilters} />
      )}

      {nothingToday ? (
        <EmptyState
          message="Nothing scheduled. Add the first thing you'll do today."
          actionLabel="Add task"
          onAction={() => setQuickAddOpen(true)}
        />
      ) : filteredOutEverything ? (
        <div className="flex flex-1 items-center justify-center px-8 text-center text-title text-muted">
          Nothing matches these filters.
        </div>
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

            {filteredScheduled.map((entry) => {
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
                  onOpen={() => setEditingEntryId(entry.id)}
                  completed={!!entry.completedAt}
                  overdue={rel < nowMinRel && !entry.completedAt}
                  priority={entry.priority}
                  childProgress={childSummaries.get(entry.id)}
                />
              );
            })}

            <NowLine top={nowTop} gutter={GUTTER} label={format(nowDate, 'h:mm a')} />
          </div>

          <UnscheduledList
            entries={filteredUnscheduled}
            childSummaries={childSummaries}
            onToggleComplete={toggleComplete}
            onOpen={(entry) => setEditingEntryId(entry.id)}
          />
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

      <Sheet open={!!editingEntryId} onClose={() => setEditingEntryId(null)}>
        {editingEntry && (
          <EntrySheet
            key={editingEntry.id}
            entry={editingEntry}
            onClose={() => setEditingEntryId(null)}
          />
        )}
      </Sheet>
    </div>
  );
}
