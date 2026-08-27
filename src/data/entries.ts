// The only module that touches Dexie (CLAUDE.md §3, §4). Every write sets
// updatedAt; every id is crypto.randomUUID(); deletes are soft (CLAUDE.md §7).

import Dexie from 'dexie';
import { db } from './db';
import type { Entry } from './types';

type NewEntry = Partial<Entry> & Pick<Entry, 'type' | 'title'>;

/** Create an entry. Fills in id, createdAt/updatedAt, and organisation defaults. */
export async function create(input: NewEntry): Promise<Entry> {
  const now = Date.now();
  const entry: Entry = {
    tags: [],
    priority: 0,
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.entries.add(entry);
  return entry;
}

/**
 * Patch an entry. Never mutates in place (CLAUDE.md §7) — writes a fresh object
 * with a new updatedAt. A key set to `undefined` in `changes` is deleted from the
 * stored record, not stored as `undefined` — required so optional-field indexes
 * (completedAt, droppedAt, deletedAt) actually drop the entry when it's unset.
 */
export async function update(id: string, changes: Partial<Entry>): Promise<void> {
  await db.entries.where('id').equals(id).modify((e) => {
    const target = e as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined) delete target[key];
      else target[key] = value;
    }
    e.updatedAt = Date.now();
  });
}

export async function complete(id: string): Promise<void> {
  await update(id, { completedAt: Date.now() });
}

export async function uncomplete(id: string): Promise<void> {
  await update(id, { completedAt: undefined });
}

/** Triage: explicitly abandoned, not deleted — still visible in Review. */
export async function drop(id: string): Promise<void> {
  await update(id, { droppedAt: Date.now() });
}

/** Soft delete. Purged by purgeOldDeleted() after 30 days (CLAUDE.md §7). */
export async function softDelete(id: string): Promise<void> {
  await update(id, { deletedAt: Date.now() });
}

export async function restore(id: string): Promise<void> {
  await update(id, { deletedAt: undefined });
}

/** Permanently remove entries soft-deleted before `cutoff` (a timestamp). */
export async function purgeOldDeleted(cutoff: number): Promise<number> {
  const stale = await db.entries.where('deletedAt').below(cutoff).primaryKeys();
  await db.entries.bulkDelete(stale);
  return stale.length;
}

/**
 * Everything scheduled on `dayKey` — completed entries included, since Today
 * renders their struck-through state rather than hiding them. Dropped and
 * soft-deleted entries are excluded.
 */
export async function getByDay(dayKey: string): Promise<Entry[]> {
  return db.entries
    .where('dayKey')
    .equals(dayKey)
    .filter((e) => !e.droppedAt && !e.deletedAt)
    .toArray();
}

/**
 * Incomplete tasks scheduled before `beforeDayKey` — Triage's queue. Task-only:
 * habits, logs and notes never count as "overdue". Uses the [type+dayKey] index so
 * the DB narrows to 'task' rows in range before any JS filtering runs, rather than
 * scanning the whole table.
 */
export async function getOverdue(beforeDayKey: string): Promise<Entry[]> {
  return db.entries
    .where('[type+dayKey]')
    .between(['task', Dexie.minKey], ['task', beforeDayKey], true, false)
    .filter((e) => !e.completedAt && !e.droppedAt && !e.deletedAt)
    .toArray();
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
