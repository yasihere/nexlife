// Pure aggregation for the Log screen's Budgets section (Phase 13). Zero React
// imports, same shape as logAggregation.ts — the screen just renders whatever
// this returns.

import { getDaysInMonth, startOfMonth } from 'date-fns';
import { dayKey, parseDayKey, todayKey } from './time';
import type { Entry } from '../data/types';

/** Below this many days into the month, a linear pace projection is noise
 *  more than signal — one big day-1 purchase (rent, say) would extrapolate
 *  into a wildly overstated month-end number. Shown as null until then. */
const MIN_DAYS_FOR_PROJECTION = 3;

export interface BudgetStatus {
  id: string;
  tag: string;
  cap: number;
  /** INR spent against `tag` so far this month, recomputed live from logs —
   *  nothing here is stored month-to-month (see types.ts's budget comment). */
  spent: number;
  /** Linear pace projection to month end, or null before MIN_DAYS_FOR_PROJECTION. */
  projected: number | null;
  pctOfCap: number; // spent / cap, unclamped — a row clamps it for the bar width
  overCap: boolean; // already over, right now
  overPace: boolean; // projected to end the month over, even if not yet over
}

/** INR spent against one tag, `monthStart`..`today` inclusive. */
function spentForTag(logs: Entry[], tag: string, monthStart: string, today: string): number {
  let total = 0;
  for (const log of logs) {
    if (log.unit !== 'INR' || !log.dayKey) continue;
    if (log.dayKey < monthStart || log.dayKey > today) continue;
    if (!log.tags.includes(tag)) continue;
    total += log.amount ?? 0;
  }
  return total;
}

/** One budget entry's live status against this month's logs. */
export function budgetStatus(budget: Entry, logs: Entry[], today: string = todayKey()): BudgetStatus {
  const tag = budget.tags[0] ?? '';
  const cap = budget.target ?? 0;
  const monthStart = dayKey(startOfMonth(parseDayKey(today)));
  const spent = spentForTag(logs, tag, monthStart, today);

  const daysElapsed = parseDayKey(today).getDate();
  const daysInMonth = getDaysInMonth(parseDayKey(today));
  const projected = daysElapsed >= MIN_DAYS_FOR_PROJECTION ? (spent / daysElapsed) * daysInMonth : null;

  const pctOfCap = cap > 0 ? spent / cap : 0;
  return {
    id: budget.id,
    tag,
    cap,
    spent,
    projected,
    pctOfCap,
    overCap: cap > 0 && spent > cap,
    overPace: cap > 0 && projected !== null && projected > cap,
  };
}

/** Every active budget's status, sorted worst-first (over cap, then over
 *  pace, then by how close to the cap) so the one that needs attention is
 *  always on top — no manual reordering needed as the month goes on. */
export function allBudgetStatuses(budgets: Entry[], logs: Entry[], today: string = todayKey()): BudgetStatus[] {
  return budgets
    .map((b) => budgetStatus(b, logs, today))
    .sort((a, b) => {
      if (a.overCap !== b.overCap) return a.overCap ? -1 : 1;
      if (a.overPace !== b.overPace) return a.overPace ? -1 : 1;
      return b.pctOfCap - a.pctOfCap;
    });
}
