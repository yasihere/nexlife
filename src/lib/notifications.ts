// Local notification scheduling (PROMPTS.md Phase 8, #4 #5). Zero React
// imports. Every exported function is a safe no-op outside native — a
// `npm run dev` session never touches this plugin. @capacitor/local-notifications
// is dynamically imported so it never enters the main bundle.

import { Capacitor } from '@capacitor/core';
import { format } from 'date-fns';
import type { Entry } from '../data/types';

const ONGOING_ID = 1; // fixed id — rescheduling with the same id replaces it, not duplicates it
const DEFAULT_LEAD_MIN = 10;

// A personal task list schedules at most a few dozen reminders at once, so a
// simple string hash into a positive int is fine — a collision would at worst
// silently skip one reminder, not corrupt data.
function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const positive = Math.abs(hash) % 2147483647;
  return positive <= 1 ? positive + 2 : positive; // keep clear of ONGOING_ID's neighbourhood
}

function entryFireTime(startMin: number, leadMin: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, startMin - leadMin);
}

/** Requests notification permission once. Safe to call repeatedly. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') return true;
  const requested = await LocalNotifications.requestPermissions();
  return requested.display === 'granted';
}

/**
 * Cancels every pending per-entry reminder, then schedules fresh ones for
 * today's incomplete, undropped, time-blocked entries that haven't fired yet.
 * Call whenever Today's entry set changes — this is the only way to guarantee
 * a completed/dropped/rescheduled entry's reminder doesn't still fire.
 */
export async function syncEntryReminders(entries: Entry[], leadMin = DEFAULT_LEAD_MIN): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');

  const pending = await LocalNotifications.getPending();
  const ourReminderIds = pending.notifications.map((n) => n.id).filter((id) => id !== ONGOING_ID);
  if (ourReminderIds.length > 0) {
    await LocalNotifications.cancel({ notifications: ourReminderIds.map((id) => ({ id })) });
  }

  const now = Date.now();
  const notifications = entries
    .filter((e) => e.startMin != null && !e.completedAt && !e.droppedAt)
    .map((e) => {
      const fireAt = entryFireTime(e.startMin!, leadMin);
      if (fireAt.getTime() <= now) return null;
      return {
        id: hashId(e.id),
        title: e.title,
        body: `Starts at ${format(new Date(0, 0, 0, 0, e.startMin!), 'h:mm a')}`,
        schedule: { at: fireAt },
        extra: { entryId: e.id },
      };
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
}

/**
 * The home-screen-widget substitute (SPEC.md non-goals): today's top 3
 * incomplete entries. Best-effort "ongoing" — see PROMPTS.md Phase 8 chat: a
 * true swipe-proof Android notification needs a custom native foreground
 * service, out of scope here. This is autoCancel:false (a tap doesn't dismiss
 * it) and gets cancelled + re-posted with fresh content on every relevant
 * write, so a swipe-away is at most one data change away from reappearing.
 */
export async function syncOngoingSummary(entries: Entry[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');

  const incomplete = entries.filter((e) => !e.completedAt && !e.droppedAt);
  await LocalNotifications.cancel({ notifications: [{ id: ONGOING_ID }] });
  if (incomplete.length === 0) return;

  const top3 = [...incomplete]
    .sort((a, b) => (a.startMin ?? 9999) - (b.startMin ?? 9999))
    .slice(0, 3)
    .map((e) => e.title);

  await LocalNotifications.schedule({
    notifications: [
      {
        id: ONGOING_ID,
        title: `${incomplete.length} left today`,
        body: top3.join(' · '),
        schedule: { at: new Date(Date.now() + 500) },
        autoCancel: false,
        ongoing: true,
      },
    ],
  });
}

/** Both syncs together — the one call Today.tsx actually makes. */
export async function syncNotifications(entries: Entry[], leadMin?: number): Promise<void> {
  await Promise.all([syncEntryReminders(entries, leadMin), syncOngoingSummary(entries)]);
}

/** Tapping any of our notifications brings the user to Today. */
export async function wireNotificationTaps(onTap: () => void): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  await LocalNotifications.addListener('localNotificationActionPerformed', () => onTap());
}
