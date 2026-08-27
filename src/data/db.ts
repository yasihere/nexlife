// Dexie schema. Zero React imports (CLAUDE.md §3, §7). Schema changes always ship
// with a version bump and an upgrade function — see CLAUDE.md §7.

import Dexie, { type Table } from 'dexie';
import type { Entry, Settings } from './types';

// The `settings` table stores exactly one row, keyed by this fixed id — there is
// one user, one device, one settings object (CLAUDE.md §1). See src/data/settings.ts.
export const SETTINGS_ROW_ID = 'app';
export interface SettingsRow extends Settings {
  id: typeof SETTINGS_ROW_ID;
}

export class NexLifeDB extends Dexie {
  entries!: Table<Entry, string>;
  settings!: Table<SettingsRow, string>;

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

    // v2 (Phase 4): a `settings` table, needed for real now that Triage has to
    // persist lastTriageDay somewhere. `entries` is restated unchanged — Dexie
    // requires every version's stores() to describe the full schema, not a diff.
    // No .upgrade() needed: it's a brand-new table, nothing existing to migrate.
    this.version(2).stores({
      entries: 'id, dayKey, [type+dayKey], completedAt, *tags, seriesId, deletedAt',
      settings: 'id',
    });
  }
}

export const db = new NexLifeDB();
