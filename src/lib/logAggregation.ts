// Pure aggregation for the Log screen (PROMPTS.md Phase 10). Zero React
// imports — the screen itself just renders whatever these return.

import { startOfWeek, startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { dayKey, parseDayKey, addDays, todayKey } from './time';
import type { Entry } from '../data/types';

export const SPARKLINE_DAYS = 14;

/** Shared by the Log screen and the quick-add preview chip. */
export function formatLogAmount(unit: string, amount: number): string {
  if (unit === 'INR') return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  if (unit === 'kg') return `${amount.toFixed(1)} kg`;
  if (unit === 'steps') return `${Math.round(amount).toLocaleString()} steps`;
  if (unit === 'ml') return amount >= 1000 ? `${(amount / 1000).toFixed(1)} L` : `${Math.round(amount)} ml`;
  if (unit === 'hrs') return `${amount.toFixed(1)} hrs`;
  return `${amount} ${unit}`;
}

export interface UnitSummary {
  unit: string;
  weekTotal: number;
  monthTotal: number;
  /** Oldest to newest, one total per day, SPARKLINE_DAYS long. */
  dailyTotals: number[];
}

function sumInRange(logs: Entry[], fromKey: string, toKey: string): number {
  return logs
    .filter((e) => e.dayKey! >= fromKey && e.dayKey! <= toKey)
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);
}

/** Groups logs by unit, with this-week/this-month totals and a daily
 *  sparkline series per unit (PROMPTS.md Phase 10, #3). */
export function groupLogsByUnit(logs: Entry[], today: string = todayKey()): UnitSummary[] {
  const byUnit = new Map<string, Entry[]>();
  for (const log of logs) {
    if (!log.unit) continue;
    const list = byUnit.get(log.unit) ?? [];
    list.push(log);
    byUnit.set(log.unit, list);
  }

  const weekStart = dayKey(startOfWeek(parseDayKey(today)));
  const monthStart = dayKey(startOfMonth(parseDayKey(today)));
  const sparklineStart = addDays(today, -(SPARKLINE_DAYS - 1));

  const summaries: UnitSummary[] = [];
  for (const [unit, entries] of byUnit) {
    const dailyTotals: number[] = [];
    for (let i = 0; i < SPARKLINE_DAYS; i++) {
      const day = addDays(sparklineStart, i);
      dailyTotals.push(sumInRange(entries, day, day));
    }
    summaries.push({
      unit,
      weekTotal: sumInRange(entries, weekStart, today),
      monthTotal: sumInRange(entries, monthStart, today),
      dailyTotals,
    });
  }
  return summaries.sort((a, b) => a.unit.localeCompare(b.unit));
}

export interface TagTotal {
  tag: string;
  total: number;
}

/**
 * Money (INR) total by tag, this month. An entry with several tags counts its
 * full amount toward each — the same "total by tag" a tag-based expense view
 * always means, not a per-dollar split.
 */
export function moneyByTag(logs: Entry[], today: string = todayKey()): TagTotal[] {
  const monthStart = dayKey(startOfMonth(parseDayKey(today)));
  const totals = new Map<string, number>();
  for (const log of logs) {
    if (log.unit !== 'INR' || !log.dayKey || log.dayKey < monthStart || log.dayKey > today) continue;
    for (const tag of log.tags) {
      totals.set(tag, (totals.get(tag) ?? 0) + (log.amount ?? 0));
    }
  }
  return Array.from(totals, ([tag, total]) => ({ tag, total })).sort((a, b) => b.total - a.total);
}

/**
 * The three tags whose INR total grew the most vs last month — positive
 * growth only, a flat or shrinking tag isn't "growing" (PROMPTS.md Phase 10).
 */
export function topGrowingTags(logs: Entry[], today: string = todayKey()): TagTotal[] {
  const monthStart = dayKey(startOfMonth(parseDayKey(today)));
  const lastMonthDate = subMonths(parseDayKey(today), 1);
  const lastMonthStart = dayKey(startOfMonth(lastMonthDate));
  const lastMonthEnd = dayKey(endOfMonth(lastMonthDate));

  const thisMonth = new Map<string, number>();
  const lastMonth = new Map<string, number>();
  for (const log of logs) {
    if (log.unit !== 'INR' || !log.dayKey) continue;
    for (const tag of log.tags) {
      if (log.dayKey >= monthStart && log.dayKey <= today) {
        thisMonth.set(tag, (thisMonth.get(tag) ?? 0) + (log.amount ?? 0));
      } else if (log.dayKey >= lastMonthStart && log.dayKey <= lastMonthEnd) {
        lastMonth.set(tag, (lastMonth.get(tag) ?? 0) + (log.amount ?? 0));
      }
    }
  }

  const growth: TagTotal[] = [];
  for (const [tag, total] of thisMonth) {
    const delta = total - (lastMonth.get(tag) ?? 0);
    if (delta > 0) growth.push({ tag, total: delta });
  }
  return growth.sort((a, b) => b.total - a.total).slice(0, 3);
}
