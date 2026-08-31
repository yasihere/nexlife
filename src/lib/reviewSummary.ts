// Pure "five honest sentences" builder (PROMPTS.md Phase 12, #2). No
// congratulation, no streaks — same flat, factual tone as Triage's closing
// line (Phase 4). Zero React imports.

import { format } from 'date-fns';
import { parseDayKey } from './time';
import { countByDay, type DayCount } from './weekAggregation';
import type { Entry } from '../data/types';

export interface ReviewData {
  /** Raw counts, for the stat pair at the top of the screen — the sentences
   *  below restate these in words, but a UI wants the number on its own too. */
  completedCount: number;
  droppedCount: number;
  /** The 5 sentences PROMPTS.md's Phase 12 gate asks for, plus a 6th only
   *  when the reviewed week actually has money logged — still one honest
   *  fact per sentence, never a dashboard, just not silent about spending
   *  when spending happened. */
  sentences: string[];
  /** For the week chart — active (non-dropped) tasks per day. */
  dayCounts: DayCount[];
  busiestDayKey: string;
  emptiestDayKey: string;
}

function weekdayName(key: string): string {
  return format(parseDayKey(key), 'EEEE');
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function sumMoney(logs: Entry[]): number {
  return logs.filter((e) => e.unit === 'INR').reduce((sum, e) => sum + (e.amount ?? 0), 0);
}

/**
 * `weekTasks` — every task dated within the reviewed week (see
 * getByDayRange), dropped and completed both included. `days` — that week's
 * 7 dayKeys, oldest first. `weekLogs`/`priorWeekLogs` — money/health logs for
 * the reviewed week and the one before it (see getLogsByDayRange); omit both
 * to skip the money fact entirely (Review.tsx always has them, but nothing
 * here requires it).
 */
export function buildReview(
  weekTasks: Entry[],
  days: string[],
  weekLogs: Entry[] = [],
  priorWeekLogs: Entry[] = []
): ReviewData {
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

  const sentences = [s1, s2, s3, s4, s5];

  // 6. money, only when the reviewed week (or the one before it, for the
  // comparison to make sense) actually had any logged — a silent "₹0 spent"
  // week isn't a fact worth a sentence.
  const spent = sumMoney(weekLogs);
  const spentPrior = sumMoney(priorWeekLogs);
  if (spent > 0 || spentPrior > 0) {
    const delta = spent - spentPrior;
    if (delta === 0) {
      sentences.push(`${formatINR(spent)} spent this week, the same as the week before.`);
    } else {
      const direction = delta > 0 ? 'more' : 'less';
      sentences.push(`${formatINR(spent)} spent this week, ${formatINR(Math.abs(delta))} ${direction} than the week before.`);
    }
  }

  return {
    completedCount: completed.length,
    droppedCount: dropped.length,
    sentences,
    dayCounts,
    busiestDayKey: busiest.dayKey,
    emptiestDayKey: emptiest.dayKey,
  };
}
