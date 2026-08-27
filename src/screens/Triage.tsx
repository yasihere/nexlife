import { useEffect, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import Sheet from '../components/Sheet';
import TriageCard from '../components/TriageCard';
import { getOverdue, getDaySummary } from '../data/queries';
import { update, drop, dropOlderThan } from '../data/entries';
import { updateSettings } from '../data/settings';
import { todayKey, addDays, nextWeekendKey, nextWeekKey } from '../lib/time';
import type { Entry } from '../data/types';

interface TriageProps {
  /** "Later" was tapped, or the closing summary was acknowledged — show Today. */
  onDone: () => void;
}

const BULK_DROP_AGE_DAYS = 14;

interface Session {
  total: number;
  oldestDayKey: string;
}

/**
 * The morning backlog queue (SPEC.md "Triage"). App.tsx only mounts this when
 * there's actually overdue work — "zero overdue, never show it" is enforced
 * there, not here, but see the defensive fallback below too.
 */
export default function Triage({ onDone }: TriageProps) {
  const today = todayKey();
  const overdue = useLiveQuery(() => getOverdue(today), [today]);

  // Freeze the session's starting point once data first loads, so the counter
  // and the closing summary's date range don't shift as cards get processed.
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    if (session === null && overdue !== undefined && overdue.length > 0) {
      setSession({ total: overdue.length, oldestDayKey: overdue[0].dayKey! });
    }
  }, [session, overdue]);

  const [rescheduling, setRescheduling] = useState<Entry | null>(null);
  const [summary, setSummary] = useState<{ done: number; dropped: number; label: string } | null>(
    null
  );
  const stored = useRef(false);

  const cleared = session !== null && overdue !== undefined && overdue.length === 0;

  // Store lastTriageDay only once the queue is actually fully emptied (SPEC.md),
  // then compute the closing line over the range this session covered.
  useEffect(() => {
    if (!cleared || stored.current) return;
    stored.current = true;
    const yesterday = addDays(today, -1);
    const from = session!.oldestDayKey;
    void (async () => {
      await updateSettings({ lastTriageDay: today });
      const { done, dropped } = await getDaySummary(from, yesterday);
      const label = from === yesterday ? 'Yesterday' : `Since ${format(parseISO(from), 'MMM d')}`;
      setSummary({ done, dropped, label });
    })();
  }, [cleared, today, session]);

  if (overdue === undefined) return <div className="h-dvh bg-void" />;

  if (summary) {
    return (
      <div className="mx-auto flex h-dvh max-w-[430px] flex-col items-center justify-center gap-6 bg-void px-8 text-center">
        <p className="text-title text-paper">
          {summary.label}: {summary.done} done, {summary.dropped} dropped.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="min-h-[44px] rounded border border-rule px-6 text-title text-paper"
        >
          Continue
        </button>
      </div>
    );
  }

  if (overdue.length === 0) {
    // A session never started (queue was already empty on arrival) — hand back
    // to Today with no summary and no lastTriageDay write; nothing to triage.
    // If a session WAS in progress, we're just here between the last card
    // clearing and the summary effect above finishing its async writes —
    // render a beat, not a bounce to Today, so the closing line isn't skipped.
    if (session === null) onDone();
    return <div className="h-dvh bg-void" />;
  }

  const current = overdue[0];
  const total = session?.total ?? overdue.length;
  const position = Math.min(total, total - overdue.length + 1);

  const bulkCutoff = addDays(today, -BULK_DROP_AGE_DAYS);
  const bulkCount = overdue.filter((e) => e.dayKey! < bulkCutoff).length;

  async function handleReschedule(entry: Entry, dayKey: string): Promise<void> {
    await update(entry.id, { dayKey });
    setRescheduling(null);
  }

  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-void">
      <header className="flex items-baseline justify-between px-4 pt-[max(16px,env(safe-area-inset-top))]">
        <h1 className="text-heading text-paper">Triage</h1>
        <div className="flex items-center gap-4">
          <span className="tabular-nums text-sm text-muted">
            {position} of {total}
          </span>
          <button type="button" onClick={onDone} className="min-h-[44px] text-sm text-muted">
            Later
          </button>
        </div>
      </header>

      {bulkCount > 0 && (
        <div className="px-4 pt-2">
          <button
            type="button"
            onClick={() => void dropOlderThan(bulkCutoff)}
            className="min-h-[44px] w-full rounded border border-rule text-sm text-muted"
          >
            Drop all older than {BULK_DROP_AGE_DAYS} days ({bulkCount})
          </button>
        </div>
      )}

      <TriageCard
        key={current.id}
        entry={current}
        onToday={() => void update(current.id, { dayKey: today })}
        onReschedule={() => setRescheduling(current)}
        onDrop={() => void drop(current.id)}
      />

      <Sheet open={rescheduling !== null} onClose={() => setRescheduling(null)}>
        {rescheduling && (
          <div className="flex flex-col gap-2 p-4">
            <h2 className="text-heading text-paper">Reschedule</h2>
            {[
              { label: 'Tomorrow', dayKey: addDays(today, 1) },
              { label: 'This weekend', dayKey: nextWeekendKey(today) },
              { label: 'Next week', dayKey: nextWeekKey(today) },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => void handleReschedule(rescheduling, option.dayKey)}
                className="min-h-[44px] rounded border border-rule px-3 text-left text-title text-paper"
              >
                {option.label}
              </button>
            ))}
            <label className="flex min-h-[44px] items-center justify-between rounded border border-rule px-3">
              <span className="text-title text-paper">Pick a date</span>
              <input
                type="date"
                min={today}
                className="tabular-nums bg-transparent text-title text-paper"
                onChange={(e) => {
                  if (e.target.value) void handleReschedule(rescheduling, e.target.value);
                }}
              />
            </label>
          </div>
        )}
      </Sheet>
    </div>
  );
}
