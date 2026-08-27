// Dev-only correctness checks for recurrence.ts — same plain-assertion pattern
// as parseTestCases.ts, run from the same dev "Tests" button. Zero React imports.

import { addDays, addWeeks, getDay } from 'date-fns';
import { nextOccurrence, expandSeries } from './recurrence';
import { dayKey, parseDayKey } from '../lib/time';
import type { Recurrence } from './types';

// An arbitrary fixed anchor. Its weekday is read back via getDay() rather than
// assumed, so these cases are correct regardless of what date this actually is.
const START = new Date(2026, 0, 1);
const START_KEY = dayKey(START);
const START_WEEKDAY = getDay(START);

interface Check {
  name: string;
  run: () => string[];
}

function expectEqual<T>(actual: T, expected: T, label: string, f: string[]): void {
  if (actual !== expected) f.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function expectArrayEqual(actual: string[], expected: string[], label: string, f: string[]): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    f.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const cases: Check[] = [
  {
    name: 'daily every 1: expandSeries covers every day in range',
    run: () => {
      const rule: Recurrence = { kind: 'daily', every: 1, startDay: START_KEY };
      const to = dayKey(addDays(START, 5));
      const expected = Array.from({ length: 6 }, (_, i) => dayKey(addDays(START, i)));
      const f: string[] = [];
      expectArrayEqual(expandSeries(rule, START_KEY, to), expected, 'days', f);
      return f;
    },
  },
  {
    name: 'daily every 3: nextOccurrence jumps to the next multiple',
    run: () => {
      const rule: Recurrence = { kind: 'daily', every: 3, startDay: START_KEY };
      const f: string[] = [];
      expectEqual(nextOccurrence(rule, dayKey(addDays(START, 1))), dayKey(addDays(START, 3)), 'next', f);
      expectEqual(nextOccurrence(rule, START_KEY), dayKey(addDays(START, 3)), 'next-from-start', f);
      return f;
    },
  },
  {
    name: 'weekly every 1 on 2 weekdays: exactly 4 matches over 2 weeks',
    run: () => {
      // Pick weekdays that are NOT the anchor's own weekday, so this is a clean
      // check regardless of what START actually falls on.
      const others = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== START_WEEKDAY).slice(0, 2);
      const rule: Recurrence = { kind: 'weekly', every: 1, weekdays: others, startDay: START_KEY };
      const to = dayKey(addDays(START, 13));
      const days = expandSeries(rule, START_KEY, to);
      const f: string[] = [];
      if (days.length !== 4) f.push(`expected 4 matches over 2 weeks, got ${days.length}: ${days.join(',')}`);
      for (const d of days) {
        if (!others.includes(getDay(parseDayKey(d)))) f.push(`day ${d} isn't one of the chosen weekdays`);
      }
      return f;
    },
  },
  {
    name: 'weekly every 2 (biweekly): the off week has zero matches',
    run: () => {
      const rule: Recurrence = {
        kind: 'weekly',
        every: 2,
        weekdays: [START_WEEKDAY],
        startDay: START_KEY,
      };
      const f: string[] = [];
      const weekOneStart = dayKey(addWeeks(START, 1));
      const weekOneEnd = dayKey(addDays(addWeeks(START, 1), 6));
      expectArrayEqual(expandSeries(rule, weekOneStart, weekOneEnd), [], 'off-week', f);
      expectEqual(nextOccurrence(rule, START_KEY), dayKey(addWeeks(START, 2)), 'next-active-week', f);
      return f;
    },
  },
  {
    name: 'monthly clamps dayOfMonth to the shortest month in range',
    run: () => {
      const rule: Recurrence = { kind: 'monthly', every: 1, dayOfMonth: 31, startDay: dayKey(new Date(2026, 0, 31)) };
      const f: string[] = [];
      // 2026 isn't a leap year — Feb has 28 days, so the 31st clamps to the 28th.
      expectEqual(
        nextOccurrence(rule, dayKey(new Date(2026, 1, 1))),
        dayKey(new Date(2026, 1, 28)),
        'feb-clamp',
        f
      );
      // April has 30 days.
      expectEqual(
        nextOccurrence(rule, dayKey(new Date(2026, 3, 1))),
        dayKey(new Date(2026, 3, 30)),
        'apr-clamp',
        f
      );
      return f;
    },
  },
  {
    name: 'monthly every 2: skips the alternate month',
    run: () => {
      const rule: Recurrence = { kind: 'monthly', every: 2, dayOfMonth: 15, startDay: dayKey(new Date(2026, 0, 15)) };
      const f: string[] = [];
      expectEqual(
        nextOccurrence(rule, dayKey(new Date(2026, 0, 15))),
        dayKey(new Date(2026, 2, 15)),
        'skips-feb',
        f
      );
      return f;
    },
  },
  {
    name: 'timesPerWeek never expands (no fixed schedule)',
    run: () => {
      const rule: Recurrence = { kind: 'timesPerWeek', count: 3 };
      const f: string[] = [];
      expectEqual(nextOccurrence(rule, START_KEY), null, 'next', f);
      expectArrayEqual(expandSeries(rule, START_KEY, dayKey(addDays(START, 30))), [], 'expand', f);
      return f;
    },
  },
  {
    name: 'nextOccurrence is strictly after — an exact match day returns the following one',
    run: () => {
      const rule: Recurrence = { kind: 'daily', every: 5, startDay: START_KEY };
      const f: string[] = [];
      const secondOccurrence = dayKey(addDays(START, 5));
      expectEqual(nextOccurrence(rule, secondOccurrence), dayKey(addDays(START, 10)), 'strict-after', f);
      return f;
    },
  },
];

export function runRecurrenceTests(): { name: string; failures: string[] }[] {
  return cases.map((c) => {
    let failures: string[];
    try {
      failures = c.run();
    } catch (e) {
      failures = [`threw: ${e instanceof Error ? e.message : String(e)}`];
    }
    return { name: c.name, failures };
  });
}
