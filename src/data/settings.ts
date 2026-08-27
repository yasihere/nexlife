// Settings CRUD — a small, deliberate second file touching Dexie alongside
// entries.ts. Settings is a distinct concern (day-start hour, triage/export
// bookkeeping) that grows in its own right from Phase 7 on; UI still never
// touches Dexie directly either way (CLAUDE.md §4).

import { db, SETTINGS_ROW_ID } from './db';
import type { Settings } from './types';
import { DEFAULT_DAY_START_HOUR } from '../lib/time';

const DEFAULTS: Settings = {
  dayStartHour: DEFAULT_DAY_START_HOUR,
};

/** The single settings row, or sane defaults if nothing's been saved yet. */
export async function getSettings(): Promise<Settings> {
  const row = await db.settings.get(SETTINGS_ROW_ID);
  return row ?? DEFAULTS;
}

/** Patch settings. Reads-merges-writes, since it's one row, not a query. */
export async function updateSettings(changes: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...changes, id: SETTINGS_ROW_ID });
}
