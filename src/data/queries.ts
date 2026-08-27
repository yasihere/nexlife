// Entry reads. Mutations live in src/data/entries.ts — see that file's header
// for why they're split. Zero React imports.

import Dexie from 'dexie';
import { db } from './db';
import type { Entry } from './types';

/**
 * Today's tasks scheduled on `dayKey` — completed entries included, since
 * Today renders their struck-through state rather than hiding them. Dropped
 * and soft-deleted entries are excluded. Task-only: harmless to omit before
 * Phase 10, since only tasks existed for real — now that logs exist too, a
 * "500 groceries" entry would otherwise show up in Today's Unscheduled list
 * next to actual tasks, which is exactly the bug getUnscheduled() already
 * guarded against.
 */
export async function getByDay(dayKey: string): Promise<Entry[]> {
  return db.entries
    .where('dayKey')
    .equals(dayKey)
    .filter((e) => e.type === 'task' && !e.droppedAt && !e.deletedAt)
    .toArray();
}

/**
 * Incomplete tasks scheduled before `beforeDayKey` — Triage's queue, oldest first
 * (Triage works the backlog in that order; sorting once here means every caller
 * gets a sensible order for free). Task-only: habits, logs and notes never count
 * as "overdue". Uses the [type+dayKey] index so the DB narrows to 'task' rows in
 * range before any JS filtering runs, rather than scanning the whole table.
 */
export async function getOverdue(beforeDayKey: string): Promise<Entry[]> {
  const rows = await db.entries
    .where('[type+dayKey]')
    .between(['task', Dexie.minKey], ['task', beforeDayKey], true, false)
    .filter((e) => !e.completedAt && !e.droppedAt && !e.deletedAt)
    .toArray();
  return rows.sort(
    (a, b) => a.dayKey!.localeCompare(b.dayKey!) || (a.startMin ?? 0) - (b.startMin ?? 0)
  );
}

/**
 * Triage's closing line: among tasks dated `fromDayKey`..`toDayKey` (inclusive),
 * how many ended up done vs dropped. Deliberately excludes anything moved to
 * Today or rescheduled forward during this session — those are deferred, not
 * resolved, and an honest line doesn't claim them either way. A task that was
 * both completed and dropped (shouldn't happen in normal use) counts as done.
 */
export async function getDaySummary(
  fromDayKey: string,
  toDayKey: string
): Promise<{ done: number; dropped: number }> {
  const rows = await db.entries
    .where('[type+dayKey]')
    .between(['task', fromDayKey], ['task', toDayKey], true, true)
    .filter((e) => !e.deletedAt)
    .toArray();

  let done = 0;
  let dropped = 0;
  for (const e of rows) {
    if (e.completedAt) done++;
    else if (e.droppedAt) dropped++;
  }
  return { done, dropped };
}

/**
 * Tasks with no dayKey at all. Not reachable via the [type+dayKey] index (a
 * missing dayKey excludes the record from it entirely), so this is a
 * full-collection filter — acceptable at the 10,000-entry budget since it isn't
 * the hot path the way getByDay is.
 */
export async function getUnscheduled(): Promise<Entry[]> {
  return db.entries
    .filter((e) => e.type === 'task' && !e.dayKey && !e.droppedAt && !e.deletedAt)
    .toArray();
}

/** A single entry by id — for a live-updating detail view (e.g. EntrySheet). */
export async function getById(id: string): Promise<Entry | undefined> {
  return db.entries.get(id);
}

/**
 * Recurring task templates — the entry that carries the `recurrence` rule
 * itself (its own id doubles as `seriesId` for its occurrences — see
 * src/data/series.ts). Not indexed (recurrence is a rare, nested field), but a
 * personal task list has at most a handful of active series, so a full-table
 * filter costs nothing here.
 */
export async function getRecurringTemplates(): Promise<Entry[]> {
  return db.entries
    .filter((e) => e.type === 'task' && !!e.recurrence && e.recurrence.kind !== 'timesPerWeek' && !e.deletedAt)
    .toArray();
}

/** Every materialised occurrence of a series, template included. */
export async function getSeriesOccurrences(seriesId: string): Promise<Entry[]> {
  return db.entries.where('seriesId').equals(seriesId).toArray();
}

/** A series' template entry — its id is the seriesId by convention. */
export async function getTemplateForSeries(seriesId: string): Promise<Entry | undefined> {
  return db.entries.get(seriesId);
}

/** Direct children of a subtask parent (CLAUDE.md §4's "2/5" progress). */
export async function getChildren(parentId: string): Promise<Entry[]> {
  return db.entries
    .where('parentId')
    .equals(parentId)
    .filter((e) => !e.deletedAt)
    .toArray();
}

/**
 * done/total child counts for many parents at once — one indexed query instead
 * of one per row, for rendering "2/5" across a whole list.
 */
export async function getChildrenSummaryBatch(
  parentIds: string[]
): Promise<Map<string, { done: number; total: number }>> {
  const summary = new Map<string, { done: number; total: number }>();
  if (parentIds.length === 0) return summary;

  const children = await db.entries
    .where('parentId')
    .anyOf(parentIds)
    .filter((e) => !e.deletedAt)
    .toArray();

  for (const child of children) {
    const key = child.parentId!;
    const entry = summary.get(key) ?? { done: 0, total: 0 };
    entry.total++;
    if (child.completedAt) entry.done++;
    summary.set(key, entry);
  }
  return summary;
}

/**
 * Linear scan across title, body and tags. Correct but not optimised — Phase 11
 * owns real indexed search once notes and the 10,000-entry / 50ms budget are in
 * scope for it.
 */
export async function search(query: string): Promise<Entry[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return db.entries
    .filter(
      (e) =>
        !e.deletedAt &&
        (e.title.toLowerCase().includes(q) ||
          !!e.body?.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q)))
    )
    .toArray();
}

/** Every entry, deleted ones included — a faithful snapshot for backup export. */
export async function getAllEntries(): Promise<Entry[]> {
  return db.entries.toArray();
}

/** Total entry count, excluding soft-deleted — Settings' "N entries". */
export async function getEntryCount(): Promise<number> {
  return db.entries.filter((e) => !e.deletedAt).count();
}

/**
 * Every log (money/health) entry — the Log screen aggregates client-side from
 * this, same reasoning as getEntryCount: personal-scale data, no need for a
 * more targeted query. Reuses the [type+dayKey] index across its full range
 * rather than a plain type index — no schema bump needed.
 */
export async function getAllLogs(): Promise<Entry[]> {
  return db.entries
    .where('[type+dayKey]')
    .between(['log', Dexie.minKey], ['log', Dexie.maxKey])
    .filter((e) => !e.deletedAt)
    .toArray();
}
