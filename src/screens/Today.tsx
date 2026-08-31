import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import BottomNav from '../components/BottomNav';
import Sheet from '../components/Sheet';
import QuickAdd from '../components/QuickAdd';
import EmptyState from '../components/EmptyState';
import EntrySheet from '../components/EntrySheet';
import UnscheduledList from '../components/UnscheduledList';
import TimeGrid, { ROW_HEIGHT } from '../components/TimeGrid';
import FilterBar, { EMPTY_FILTERS, matchesFilters, type Filters } from '../components/FilterBar';
import DevTools from '../components/DevTools';
import BackupNag from '../components/BackupNag';
import { getByDay, getById, getChildrenSummaryBatch, getUnscheduled, sortByManualOrder } from '../data/queries';
import { complete, uncomplete, reorder } from '../data/entries';
import { materializeDueOccurrences } from '../data/series';
import { getSettings } from '../data/settings';
import { hapticTick } from '../lib/native';
import { syncNotifications } from '../lib/notifications';
import { consumePendingAddTask, subscribeLaunchIntent } from '../lib/launchIntent';
import { todayKey, DEFAULT_DAY_START_HOUR } from '../lib/time';
import { subscribeNow, now } from '../lib/clock';
import { layoutDay } from '../lib/layout';
import type { Entry } from '../data/types';

const BACKUP_NAG_DAYS = 14;

// Stable fallback so entries/backlog keep the same reference across renders
// while their query is still loading, not a fresh `[]` every time — anything
// downstream that memoizes or keys off of them (allEntries below) depends on
// that stability.
const EMPTY_ENTRIES: Entry[] = [];

// A day-start hour shifts which calendar hour opens the grid (e.g. 4am instead of
// midnight) — see CLAUDE.md §7. No Settings UI exists yet to change it (Phase 7),
// so this is wired to the default but is otherwise the real, final code path.
const DAY_START_HOUR = DEFAULT_DAY_START_HOUR;
const SCROLL_BIAS = 0.35; // Now Line sits ~35% from the top on first render

/** Minutes-from-midnight, shifted so the day-start hour becomes minute 0. */
function relativeMinutes(min: number, dayStartHour: number): number {
  return (((min - dayStartHour * 60) % 1440) + 1440) % 1440;
}

export default function Today() {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [nagDismissed, setNagDismissed] = useState(false);

  // The "Add task" launcher shortcut (PROMPTS.md Phase 8, #6) sets this before
  // React may even have mounted (cold launch) or while already running (warm
  // relaunch) — check once now, then keep listening for a later one.
  useEffect(() => {
    function checkPendingAddTask(): void {
      if (consumePendingAddTask()) setQuickAddOpen(true);
    }
    checkPendingAddTask();
    return subscribeLaunchIntent(checkPendingAddTask);
  }, []);

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

  // undefined (still loading) is kept distinct from [] (genuinely empty) below
  // — collapsing them would flash the empty state's "add the first thing" CTA
  // before the real query resolves.
  const rawEntries = useLiveQuery(() => getByDay(today), [today]);
  const entries = rawEntries ?? EMPTY_ENTRIES;

  // Tasks with no dayKey at all — SPEC.md: "An 'Unscheduled' list below [the
  // grid]", and Phase 5's own worked example ("call bank" -> unscheduled task,
  // nothing else set). getByDay above can never return these (a missing
  // dayKey excludes a row from the [type+dayKey] index entirely), so without
  // this second query a task added with no recognised date is created
  // successfully but never rendered anywhere on Today — the empty-state and
  // "0 remaining" branches below would win outright, and the task is findable
  // only via Notes' global search. This was a real bug, not by design.
  const rawBacklog = useLiveQuery(() => getUnscheduled(), []);
  const backlog = rawBacklog ?? EMPTY_ENTRIES;
  const isLoading = rawEntries === undefined || rawBacklog === undefined;

  // Both queries feed the same screen — everything below (the remaining
  // count, the empty state, the filter bar's tag list, subtask progress)
  // should see backlog tasks exactly like today's own entries do.
  // Memoized on [entries, backlog], not recomputed on every render: `entries`
  // and `backlog` are stable references between actual DB changes (each
  // comes from its own useLiveQuery), but .concat() always returns a new
  // array. That new array was going straight into another useLiveQuery's
  // deps below — a fresh reference every render defeats that hook's
  // memoization and re-subscribes on every render, and each subscription's
  // resulting Map (also a new reference) forces another render, which builds
  // another new `allEntries`, forever. This was a real, tab-freezing bug.
  const allEntries = useMemo(() => entries.concat(backlog), [entries, backlog]);

  // Reminders + the ongoing summary (PROMPTS.md Phase 8, #4 #5) — resynced on
  // every write to today's entries, on the FULL day regardless of the
  // (ephemeral, UI-only) filter selection below. Backlog tasks have no
  // startMin/dayKey to remind against, so reminders stay scoped to `entries`.
  useEffect(() => {
    if (isLoading) return;
    void syncNotifications(entries, settings?.notificationLeadMin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawEntries, settings?.notificationLeadMin]);

  const childSummaries =
    useLiveQuery(() => getChildrenSummaryBatch(allEntries.map((e) => e.id)), [allEntries]) ??
    new Map<string, { done: number; total: number }>();

  const scheduled = entries.filter((e): e is Entry & { startMin: number } => e.startMin != null);
  const unscheduled = sortByManualOrder(entries.filter((e) => e.startMin == null).concat(backlog));
  const filteredScheduled = scheduled.filter((e) => matchesFilters(e, filters));
  const filteredUnscheduled = unscheduled.filter((e) => matchesFilters(e, filters));
  const availableTags = Array.from(new Set(allEntries.flatMap((e) => e.tags))).sort();

  const layout = layoutDay(
    filteredScheduled.map((e) => {
      const start = relativeMinutes(e.startMin, DAY_START_HOUR);
      return { id: e.id, start, end: start + (e.estimateMin ?? 30) };
    })
  );

  const remaining = allEntries.filter((e) => !e.completedAt).length;
  const progress = allEntries.length === 0 ? 0 : (allEntries.length - remaining) / allEntries.length;

  function toggleComplete(entry: Entry): void {
    if (entry.completedAt) {
      void uncomplete(entry.id);
    } else {
      void complete(entry.id);
      void hapticTick();
    }
  }

  const HOURS = Array.from({ length: 24 }, (_, i) => (DAY_START_HOUR + i) % 24);
  const nothingToday = !isLoading && allEntries.length === 0;
  const filteredOutEverything =
    !nothingToday && filteredScheduled.length === 0 && filteredUnscheduled.length === 0;

  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-void">
      <header className="px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex items-baseline justify-between">
          <h1 className="text-heading text-paper">{format(nowDate, 'EEEE, MMM d')}</h1>
          {import.meta.env.DEV && <DevTools />}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="tabular-nums text-sm text-muted">{remaining} remaining</p>
          {!nothingToday && !isLoading && (
            <FilterBar availableTags={availableTags} filters={filters} onChange={setFilters} />
          )}
        </div>
        <div className="mt-2 h-px w-full bg-rule">
          <div className="h-px bg-paper/60" style={{ width: `${progress * 100}%` }} />
        </div>
      </header>

      {showBackupNag && (
        <BackupNag daysSinceExport={daysSinceExport} onDismiss={() => setNagDismissed(true)} />
      )}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-title text-muted">Loading…</div>
      ) : nothingToday ? (
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
          <TimeGrid
            hours={HOURS}
            scheduled={filteredScheduled}
            layout={layout}
            relativeMinutes={(min) => relativeMinutes(min, DAY_START_HOUR)}
            nowTop={nowTop}
            nowMinRel={nowMinRel}
            nowLabel={format(nowDate, 'h:mm a')}
            childSummaries={childSummaries}
            onToggleComplete={toggleComplete}
            onOpen={(entry) => setEditingEntryId(entry.id)}
          />

          <UnscheduledList
            entries={filteredUnscheduled}
            childSummaries={childSummaries}
            onToggleComplete={toggleComplete}
            onOpen={(entry) => setEditingEntryId(entry.id)}
            onReorder={(orderedIds) => void reorder(orderedIds)}
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
