// Dev-only correctness checks for parse.ts's grammar — plain assertion
// functions, run from a dev-only button (see Today.tsx), not a test-runner
// dependency (none is in CLAUDE.md §3's locked stack). Zero React imports.

import { addDays, nextThursday, nextFriday, nextSaturday, getDay } from 'date-fns';
import { parseQuickAdd } from './parse';
import { dayKey as toDayKey } from '../lib/time';

// A fixed, deliberately-derived Wednesday so relative-day cases ("friday",
// "sat", "tomorrow") resolve the same regardless of when these actually run,
// and so "wed" itself is never used in a case (avoids the today-is-also-that-
// weekday ambiguity a hardcoded date could otherwise hide).
const anchorWednesday = addDays(nextThursday(new Date(2020, 0, 1)), -1);
const REF = new Date(
  anchorWednesday.getFullYear(),
  anchorWednesday.getMonth(),
  anchorWednesday.getDate(),
  9,
  0,
  0
);

function expectEqual<T>(actual: T, expected: T, label: string, failures: string[]): void {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

interface TestCase {
  name: string;
  run: () => Promise<string[]>; // failure messages; empty = pass
}

const cases: TestCase[] = [
  {
    name: 'pay rent friday 5pm #money !high ~30m',
    run: async () => {
      const r = await parseQuickAdd('pay rent friday 5pm #money !high ~30m', REF);
      const f: string[] = [];
      expectEqual(r.title, 'pay rent', 'title', f);
      expectEqual(r.tags.join(','), 'money', 'tags', f);
      expectEqual(r.priority, 3, 'priority', f);
      expectEqual(r.estimateMin, 30, 'estimateMin', f);
      expectEqual(r.dayKey, toDayKey(nextFriday(REF)), 'dayKey', f);
      expectEqual(r.startMin, 17 * 60, 'startMin', f);
      return f;
    },
  },
  {
    name: 'gym tomorrow 6am ~45m #health',
    run: async () => {
      const r = await parseQuickAdd('gym tomorrow 6am ~45m #health', REF);
      const f: string[] = [];
      expectEqual(r.title, 'gym', 'title', f);
      expectEqual(r.tags.join(','), 'health', 'tags', f);
      expectEqual(r.estimateMin, 45, 'estimateMin', f);
      expectEqual(r.dayKey, toDayKey(addDays(REF, 1)), 'dayKey', f);
      expectEqual(r.startMin, 6 * 60, 'startMin', f);
      return f;
    },
  },
  {
    name: 'call bank (bare — nothing else set)',
    run: async () => {
      const r = await parseQuickAdd('call bank', REF);
      const f: string[] = [];
      expectEqual(r.title, 'call bank', 'title', f);
      expectEqual(r.tags.length, 0, 'tags.length', f);
      expectEqual(r.priority, 0, 'priority', f);
      expectEqual(r.dayKey, undefined, 'dayKey', f);
      expectEqual(r.startMin, undefined, 'startMin', f);
      expectEqual(r.estimateMin, undefined, 'estimateMin', f);
      return f;
    },
  },
  {
    name: 'review notes next monday',
    run: async () => {
      const r = await parseQuickAdd('review notes next monday', REF);
      const f: string[] = [];
      expectEqual(r.title, 'review notes', 'title', f);
      expectEqual(r.startMin, undefined, 'startMin', f);
      if (!r.dayKey) {
        f.push('dayKey: expected a Monday, got undefined');
      } else {
        const [y, m, d] = r.dayKey.split('-').map(Number);
        const resolved = new Date(y, m - 1, d);
        if (getDay(resolved) !== 1) f.push(`dayKey: expected a Monday, got ${r.dayKey}`);
        if (resolved <= REF) f.push(`dayKey: expected a date after the reference, got ${r.dayKey}`);
      }
      return f;
    },
  },
  {
    name: 'groceries sat #home !low',
    run: async () => {
      const r = await parseQuickAdd('groceries sat #home !low', REF);
      const f: string[] = [];
      expectEqual(r.title, 'groceries', 'title', f);
      expectEqual(r.tags.join(','), 'home', 'tags', f);
      expectEqual(r.priority, 1, 'priority', f);
      expectEqual(r.dayKey, toDayKey(nextSaturday(REF)), 'dayKey', f);
      expectEqual(r.startMin, undefined, 'startMin', f);
      return f;
    },
  },
  {
    name: 'estimate shorthand without trailing m: deep work ~1h30',
    run: async () => {
      const r = await parseQuickAdd('deep work ~1h30', REF);
      const f: string[] = [];
      expectEqual(r.title, 'deep work', 'title', f);
      expectEqual(r.estimateMin, 90, 'estimateMin', f);
      return f;
    },
  },
  {
    name: 'estimate hours only: workout ~2h',
    run: async () => {
      const r = await parseQuickAdd('workout ~2h', REF);
      const f: string[] = [];
      expectEqual(r.title, 'workout', 'title', f);
      expectEqual(r.estimateMin, 120, 'estimateMin', f);
      return f;
    },
  },
  {
    name: 'energy only: walk @low',
    run: async () => {
      const r = await parseQuickAdd('walk @low', REF);
      const f: string[] = [];
      expectEqual(r.title, 'walk', 'title', f);
      expectEqual(r.energy, 'low', 'energy', f);
      return f;
    },
  },
  {
    name: 'multiple tags: clean house #home #chores',
    run: async () => {
      const r = await parseQuickAdd('clean house #home #chores', REF);
      const f: string[] = [];
      expectEqual(r.title, 'clean house', 'title', f);
      expectEqual(r.tags.join(','), 'home,chores', 'tags', f);
      return f;
    },
  },
  {
    name: 'priority med: submit report !med',
    run: async () => {
      const r = await parseQuickAdd('submit report !med', REF);
      const f: string[] = [];
      expectEqual(r.title, 'submit report', 'title', f);
      expectEqual(r.priority, 2, 'priority', f);
      return f;
    },
  },
  {
    name: 'mid-sentence tokens strip cleanly: pay #money rent !high friday',
    run: async () => {
      const r = await parseQuickAdd('pay #money rent !high friday', REF);
      const f: string[] = [];
      expectEqual(r.title, 'pay rent', 'title', f);
      expectEqual(r.tags.join(','), 'money', 'tags', f);
      expectEqual(r.priority, 3, 'priority', f);
      expectEqual(r.dayKey, toDayKey(nextFriday(REF)), 'dayKey', f);
      if (r.title.includes('#') || r.title.includes('!')) f.push('title: leftover token marker');
      return f;
    },
  },
  {
    name: 'ambiguous multiple dates: meet John monday and thursday',
    run: async () => {
      const r = await parseQuickAdd('meet John monday and thursday', REF);
      const f: string[] = [];
      expectEqual(r.dayKey, undefined, 'dayKey', f);
      if (!r.dateHint) f.push('dateHint: expected a hint, got none');
      expectEqual(r.title, 'meet John monday and thursday', 'title', f);
      return f;
    },
  },
  {
    name: 'time-only, no date word: lunch at noon',
    run: async () => {
      const r = await parseQuickAdd('lunch at noon', REF);
      const f: string[] = [];
      expectEqual(r.title, 'lunch', 'title', f);
      expectEqual(r.dayKey, toDayKey(REF), 'dayKey', f);
      expectEqual(r.startMin, 12 * 60, 'startMin', f);
      return f;
    },
  },
  {
    name: 'full combo: prepare slides thu 3pm #work !high ~2h @high',
    run: async () => {
      const r = await parseQuickAdd('prepare slides thu 3pm #work !high ~2h @high', REF);
      const f: string[] = [];
      expectEqual(r.title, 'prepare slides', 'title', f);
      expectEqual(r.tags.join(','), 'work', 'tags', f);
      expectEqual(r.priority, 3, 'priority', f);
      expectEqual(r.estimateMin, 120, 'estimateMin', f);
      expectEqual(r.energy, 'high', 'energy', f);
      expectEqual(r.dayKey, toDayKey(nextThursday(REF)), 'dayKey', f);
      expectEqual(r.startMin, 15 * 60, 'startMin', f);
      return f;
    },
  },
];

export async function runParseTests(): Promise<{ name: string; failures: string[] }[]> {
  const results: { name: string; failures: string[] }[] = [];
  for (const c of cases) {
    let failures: string[];
    try {
      failures = await c.run();
    } catch (e) {
      failures = [`threw: ${e instanceof Error ? e.message : String(e)}`];
    }
    results.push({ name: c.name, failures });
  }
  return results;
}
