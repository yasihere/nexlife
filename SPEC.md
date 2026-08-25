# SPEC.md — NexLife

## The one-line job

**Decide what you're doing today, and don't let yesterday pile up silently.**

If a feature doesn't serve that sentence, it goes to a later phase or gets cut.

---

## Why not just use Google Tasks

| Its failure | NexLife's answer |
|---|---|
| Undone tasks roll over invisibly until the list is a graveyard | **Daily triage.** Each morning, every overdue item must be done, rescheduled or dropped. Nothing rolls over silently. |
| Entry is slow — tap, type, tap a date picker, tap save | **One-line natural language.** `pay rent fri 5pm #money !high ~30m` → a structured entry. |
| A flat list gives no sense of the day | **A time grid with a live Now Line.** You see the shape of the day and where you are in it. |

Secondary: fully offline, instant, no account, no ads, no telemetry, and your data is a
JSON file you own.

---

## The architectural bet: one entity, five lenses

Tasks, habits, expenses, health logs and notes are the same object with different fields
populated. Build the task engine correctly and each later module is 2–3 days, not a rewrite.

```ts
type EntryType = 'task' | 'habit' | 'log' | 'note';

interface Entry {
  id: string;              // crypto.randomUUID()
  type: EntryType;
  title: string;
  body?: string;           // notes, long-form

  // scheduling
  dayKey?: string;         // 'YYYY-MM-DD' local — source of truth for "which day"
  startMin?: number;       // minutes from midnight, for time-blocked items
  estimateMin?: number;
  completedAt?: number;
  droppedAt?: number;      // triage: explicitly abandoned, not deleted

  // recurrence — drives repeating tasks AND habits
  recurrence?: Recurrence;
  seriesId?: string;
  streak?: number;         // habits only

  // measurement — drives money AND health
  amount?: number;
  unit?: string;           // 'INR' | 'kg' | 'steps' | 'ml' | 'hrs' ...

  // organisation
  tags: string[];
  priority: 0 | 1 | 2 | 3; // 0 none … 3 highest
  energy?: 'low' | 'med' | 'high';
  parentId?: string;       // subtasks

  createdAt: number;
  updatedAt: number;
  deletedAt?: number;      // soft delete, purged after 30 days
}

type Recurrence =
  | { kind: 'daily';        every: number }
  | { kind: 'weekly';       every: number; weekdays: number[] }  // 0 = Sunday
  | { kind: 'monthly';      every: number; dayOfMonth: number }
  | { kind: 'timesPerWeek'; count: number };                     // habits: "3x a week"
```

Recurrence is stored as a **rule, not 500 generated rows**. Occurrences are materialised
lazily for the visible window and persisted only once completed or modified.

---

## Screens

**Today** — home, and 90% of all usage.
Hourly time grid with the Now Line. Scheduled items placed by `startMin`, sized by
`estimateMin`. An "Unscheduled" list below. Quick-add pinned above the bottom nav. Header
shows the date, the count remaining, and a thin progress rule — not a ring, not a
percentage.

**Triage** — appears automatically on the first open of a new day, if anything is overdue.
One card at a time. Three fat buttons: **Today / Reschedule / Drop**. Reschedule offers
tomorrow, this weekend, next week, or a date. Ends with one line: *"Yesterday: 6 done, 2
dropped."* No score, no streak, no encouragement.

**Plan** — the week. Seven columns, density blocks, drag between days. Read-mostly.

**Review** — weekly, lazy-loaded. Completed vs dropped, most-dropped tag, busiest day.
Five honest sentences, not a dashboard.

**Settings** — theme, day-start hour, export, import, storage used, purge deleted.

---

## Build phases

| Phase | Ships | Why here |
|---|---|---|
| 0 | Scaffold, design tokens, one styled screen in the browser | Get the look right before there's much to restyle |
| 1 | **Capacitor + keystore + signed APK installed on the phone** | Prove distribution before investing in features |
| 2 | Data layer, schema, migrations, seed | Schema mistakes are the expensive ones |
| 3 | Today screen + Now Line + tap-based quick add | The daily surface |
| 4 | **Triage / auto-rollover** | The retention mechanic — the reason it survives |
| 5 | Natural-language quick add | Removes entry friction |
| 6 | Recurrence, subtasks, tags / priority / energy filters | Full task engine |
| 7 | Backup: export / import JSON | Before you trust it with real data |
| 8 | Polish, ongoing notification, local reminders | Feels like a real app |
| — | **Use it daily for 14 days. Build nothing. Cut what you never touched.** | Non-negotiable gate |
| 9 | Habits (reuses recurrence + streak) | |
| 10 | Money + health logs (reuses amount + unit) | |
| 11 | Notes + global search | |
| 12 | Plan (week) + Review (weekly) | |

The app becomes genuinely useful at **Phase 4**. Start using it for real then, even though
5–8 don't exist yet.

---

## Explicit non-goals

Cut permanently, not "later": user accounts, cloud sync by default, sharing, collaboration,
comments, an AI assistant inside the app, two-way calendar sync, push notifications
requiring a server, gamification, analytics, engagement mechanics, a desktop layout, iOS
support, the Play Store.

**Home-screen widget: deferred to Phase 13, probably never.** An Android widget needs a
Kotlin `AppWidgetProvider` plus a bridge mirroring data into `SharedPreferences`, because
the widget process can't read the WebView's IndexedDB. That's 4–7 days in a language
nothing else in the app uses, and a permanent maintenance surface.

Cheaper substitutes, in order of value per hour:

| Substitute | Effort | Gets you |
|---|---|---|
| Launcher shortcuts (long-press icon → Add task, Today) | hours | Fast entry from the home screen |
| Ongoing notification with today's top 3 (Phase 8) | ~1 day | Glanceable, tappable, on the lock screen too |
| Local scheduled reminders (Phase 8) | ~1 day | What a planner actually needs |
| Real home-screen widget | 4–7 days | A rectangle |

Build the notification first. Earn the widget with evidence, not assumption.

---

## Upgrade paths, kept open by design

| Want | Path | Cost |
|---|---|---|
| Sync a second device | Encrypted JSON blob in a private GitHub Gist via a token — no server | ₹0 |
| Calendar | One-way `.ics` import, parsed on device | ₹0 |
| Widget | Kotlin AppWidgetProvider + SharedPreferences bridge | ₹0, ~1 week |
| Play Store | Switch the Gradle target to AAB, pay the one-time developer fee | Not planned |

This is why `src/data/` and `src/lib/` must stay free of React imports — they port unchanged.

---

## Definition of done for v1 (Phases 0–8)

- Installs from an APK and cold-opens in under 600ms
- Works in airplane mode, indefinitely
- Handles 10,000 entries without visible stutter
- Export produces a readable JSON file that re-imports cleanly
- **You opened NexLife before any other app on at least 10 of 14 mornings**

That last one is the real definition. The other four are just preconditions for it.