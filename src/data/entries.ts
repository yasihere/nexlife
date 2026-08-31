// Entry mutations — the module that writes to Dexie. Every write sets
// updatedAt; every id is crypto.randomUUID(); deletes are soft (CLAUDE.md §7).
// Reads live in src/data/queries.ts — this file grew past CLAUDE.md §4's
// ~250-line split threshold once Phase 6 added series/subtask queries, so
// mutations and reads got their own files rather than one growing file.

import Dexie from 'dexie';
import { db } from './db';
import type { Entry } from './types';

type NewEntry = Partial<Entry> & Pick<Entry, 'type' | 'title'>;

/**
 * Create an entry. Fills in id, createdAt/updatedAt, and organisation defaults.
 * Keys explicitly set to `undefined` in `input` (e.g. a parser that always
 * returns a `dayKey` field, sometimes unset) are dropped rather than stored as
 * literal `undefined` — same reasoning as update()'s delete-on-undefined below,
 * applied at creation time instead of via a later patch.
 */
export async function create(input: NewEntry): Promise<Entry> {
  const now = Date.now();
  const clean: Partial<NewEntry> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) (clean as Record<string, unknown>)[key] = value;
  }
  const entry: Entry = {
    tags: [],
    priority: 0,
    ...clean,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  } as Entry;
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

/**
 * Persists a drag-reordered list: `orderedIds` in the exact order they should
 * now sort in (see types.ts's sortIndex, queries.ts's sortByManualOrder).
 * Rewrites every row's sortIndex as its plain array index — simplest correct
 * approach at personal-scale list sizes (tens of items, not thousands), and
 * avoids the precision creep a fractional-indexing scheme accumulates over
 * many reorders. One transaction so a mid-write failure can't half-apply.
 */
export async function reorder(orderedIds: string[]): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.entries, async () => {
    await Promise.all(
      orderedIds.map((id, index) =>
        db.entries.where('id').equals(id).modify({ sortIndex: index, updatedAt: now })
      )
    );
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
 * Triage's bulk action for a large backlog: drop every incomplete task older
 * than `beforeDayKeyExclusive`, in one write instead of one per card. Same
 * range shape as queries.ts's getOverdue, just a different cutoff and a
 * modify() instead of a read.
 */
export async function dropOlderThan(beforeDayKeyExclusive: string): Promise<number> {
  return db.entries
    .where('[type+dayKey]')
    .between(['task', Dexie.minKey], ['task', beforeDayKeyExclusive], true, false)
    .filter((e) => !e.completedAt && !e.droppedAt && !e.deletedAt)
    .modify({ droppedAt: Date.now(), updatedAt: Date.now() });
}
