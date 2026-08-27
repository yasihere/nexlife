// Data model — zero React imports, must stay portable (CLAUDE.md §3, §7).
// One entity, five lenses: tasks, habits, logs and notes are the same Entry shape
// with different fields populated. See SPEC.md "The architectural bet".

export type EntryType = 'task' | 'habit' | 'log' | 'note' | 'goal';

/** week/month/year cover the recurring planning horizons; longterm is the
 *  ~5-year band SPEC's "five lenses" line never named individually, and
 *  lifetime never expires. Goals don't auto-renew each period (v1, by explicit
 *  product decision) — a "weekly" goal is one goal you track and eventually
 *  finish or drop, not a series regenerated every Monday like a recurring task. */
export type GoalPeriod = 'week' | 'month' | 'year' | 'longterm' | 'lifetime';

export interface Entry {
  id: string; // crypto.randomUUID() — never an auto-increment int (CLAUDE.md §7)
  type: EntryType;
  title: string;
  body?: string; // notes, long-form

  // scheduling
  dayKey?: string; // 'YYYY-MM-DD' local day-key — source of truth for "which day"
  startMin?: number; // minutes from midnight, for time-blocked items
  estimateMin?: number;
  completedAt?: number;
  droppedAt?: number; // triage: explicitly abandoned, not deleted

  // recurrence — drives repeating tasks AND habits
  recurrence?: Recurrence;
  seriesId?: string;
  streak?: number; // habits only

  // measurement — drives money AND health
  amount?: number;
  unit?: string; // 'INR' | 'kg' | 'steps' | 'ml' | 'hrs' ...

  // goals — a numeric target you check in on manually. Deliberately separate
  // from amount/unit above: amount is a single timestamped measurement (one
  // log row per reading), while a goal accumulates one running `progress`
  // number toward one `target` over its whole life. `unit` is reused as the
  // goal's free-text label ("books", "kg", "₹") — it means the same thing
  // there as it already does for logs.
  period?: GoalPeriod;
  target?: number;
  progress?: number;

  // organisation
  tags: string[];
  priority: 0 | 1 | 2 | 3; // 0 none … 3 highest
  energy?: 'low' | 'med' | 'high';
  parentId?: string; // subtasks

  createdAt: number;
  updatedAt: number;
  deletedAt?: number; // soft delete, purged after 30 days
}

// `startDay` (Phase 6) anchors the cadence — "every 2 weeks" is meaningless
// without a reference point. It's the dayKey of the series' first occurrence.
// `timesPerWeek` deliberately has no startDay: it's a rolling weekly target for
// habits (Phase 9), not a fixed-day schedule, so it never gets expanded into
// occurrences the way the other three kinds do (src/data/recurrence.ts).
export type Recurrence =
  | { kind: 'daily'; every: number; startDay: string }
  | { kind: 'weekly'; every: number; weekdays: number[]; startDay: string } // weekdays: 0 = Sunday
  | { kind: 'monthly'; every: number; dayOfMonth: number; startDay: string }
  | { kind: 'timesPerWeek'; count: number }; // habits: "3x a week"

/**
 * Persisted app settings — one row, eventually. Defined here now because other
 * Phase 2 code (lib/time.ts's day-start hour) needs the shape to type against, but
 * no table or CRUD exists yet — that lands with the screen that actually reads and
 * writes it (Settings, Phase 7).
 */
export interface Settings {
  dayStartHour: number; // 0-23. A 1am entry belongs to the previous day when this is e.g. 4.
  lastTriageDay?: string; // dayKey of the last fully-cleared Triage — Phase 4
  lastExportAt?: number; // Phase 7
  notificationLeadMin?: number; // minutes before startMin a reminder fires — Phase 8, default 10
}

export function isTask(e: Entry): boolean {
  return e.type === 'task';
}

export function isHabit(e: Entry): boolean {
  return e.type === 'habit';
}

export function isLog(e: Entry): boolean {
  return e.type === 'log';
}

export function isNote(e: Entry): boolean {
  return e.type === 'note';
}

export function isGoal(e: Entry): boolean {
  return e.type === 'goal';
}
