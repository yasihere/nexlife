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

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ordinal(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'st';
  if (n % 10 === 2 && n % 100 !== 12) return 'nd';
  if (n % 10 === 3 && n % 100 !== 13) return 'rd';
  return 'th';
}

/** EntrySheet's read-only summary for an already-recurring entry — plain
 *  English, same rule shape nextOccurrence/expandSeries above work from. */
export function describeRecurrence(rule: Recurrence): string {
  if (rule.kind === 'daily') return rule.every === 1 ? 'Repeats daily' : `Repeats every ${rule.every} days`;
  if (rule.kind === 'weekly') {
    const days = rule.weekdays.map((d) => WEEKDAY_LABELS[d]).join(', ');
    return rule.every === 1 ? `Repeats weekly on ${days}` : `Repeats every ${rule.every} weeks on ${days}`;
  }
  if (rule.kind === 'monthly') {
    const day = `${rule.dayOfMonth}${ordinal(rule.dayOfMonth)}`;
    return rule.every === 1 ? `Repeats monthly on the ${day}` : `Repeats every ${rule.every} months on the ${day}`;
  }
  return `${rule.count}x a week`;
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
    // An empty weekdays list can never match `rule.weekdays.includes(getDay(d))`
    // below — without this, the loop would walk forward one day at a time,
    // forever, never once hitting the `yield` that lets a caller's own
    // iteration-count check (MAX_ITERATIONS) run. That check lives in the
    // *consumer* (nextOccurrence/expandSeries), which only gets a turn once
    // per yielded value — so a generator that never yields never returns
    // control at all. This was a real bug: a task saved with "Repeat weekly"
    // and no day picked (RecurrenceEditor's own default before a day is
    // tapped) freezes the entire app's main thread the moment
    // materializeDueOccurrences touches it, on every single launch, since the
    // JS engine is single-threaded and this generator is a plain synchronous
    // `while(true)` with no `await` to yield control back. See
    // RecurrenceEditor.tsx / EntrySheet.tsx for the save-time guard that stops
    // this rule shape from being created again.
    if (rule.weekdays.length === 0) return;
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
