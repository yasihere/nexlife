// Timezone-safe day-key handling. CLAUDE.md §7: never compare raw timestamps to
// decide "is this today" — always go through a day-key. Zero React imports.

import { format, subHours, addDays as addDaysToDate, parse } from 'date-fns';

/** A day starts at midnight unless Settings overrides it (src/data/types.ts). */
export const DEFAULT_DAY_START_HOUR = 0;

/**
 * The local 'YYYY-MM-DD' day-key a timestamp belongs to. `dayStartHour` shifts the
 * boundary — e.g. dayStartHour=4 means a 1am entry still belongs to yesterday.
 */
export function dayKey(date: Date, dayStartHour: number = DEFAULT_DAY_START_HOUR): string {
  const shifted = dayStartHour > 0 ? subHours(date, dayStartHour) : date;
  return format(shifted, 'yyyy-MM-dd');
}

/** Today's day-key, honouring the configured day-start hour. */
export function todayKey(dayStartHour: number = DEFAULT_DAY_START_HOUR): string {
  return dayKey(new Date(), dayStartHour);
}

/** Parse a 'yyyy-MM-dd' day-key into a local Date (midnight, local time). */
export function parseDayKey(key: string): Date {
  return parse(key, 'yyyy-MM-dd', new Date());
}

/** Add (or, with a negative count, subtract) whole days to a day-key string. */
export function addDays(key: string, count: number): string {
  return format(addDaysToDate(parseDayKey(key), count), 'yyyy-MM-dd');
}

function dayOfWeek(key: string): number {
  return parseDayKey(key).getDay(); // 0 = Sunday .. 6 = Saturday
}

/** The upcoming Saturday — or `key` itself, if `key` already falls on a weekend. */
export function nextWeekendKey(key: string): string {
  const dow = dayOfWeek(key);
  if (dow === 0 || dow === 6) return key;
  return addDays(key, 6 - dow);
}

/** The Monday of the week after `key`'s week — always a full week out, even from a Monday. */
export function nextWeekKey(key: string): string {
  const dow = dayOfWeek(key);
  const daysUntilMonday = (1 - dow + 7) % 7 || 7;
  return addDays(key, daysUntilMonday);
}
