// Export/import JSON backup (SPEC.md "your data is a JSON file you own" /
// PROMPTS.md Phase 7). Lazy-loaded from Settings — never in the main bundle.
// Zero React imports. Touches Dexie directly for bulk replace/merge — the same
// narrow exception as settings.ts: a distinct concern (bulk data movement, not
// entry-by-entry CRUD) that doesn't belong in entries.ts's per-row semantics.

import { db } from './db';
import { getAllEntries } from './queries';
import { getSettings, updateSettings } from './settings';
import { saveAndShareFile } from '../lib/native';
import type { Entry, EntryType, Settings } from './types';

export const CURRENT_SCHEMA_VERSION = db.verno;

export interface BackupFile {
  schemaVersion: number;
  exportedAt: number;
  entries: Entry[];
  settings: Settings;
}

// Deliberately every member of EntryType, spelled out rather than inferred —
// a Record forces a compile error the moment a new type is added and this
// list isn't updated too (exactly what caught this array missing 'goal' when
// Goals was added: a plain array assigned to EntryType[] type-checks fine
// even when incomplete, since a subset is still a valid EntryType[]).
const ENTRY_TYPE_SET: Record<EntryType, true> = { task: true, habit: true, log: true, note: true, goal: true };

function isValidEntry(x: unknown): x is Entry {
  if (typeof x !== 'object' || x === null) return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.type === 'string' &&
    Object.prototype.hasOwnProperty.call(ENTRY_TYPE_SET, e.type) &&
    typeof e.title === 'string' &&
    Array.isArray(e.tags) &&
    typeof e.priority === 'number' &&
    e.priority >= 0 &&
    e.priority <= 3 &&
    typeof e.createdAt === 'number' &&
    typeof e.updatedAt === 'number'
  );
}

/**
 * Upgrades a raw backup file from an older schemaVersion to the current shape.
 * A stub for now — every version so far (v1-v3) only added tables/indexes,
 * never changed the Entry or Settings shape, so there's nothing to migrate
 * yet. A future version that does change a shape adds a case here, e.g.:
 *   if (fromVersion < 4) raw = migrateV3ToV4(raw);
 */
function migrateBackup(raw: Record<string, unknown>, _fromVersion: number): Record<string, unknown> {
  return raw;
}

export async function exportAll(): Promise<BackupFile> {
  const [entries, settings] = await Promise.all([getAllEntries(), getSettings()]);
  return { schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt: Date.now(), entries, settings };
}

/** Serialises, saves and shares a backup, and records lastExportAt. */
export async function exportAndShare(): Promise<void> {
  const backup = await exportAll();
  const filename = `nexlife-backup-${new Date(backup.exportedAt).toISOString().slice(0, 10)}.json`;
  await saveAndShareFile(filename, JSON.stringify(backup, null, 2), 'application/json');
  await updateSettings({ lastExportAt: backup.exportedAt });
}

export interface ValidationResult {
  schemaVersion: number;
  validEntries: Entry[];
  invalidCount: number;
  settings: Settings | null;
}

export type ValidationOutcome = { ok: true; result: ValidationResult } | { ok: false; error: string };

/** Checks shape and validates every entry — writes nothing. */
export function validateBackup(raw: unknown): ValidationOutcome {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: "That file doesn't look like a NexLife backup." };
  }
  const file = raw as Record<string, unknown>;
  if (typeof file.schemaVersion !== 'number' || !Array.isArray(file.entries)) {
    return { ok: false, error: "That file doesn't look like a NexLife backup." };
  }
  if (file.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return { ok: false, error: 'This backup is from a newer version of NexLife. Update the app first.' };
  }

  const migrated = migrateBackup(file, file.schemaVersion);
  const rawEntries = migrated.entries as unknown[];
  const validEntries = rawEntries.filter(isValidEntry);
  const invalidCount = rawEntries.length - validEntries.length;
  const settings =
    typeof migrated.settings === 'object' && migrated.settings !== null
      ? (migrated.settings as Settings)
      : null;

  return {
    ok: true,
    result: { schemaVersion: file.schemaVersion, validEntries, invalidCount, settings },
  };
}

/** Wipes `entries` and `settings`, then writes exactly what validated. */
async function replaceAll(result: ValidationResult): Promise<void> {
  await db.transaction('rw', db.entries, db.settings, async () => {
    await db.entries.clear();
    await db.entries.bulkAdd(result.validEntries);
    if (result.settings) await updateSettings(result.settings);
  });
}

/**
 * Upserts by id, keeping whichever side has the newer updatedAt. Settings are
 * one row, not per-field timestamped, so the whole object is replaced only if
 * the incoming lastExportAt is at least as new as the current one.
 */
async function mergeAll(result: ValidationResult): Promise<void> {
  await db.transaction('rw', db.entries, db.settings, async () => {
    const existing = await getAllEntries();
    const existingById = new Map(existing.map((e) => [e.id, e]));

    const toWrite = result.validEntries.filter((incoming) => {
      const current = existingById.get(incoming.id);
      return !current || incoming.updatedAt > current.updatedAt;
    });
    await db.entries.bulkPut(toWrite);

    if (result.settings) {
      const current = await getSettings();
      const incomingIsNewer = (result.settings.lastExportAt ?? 0) >= (current.lastExportAt ?? 0);
      if (incomingIsNewer) await updateSettings(result.settings);
    }
  });
}

/** Actually writes a validated result. Returns how many entries were written. */
export async function commitImport(result: ValidationResult, mode: 'replace' | 'merge'): Promise<number> {
  if (mode === 'replace') await replaceAll(result);
  else await mergeAll(result);
  return result.validEntries.length;
}
