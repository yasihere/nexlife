// Log-grammar cases split out of parseTestCases.ts once that file passed
// CLAUDE.md §4's ~250-line threshold (PROMPTS.md Phase 10) — same
// plain-assertion pattern, same dev-only "Tests" button. Zero React imports.

import { addDays, nextThursday } from 'date-fns';
import { parseQuickAdd } from './parse';
import { dayKey as toDayKey } from '../lib/time';

// Same construction as parseTestCases.ts's REF — a fixed, deliberately-derived
// Wednesday. Kept identical rather than shared, since these two tiny lines
// aren't worth a shared import just to avoid repeating them.
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
  run: () => Promise<string[]>;
}

const cases: TestCase[] = [
  {
    name: 'log — money, currency prefix: ₹500 groceries #food',
    run: async () => {
      const r = await parseQuickAdd('₹500 groceries #food', REF);
      const f: string[] = [];
      expectEqual(r.type, 'log', 'type', f);
      expectEqual(r.amount, 500, 'amount', f);
      expectEqual(r.unit, 'INR', 'unit', f);
      expectEqual(r.title, 'groceries', 'title', f);
      expectEqual(r.tags.join(','), 'food', 'tags', f);
      expectEqual(r.dayKey, toDayKey(REF), 'dayKey', f);
      return f;
    },
  },
  {
    name: 'log — money, currency suffix: 500rs groceries #food',
    run: async () => {
      const r = await parseQuickAdd('500rs groceries #food', REF);
      const f: string[] = [];
      expectEqual(r.type, 'log', 'type', f);
      expectEqual(r.amount, 500, 'amount', f);
      expectEqual(r.unit, 'INR', 'unit', f);
      expectEqual(r.title, 'groceries', 'title', f);
      return f;
    },
  },
  {
    // Regression guard: a bare leading number used to be enough for a money
    // log ("500 groceries"), which meant any quantity-first task title
    // ("10 pushups") was silently swallowed into a nonsense money entry with
    // the quantity stripped out — the task then appeared nowhere a user would
    // look for it. Money now requires an explicit currency marker; a bare
    // number is always just part of a task title.
    name: 'a bare leading number is a task, not a silent money log: 10 pushups',
    run: async () => {
      const r = await parseQuickAdd('10 pushups', REF);
      const f: string[] = [];
      expectEqual(r.type, 'task', 'type', f);
      expectEqual(r.title, '10 pushups', 'title', f);
      return f;
    },
  },
  {
    name: 'log — weight: 72.5kg',
    run: async () => {
      const r = await parseQuickAdd('72.5kg', REF);
      const f: string[] = [];
      expectEqual(r.type, 'log', 'type', f);
      expectEqual(r.amount, 72.5, 'amount', f);
      expectEqual(r.unit, 'kg', 'unit', f);
      expectEqual(r.title, '', 'title', f);
      return f;
    },
  },
  {
    name: 'log — steps: 8000steps',
    run: async () => {
      const r = await parseQuickAdd('8000steps', REF);
      const f: string[] = [];
      expectEqual(r.type, 'log', 'type', f);
      expectEqual(r.amount, 8000, 'amount', f);
      expectEqual(r.unit, 'steps', 'unit', f);
      return f;
    },
  },
  {
    name: 'log — water in litres normalises to ml: 2l',
    run: async () => {
      const r = await parseQuickAdd('2l', REF);
      const f: string[] = [];
      expectEqual(r.type, 'log', 'type', f);
      expectEqual(r.amount, 2000, 'amount', f);
      expectEqual(r.unit, 'ml', 'unit', f);
      return f;
    },
  },
  {
    name: 'log — water in ml directly: 500ml',
    run: async () => {
      const r = await parseQuickAdd('500ml', REF);
      const f: string[] = [];
      expectEqual(r.type, 'log', 'type', f);
      expectEqual(r.amount, 500, 'amount', f);
      expectEqual(r.unit, 'ml', 'unit', f);
      return f;
    },
  },
  {
    name: 'log — sleep, hrs spelled out: 7.5hrs',
    run: async () => {
      const r = await parseQuickAdd('7.5hrs', REF);
      const f: string[] = [];
      expectEqual(r.type, 'log', 'type', f);
      expectEqual(r.amount, 7.5, 'amount', f);
      expectEqual(r.unit, 'hrs', 'unit', f);
      return f;
    },
  },
  {
    name: 'log — sleep, short h form with a title: slept 8h',
    run: async () => {
      const r = await parseQuickAdd('slept 8h', REF);
      const f: string[] = [];
      expectEqual(r.type, 'log', 'type', f);
      expectEqual(r.amount, 8, 'amount', f);
      expectEqual(r.unit, 'hrs', 'unit', f);
      expectEqual(r.title, 'slept', 'title', f);
      return f;
    },
  },
  {
    name: 'log grammar does not misfire on an unrecognised suffix: 500km stays a task',
    run: async () => {
      const r = await parseQuickAdd('500km', REF);
      const f: string[] = [];
      expectEqual(r.type, 'task', 'type', f);
      expectEqual(r.title, '500km', 'title', f);
      return f;
    },
  },
];

export async function runParseLogTests(): Promise<{ name: string; failures: string[] }[]> {
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
