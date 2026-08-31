import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getAllBudgets, getAllLogs } from '../data/queries';
import { softDelete } from '../data/entries';
import { groupLogsByUnit, moneyByTag, topGrowingTags, formatLogAmount } from '../lib/logAggregation';
import { allBudgetStatuses } from '../lib/budgetAggregation';
import { todayKey } from '../lib/time';
import { replace } from '../lib/nav';
import { setPendingAddTask } from '../lib/launchIntent';
import Sparkline from '../components/Sparkline';
import TagChip from '../components/TagChip';
import BudgetRow from '../components/BudgetRow';
import BudgetForm from '../components/BudgetForm';
import BottomNav from '../components/BottomNav';
import Sheet from '../components/Sheet';
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
  const [budgetSheetEntry, setBudgetSheetEntry] = useState<Entry | null>(null);
  const [addingBudget, setAddingBudget] = useState(false);
  const logs = useLiveQuery(() => getAllLogs()) ?? [];
  const budgets = useLiveQuery(() => getAllBudgets()) ?? [];
  const units = groupLogsByUnit(logs, today);
  const tagTotals = moneyByTag(logs, today);
  const growing = topGrowingTags(logs, today);
  const budgetStatuses = allBudgetStatuses(budgets, logs, today);
  const budgetsById = new Map(budgets.map((b) => [b.id, b]));
  const moneyTags = Array.from(new Set(logs.filter((e) => e.unit === 'INR').flatMap((e) => e.tags))).sort();

  function closeBudgetSheet(): void {
    setBudgetSheetEntry(null);
    setAddingBudget(false);
  }

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
          message="Nothing logged yet. Try '₹500 groceries #food' or '72.5kg' in quick add."
          actionLabel="Add task"
          onAction={goAddTask}
        />
      ) : (
        <div className="flex-1 overflow-y-auto px-4">
          <section className="flex flex-col gap-2 border-b border-rule py-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Budgets</span>
            {budgetStatuses.length === 0 ? (
              <p className="text-title text-muted">No budgets set. Cap a tag you already spend against.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {budgetStatuses.map((status) => (
                  <li key={status.id}>
                    <BudgetRow
                      status={status}
                      onOpen={() => setBudgetSheetEntry(budgetsById.get(status.id) ?? null)}
                    />
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setAddingBudget(true)}
              className="min-h-[44px] rounded border border-rule text-title text-muted"
            >
              Add budget
            </button>
          </section>

          {tagTotals.length > 0 && (
            <section className="flex flex-col gap-2 border-b border-rule py-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Money — this month
              </span>
              <ul className="flex flex-col gap-1">
                {tagTotals.map(({ tag, total }) => (
                  <li key={tag} className="flex min-h-[44px] items-center justify-between">
                    <TagChip tag={tag} />
                    <span className="tabular-nums text-title text-paper">{formatLogAmount('INR', total)}</span>
                  </li>
                ))}
              </ul>
              {growing.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-1 text-title text-muted">
                  <span>Growing:</span>
                  {growing.map((g, i) => (
                    <span key={g.tag} className="inline-flex items-center">
                      <TagChip tag={g.tag} />
                      {i < growing.length - 1 && ','}
                    </span>
                  ))}
                </div>
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

      <Sheet open={addingBudget || !!budgetSheetEntry} onClose={closeBudgetSheet}>
        <BudgetForm
          entry={budgetSheetEntry ?? undefined}
          knownTags={moneyTags}
          otherBudgets={budgets.filter((b) => b.id !== budgetSheetEntry?.id)}
          onClose={closeBudgetSheet}
        />
      </Sheet>
    </div>
  );
}
