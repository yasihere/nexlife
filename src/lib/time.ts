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

/** Add (or, with a negative count, subtract) whole days to a day-key string. */
export function addDays(key: string, count: number): string {
  const parsed = parse(key, 'yyyy-MM-dd', new Date());
  return format(addDaysToDate(parsed, count), 'yyyy-MM-dd');
}
