// Pure "five honest sentences" builder (PROMPTS.md Phase 12, #2). No
// congratulation, no streaks — same flat, factual tone as Triage's closing
// line (Phase 4). Zero React imports.

import { format } from 'date-fns';
import { parseDayKey } from './time';
import { countByDay, type DayCount } from './weekAggregation';
import type { Entry } from '../data/types';

export interface ReviewData {
  /** Exactly 5 — one per requested fact. */
  sentences: string[];
  /** For the one supplementary chart — active (non-dropped) tasks per day. */
  dayCounts: DayCount[];
}

function weekdayName(key: string): string {
  return format(parseDayKey(key), 'EEEE');
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * `weekTasks` — every task dated within the reviewed week (see
 * getByDayRange), dropped and completed both included. `days` — that week's
 * 7 dayKeys, oldest first.
 */
export function buildReview(weekTasks: Entry[], days: string[]): ReviewData {
  const dropped = weekTasks.filter((e) => !!e.droppedAt);
  const completed = weekTasks.filter((e) => !!e.completedAt);
  const active = weekTasks.filter((e) => !e.droppedAt);

  // 1. completed vs dropped
  const s1 = `${plural(completed.length, 'task')} done, ${plural(dropped.length, 'task')} dropped this week.`;

  // 2. the tag dropped most
  const tagCounts = new Map<string, number>();
  for (const e of dropped) {
    for (const tag of e.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  let topTag: string | null = null;
  let topTagCount = 0;
  for (const [tag, count] of tagCounts) {
    if (count > topTagCount) {
      topTag = tag;
      topTagCount = count;
    }
  }
  const s2 = topTag
    ? `#${topTag} was dropped most, ${plural(topTagCount, 'time')}.`
    : dropped.length > 0
      ? 'Nothing dropped was tagged, so no pattern to name.'
      : 'Nothing was dropped this week.';

  // 3 & 4. busiest / emptiest day — active tasks only, matching what actually
  // stayed on the plan (a dropped task never really happened that day).
  const dayCounts = countByDay(active, days);
  const busiest = dayCounts.reduce((a, b) => (b.count > a.count ? b : a));
  const emptiest = dayCounts.reduce((a, b) => (b.count < a.count ? b : a));
  const s3 = `${weekdayName(busiest.dayKey)} was busiest, with ${plural(busiest.count, 'task')}.`;
  const s4 = `${weekdayName(emptiest.dayKey)} was emptiest, with ${plural(emptiest.count, 'task')}.`;

  // 5. average gap between scheduling (createdAt) and doing (completedAt) —
  // createdAt is a proxy for "when I decided to do this", accurate for the
  // common quick-add case but not for something later moved via Triage or the
  // entry sheet, which don't separately timestamp "when the date was set".
  let s5: string;
  if (completed.length === 0) {
    s5 = 'No completed tasks this week to measure a gap.';
  } else {
    const avgHours =
      completed.reduce((sum, e) => sum + (e.completedAt! - e.createdAt), 0) /
      completed.length /
      (1000 * 60 * 60);
    s5 =
      avgHours < 24
        ? `On average, ${avgHours.toFixed(1)} hours passed between scheduling something and doing it.`
        : `On average, ${(avgHours / 24).toFixed(1)} days passed between scheduling something and doing it.`;
  }

  return { sentences: [s1, s2, s3, s4, s5], dayCounts };
}
