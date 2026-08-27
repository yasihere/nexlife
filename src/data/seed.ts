// Dev-only fake data — never called from a production code path. Wired behind an
// import.meta.env.DEV-gated button (see App.tsx); a proper Settings-screen home
// for it lands in Phase 7. Zero React imports.

import { db } from './db';
import type { Entry } from './types';
import { todayKey, addDays } from '../lib/time';

const TAGS = ['money', 'health', 'home', 'work', 'family'];
const TITLES = [
  'Pay rent', 'Gym session', 'Call bank', 'Review notes', 'Groceries',
  'Reply to invoices', 'Design review', 'Water plants', 'Clean inbox',
  'Book dentist', 'Walk', 'Read', 'Plan week', 'Fix bike', 'Laundry',
];

function randomOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTags(): string[] {
  return Math.random() < 0.6 ? [randomOf(TAGS)] : [];
}

function randomPriority(): 0 | 1 | 2 | 3 {
  return Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3;
}

function randomEstimate(): number {
  return randomOf([15, 30, 45, 60]);
}

/**
 * Wipes and repopulates `entries` with ~500 realistic rows for manual testing:
 * 60 days of history (mostly completed, some left overdue on purpose), 14 days
 * ahead (all incomplete), unscheduled tasks, and one weekly recurring series.
 */
export async function seed(): Promise<void> {
  await db.entries.clear();

  const now = Date.now();
  const today = todayKey();
  const rows: Entry[] = [];

  // History: 6-10 entries/day, ~85% completed — the rest linger as overdue.
  for (let i = 60; i >= 1; i--) {
    const day = addDays(today, -i);
    const count = 6 + Math.floor(Math.random() * 5);
    for (let j = 0; j < count; j++) {
      const completed = Math.random() < 0.85;
      rows.push({
        id: crypto.randomUUID(),
        type: 'task',
        title: randomOf(TITLES),
        dayKey: day,
        startMin: Math.random() < 0.7 ? Math.floor(Math.random() * 24) * 60 : undefined,
        estimateMin: Math.random() < 0.5 ? randomEstimate() : undefined,
        completedAt: completed ? now : undefined,
        tags: randomTags(),
        priority: randomPriority(),
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Ahead: 1-3 entries/day, all incomplete, mostly time-blocked.
  for (let i = 0; i <= 14; i++) {
    const day = addDays(today, i);
    const count = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < count; j++) {
      rows.push({
        id: crypto.randomUUID(),
        type: 'task',
        title: randomOf(TITLES),
        dayKey: day,
        startMin: Math.random() < 0.7 ? Math.floor(Math.random() * 24) * 60 : undefined,
        estimateMin: randomEstimate(),
        tags: randomTags(),
        priority: randomPriority(),
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Unscheduled — no dayKey at all.
  for (let i = 0; i < 20; i++) {
    rows.push({
      id: crypto.randomUUID(),
      type: 'task',
      title: randomOf(TITLES),
      tags: randomTags(),
      priority: randomPriority(),
      createdAt: now,
      updatedAt: now,
    });
  }

  // One weekly recurring series. The rule lives on the earliest occurrence (the
  // "template") only — later rows are materialised occurrences sharing
  // seriesId, not regenerated from the rule here (src/data/series.ts does that
  // for real, lazily, for the visible window). Convention: seriesId is the
  // template's own id (src/data/series.ts).
  const templateDay = addDays(today, -4 * 7);
  const templateId = crypto.randomUUID();
  for (let i = -4; i <= 2; i++) {
    const isTemplate = i === -4;
    rows.push({
      id: isTemplate ? templateId : crypto.randomUUID(),
      type: 'task',
      title: 'Weekly review',
      dayKey: addDays(today, i * 7),
      startMin: 18 * 60,
      estimateMin: 30,
      seriesId: templateId,
      recurrence: isTemplate
        ? { kind: 'weekly', every: 1, weekdays: [new Date().getDay()], startDay: templateDay }
        : undefined,
      completedAt: i < 0 ? now : undefined,
      tags: ['work'],
      priority: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  // One parent task with subtasks, for the "2/5" progress display.
  const parentId = crypto.randomUUID();
  rows.push({
    id: parentId,
    type: 'task',
    title: 'Plan the offsite',
    dayKey: today,
    tags: ['work'],
    priority: 2,
    createdAt: now,
    updatedAt: now,
  });
  const subtaskTitles = ['Book venue', 'Send invites', 'Order catering', 'Book AV', 'Print agenda'];
  subtaskTitles.forEach((title, i) => {
    rows.push({
      id: crypto.randomUUID(),
      type: 'task',
      title,
      parentId,
      tags: [],
      priority: 0,
      completedAt: i < 2 ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });
  });

  await db.entries.bulkAdd(rows);
  // eslint-disable-next-line no-console
  console.log(`Seeded ${rows.length} entries.`);
}
