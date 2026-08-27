import { useLiveQuery } from 'dexie-react-hooks';
import { getAllLogs } from '../data/queries';
import { softDelete } from '../data/entries';
import { groupLogsByUnit, moneyByTag, topGrowingTags, formatLogAmount } from '../lib/logAggregation';
import { todayKey } from '../lib/time';
import { replace } from '../lib/nav';
import { setPendingAddTask } from '../lib/launchIntent';
import Sparkline from '../components/Sparkline';
import BottomNav from '../components/BottomNav';
import EmptyState from '../components/EmptyState';
import type { Entry } from '../data/types';

const UNIT_LABEL: Record<string, string> = {
  INR: 'Money',
  kg: 'Weight',
  steps: 'Steps',
  ml: 'Water',
  hrs: 'Sleep',
};

const RECENT_PER_UNIT = 5;

function goAddTask(): void {
  setPendingAddTask();
  replace('today');
}

/** Grouped by unit, this-week/this-month totals, a sparkline per unit, and a
 *  money-by-tag breakdown (PROMPTS.md Phase 10). Read-mostly by design — no
 *  edit UI, just tap-to-drop for fixing a mis-logged entry. */
export default function Log() {
  const today = todayKey();
  const logs = useLiveQuery(() => getAllLogs()) ?? [];
  const units = groupLogsByUnit(logs, today);
  const tagTotals = moneyByTag(logs, today);
  const growing = topGrowingTags(logs, today);

  function recentFor(unit: string): Entry[] {
    return logs
      .filter((e) => e.unit === unit)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, RECENT_PER_UNIT);
  }

  return (
    <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-void">
      <header className="px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
        <h1 className="text-heading text-paper">Log</h1>
      </header>

      {logs.length === 0 ? (
        <EmptyState
          message="Nothing logged yet. Try '500 groceries #food' or '72.5kg' in quick add."
          actionLabel="Add task"
          onAction={goAddTask}
        />
      ) : (
        <div className="flex-1 overflow-y-auto px-4">
          {tagTotals.length > 0 && (
            <section className="flex flex-col gap-2 border-b border-rule pb-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Money — this month
              </span>
              <ul className="flex flex-col gap-1">
                {tagTotals.map(({ tag, total }) => (
                  <li key={tag} className="flex items-center justify-between">
                    <span className="text-title text-paper">#{tag}</span>
                    <span className="tabular-nums text-title text-paper">{formatLogAmount('INR', total)}</span>
                  </li>
                ))}
              </ul>
              {growing.length > 0 && (
                <p className="text-title text-muted">Growing: {growing.map((g) => `#${g.tag}`).join(', ')}</p>
              )}
            </section>
          )}

          <div className="flex flex-col gap-5 py-4">
            {units.map((u) => (
              <section key={u.unit} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                    {UNIT_LABEL[u.unit] ?? u.unit}
                  </span>
                  <Sparkline values={u.dailyTotals} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-title text-muted">This week</span>
                  <span className="tabular-nums text-title text-paper">
                    {formatLogAmount(u.unit, u.weekTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-title text-muted">This month</span>
                  <span className="tabular-nums text-title text-paper">
                    {formatLogAmount(u.unit, u.monthTotal)}
                  </span>
                </div>

                <ul className="flex flex-col gap-1">
                  {recentFor(u.unit).map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => void softDelete(entry.id)}
                        className="flex min-h-[44px] w-full items-center justify-between rounded bg-panel px-3 text-left"
                      >
                        <span className="min-w-0 truncate text-title text-paper">
                          {entry.title || UNIT_LABEL[u.unit] || u.unit}
                        </span>
                        <span className="tabular-nums shrink-0 pl-2 text-title text-muted">
                          {formatLogAmount(u.unit, entry.amount ?? 0)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
