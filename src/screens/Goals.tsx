import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getAllGoals } from '../data/queries';
import BottomNav from '../components/BottomNav';
import Sheet from '../components/Sheet';
import EmptyState from '../components/EmptyState';
import GoalRow from '../components/GoalRow';
import GoalForm from '../components/GoalForm';
import type { Entry, GoalPeriod } from '../data/types';

const SECTIONS: { period: GoalPeriod; label: string }[] = [
  { period: 'week', label: 'This week' },
  { period: 'month', label: 'This month' },
  { period: 'year', label: 'This year' },
  { period: 'longterm', label: 'Long-term' },
  { period: 'lifetime', label: 'Lifetime' },
];

/**
 * Fully passive by design (your explicit choice): goals never nudge from
 * Triage or Review, they just sit here showing where you stand whenever you
 * choose to look. Reads mirror Log.tsx's shape — one live query, grouped
 * client-side, personal-scale data throughout.
 */
export default function Goals() {
  const [sheetEntry, setSheetEntry] = useState<Entry | null>(null);
  const [creating, setCreating] = useState(false);
  const goals = useLiveQuery(() => getAllGoals());
  const isLoading = goals === undefined;

  function closeSheet(): void {
    setSheetEntry(null);
    setCreating(false);
  }

  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-void">
      <header className="px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
        <h1 className="text-heading text-paper">Goals</h1>
      </header>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-title text-muted">Loading…</div>
      ) : goals.length === 0 ? (
        <EmptyState
          message="No goals yet. Set the first one you want to chase."
          actionLabel="Add goal"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-1">
          {SECTIONS.map(({ period, label }) => {
            const rows = goals.filter((g) => g.period === period);
            if (rows.length === 0) return null;
            return (
              <section key={period} className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  {label}
                </span>
                <ul className="flex flex-col gap-2">
                  {rows.map((entry) => (
                    <li key={entry.id}>
                      <GoalRow entry={entry} onOpen={() => setSheetEntry(entry)} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setCreating(true)}
        className="min-h-[44px] border-t border-rule bg-panel text-title text-muted"
      >
        Add goal
      </button>

      <BottomNav />

      <Sheet open={creating || !!sheetEntry} onClose={closeSheet}>
        <GoalForm entry={sheetEntry ?? undefined} onClose={closeSheet} />
      </Sheet>
    </div>
  );
}
