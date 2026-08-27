// Dexie schema. Zero React imports (CLAUDE.md §3, §7). Schema changes always ship
// with a version bump and an upgrade function — see CLAUDE.md §7.

import Dexie, { type Table } from 'dexie';
import type { Entry } from './types';

export class NexLifeDB extends Dexie {
  entries!: Table<Entry, string>;

  constructor() {
    super('nexlife');

    this.version(1).stores({
      // id: primary key — a crypto.randomUUID() string, never auto-increment.
      //
      // dayKey: Today's hot-path query (getByDay) and, via .below(), Triage's
      //   overdue range scan.
      // [type+dayKey]: compound, so a type-scoped day query (getOverdue: tasks
      //   only; later, Phase 9 habits) narrows on the index instead of a full
      //   table scan followed by a JS filter.
      // completedAt, seriesId, deletedAt are optional Entry fields. Dexie omits a
      //   record from an index entirely when the indexed field is undefined, so
      //   each of these indexes holds only the entries that actually have it set —
      //   e.g. `completedAt` indexes only completed entries, for free.
      // *tags: multi-entry index, one index row per tag string, for tag filters
      //   (Phase 6) and money-by-tag (Phase 10).
      //
      // Not indexed, deliberately: parentId (Phase 6 subtasks, added with its own
      // version bump), startMin (a single day's entries are a small in-memory set,
      // sorted client-side), free-text fields (Phase 11 owns real search indexing).
      entries: 'id, dayKey, [type+dayKey], completedAt, *tags, seriesId, deletedAt',
    });
  }
}

export const db = new NexLifeDB();
