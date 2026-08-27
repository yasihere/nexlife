// Pure recurrence engine (SPEC.md "stored as a rule, not 500 generated rows" /
// PROMPTS.md Phase 6). Zero React imports.

import {
  addDays as addDaysToDate,
  addMonths,
  differenceInCalendarWeeks,
  getDay,
  getDaysInMonth,
  setDate,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { Recurrence } from './types';
import { dayKey, parseDayKey } from '../lib/time';

// A circuit breaker for malformed rules (e.g. `weekdays: []`, which would
// otherwise never match and loop forever) — not a real limit in practice, since
// callers only ever ask about small windows.
const MAX_ITERATIONS = 3660; // ~10 years of days

type ScheduledRecurrence = Exclude<Recurrence, { kind: 'timesPerWeek' }>;

function isScheduled(rule: Recurrence): rule is ScheduledRecurrence {
  return rule.kind !== 'timesPerWeek';
}

/** Yields occurrence dayKeys in ascending order, starting at `rule.startDay`. */
function* iterate(rule: ScheduledRecurrence): Generator<string> {
  const step = Math.max(1, Math.floor(rule.every));
  const start = parseDayKey(rule.startDay);

  if (rule.kind === 'daily') {
    let d = start;
    while (true) {
      yield dayKey(d);
      d = addDaysToDate(d, step);
    }
  } else if (rule.kind === 'weekly') {
    const anchorWeekStart = startOfWeek(start);
    let d = start;
    while (true) {
      const weekIndex = differenceInCalendarWeeks(startOfWeek(d), anchorWeekStart);
      if (weekIndex % step === 0 && rule.weekdays.includes(getDay(d))) {
        yield dayKey(d);
      }
      d = addDaysToDate(d, 1);
    }
  } else {
    // monthly — jump a whole month at a time; no day-by-day walk needed.
    let cycle = 0;
    while (true) {
      const targetMonth = addMonths(startOfMonth(start), cycle * step);
      const clampedDay = Math.min(rule.dayOfMonth, getDaysInMonth(targetMonth));
      yield dayKey(setDate(targetMonth, clampedDay));
      cycle++;
    }
  }
}

/**
 * The first occurrence strictly after `after` (a dayKey). Null for
 * `timesPerWeek` (no fixed schedule to expand) or if nothing turns up within
 * the safety horizon.
 */
export function nextOccurrence(rule: Recurrence, after: string): string | null {
  if (!isScheduled(rule)) return null;
  let i = 0;
  for (const day of iterate(rule)) {
    if (day > after) return day;
    if (++i >= MAX_ITERATIONS) return null;
  }
  return null;
}

/**
 * Every occurrence within [fromDay, toDay], inclusive. Bounded by construction
 * — the visible window is always small, so this never risks "500 rows".
 */
export function expandSeries(rule: Recurrence, fromDay: string, toDay: string): string[] {
  if (!isScheduled(rule)) return [];
  const days: string[] = [];
  let i = 0;
  for (const day of iterate(rule)) {
    if (day > toDay) break;
    if (day >= fromDay) days.push(day);
    if (++i >= MAX_ITERATIONS) break;
  }
  return days;
}
