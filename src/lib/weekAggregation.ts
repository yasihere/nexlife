// Pure week-boundary helpers shared by Plan and Review (PROMPTS.md Phase 12).
// Zero React imports.

import { startOfWeek } from 'date-fns';
import { dayKey, parseDayKey, addDays } from './time';

/** The 7 dayKeys (Sun-Sat) of the week containing `anyDayInWeek`. */
export function weekDayKeys(anyDayInWeek: string): string[] {
  const start = dayKey(startOfWeek(parseDayKey(anyDayInWeek)));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export interface DayCount {
  dayKey: string;
  count: number;
}

/** How many of `entries` fall on each of `days` — Plan's density, Review's
 *  busiest/emptiest, from the same shape either screen can render as bars. */
export function countByDay(entries: { dayKey?: string }[], days: string[]): DayCount[] {
  return days.map((day) => ({
    dayKey: day,
    count: entries.filter((e) => e.dayKey === day).length,
  }));
}
