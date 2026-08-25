# PROMPTS.md — NexLife build phases

**How to use.** One phase per session. Never two at once.

- In **Claude Code**: it reads `CLAUDE.md` automatically. Paste just the phase prompt.
- In **chat**: paste `CLAUDE.md`, then `SPEC.md`, then the phase prompt.

Every phase ends with the same closing block. It's written into each prompt below — don't
delete it.

> **Closing block:** When done: (1) list every file created or changed, (2) give me manual
> test steps I can run, (3) report the gzipped bundle impact against CLAUDE.md §6, (4) give
> me a one-line commit message. If anything in CLAUDE.md forced a compromise, say so.

---

## Phase 0 — Scaffold and design

```
Read CLAUDE.md and SPEC.md.

Scaffold NexLife and get the visual identity right before there's anything to restyle.

Deliver:
1. A Vite + React 18 + TypeScript project. Dependencies: react, react-dom, dexie,
   dexie-react-hooks, date-fns, tailwindcss. Nothing else yet — no router, no icon
   library, no UI kit.
2. src/styles/tokens.css implementing the exact tokens in CLAUDE.md §5, with the light
   mode variant under prefers-color-scheme. Tailwind configured to consume these
   variables, not to define its own palette.
3. Inter Variable, self-hosted, latin subset, woff2, font-display swap. Not a Google
   Fonts <link> — the app must work with no network.
4. src/lib/nav.ts — a ~40-line screen stack: push, pop, replace, current. Zero React
   imports. It will handle the Android back button in Phase 1.
5. src/App.tsx — the Today screen shell: header with today's date and a placeholder count,
   an empty time grid with hourly --rule hairlines, a static Now Line at the current time,
   and the bottom nav (Today, Plan, Review, Settings). Three dummy entry rows.
6. Everything sized for a 390px viewport.

This must look like the "ink at night" direction in CLAUDE.md §5 — not like a bootstrap
template. Before you write code, describe in three sentences how you'll make the Now Line
the memorable element, and wait for my go.

[closing block]
```

**GATE 0:** it looks like the design direction, not unstyled HTML. If it looks generic,
say so and have it redo the tokens now — restyling later costs 10× more.

---

## Phase 1 — The APK pipeline. Prove distribution before features.

```
Read CLAUDE.md and SPEC.md.

I have a laptop with Node and VS Code. Get this app installed on my Android phone as a
signed APK. Add NO features — this phase exists to prove the pipeline while there's
nothing to debug but the pipeline.

1. Tell me exactly what to install (JDK version, Android SDK components) and the exact
   commands to verify each. Warn me about the specific JDK version trap.
2. Add @capacitor/core, @capacitor/cli, @capacitor/android. Init with
   appId com.<myname>.nexlife, appName NexLife, webDir dist.
3. capacitor.config.ts: fully bundled offline (no server URL), background colour matching
   --void, status bar and safe-area handling so nothing sits under the notch.
4. Wire src/lib/nav.ts to the Android hardware back button: it pops the screen stack, and
   exits the app only from Today.
5. Verify IndexedDB persists across app restarts inside the Android WebView. If a
   Capacitor setting is needed for that, set it and explain why.
6. Give me the exact keytool command to generate ONE release keystore, the Gradle signing
   config, and the .gitignore entries. Explain in two sentences what happens if I lose it.
7. Give me the exact command sequence: build web -> cap sync -> gradle assembleRelease ->
   where the APK lands -> adb install.
8. Tell me how to debug the app on the phone from my laptop.

Before writing: list every behaviour that works in a browser but can break inside an
Android WebView, and how you're handling each.

[closing block]
```

**GATE 1:** APK installed, airplane mode on, app opens from the launcher. Do not proceed
until this passes.

---

## Phase 2 — The data layer, before any real UI

```
Read CLAUDE.md and SPEC.md. Build the complete data layer. No new screens.

1. src/data/types.ts — the Entry and Recurrence models exactly as in SPEC.md. Type guards
   (isTask, isHabit, ...). Zero React imports.
2. src/data/db.ts — Dexie schema v1. Index only for queries we'll actually run: dayKey,
   [type+dayKey], completedAt, *tags, seriesId, deletedAt. Comment the reason for each.
3. src/data/entries.ts — the ONLY module touching Dexie:
   create, update, complete, uncomplete, drop, softDelete, restore, purgeOldDeleted,
   getByDay, getOverdue(beforeDayKey), getUnscheduled, search.
   Every write sets updatedAt. Every id is crypto.randomUUID().
4. src/lib/time.ts — timezone-safe dayKey('YYYY-MM-DD'), todayKey(), addDays, and a
   configurable day-start hour so a 1am entry belongs to the previous day. Zero React.
5. src/data/seed.ts — 500 realistic entries across the last 60 and next 14 days: a mix of
   completed, overdue, unscheduled, tagged, prioritised, and one weekly recurring series.
   Dev-only, behind a hidden button in Settings.
6. Wire the Today shell to render today's entries via useLiveQuery, to prove the chain.

Show me the schema and index plan and WAIT for my OK before writing. This is the expensive
mistake to get wrong.

[closing block]
```

---

## Phase 3 — Today, and the Now Line

```
Read CLAUDE.md §5 carefully. The Now Line is this app's signature element.

Build the Today screen properly:
- Vertical time grid from the day-start hour, 1px --rule hairlines on the hour, hour labels
  in the small uppercase --muted treatment
- Scheduled entries positioned by startMin, height from estimateMin, minimum 44px touch
  height even for 5-minute items, overlapping items side by side
- The Now Line: 1px --signal rule at the current time, filled dot at the left edge,
  tabular-numeral time label. ONE shared interval updating once per minute — not one timer
  per component. Incomplete items above the line get a 2px --signal left border.
- On first render, scroll so the Now Line sits ~35% from the top
- An "Unscheduled" section below the grid
- Tap-based quick add as a bottom sheet (natural language is Phase 5): title, today/tomorrow
  toggle, optional time. Thumb-reachable. Closes on submit.
- Tap an entry to complete: opacity 0.35 + strikethrough. No colour change, no animation
  beyond a 120ms fade.
- Empty state: "Nothing scheduled. Add the first thing you'll do today."

Honour prefers-reduced-motion: the Now Line jumps, sheets appear without sliding.

[closing block]
```

---

## Phase 4 — Triage. The feature this app exists for.

```
Read SPEC.md — Triage. Build it.

Trigger: on app open, if todayKey() is later than the stored lastTriageDay AND at least one
incomplete entry has a dayKey before today, show Triage before Today.

Behaviour:
- One card at a time, oldest first, with a counter ("3 of 7")
- Three full-width, thumb-height actions: Today / Reschedule / Drop
- Reschedule offers: Tomorrow, This weekend, Next week, Pick a date
- Drop sets droppedAt — NOT a delete. Dropped items still appear in Review.
- Swipe left = Drop, swipe right = Today, as an accelerator. Buttons stay.
- Closing summary, one honest line: "Yesterday: 6 done, 2 dropped." No score, no streak,
  no encouragement copy, no emoji.
- A small "Later" link skips it, but it reappears next open until cleared
- Store lastTriageDay only when the queue is fully emptied

Edge cases you must handle: zero overdue (never show it), 60 overdue (offer "Drop all older
than 14 days" at the top — don't make me tap 60 times), and quitting mid-triage.

[closing block]
```

**From here, start using the app for real.** Phases 5–8 are improvements to something you
already use, which makes them far better decisions.

---

## Phase 5 — Natural-language quick add

```
Build the one-line quick-add parser.

Must work:
  "pay rent friday 5pm #money !high ~30m"
  "gym tomorrow 6am ~45m #health"
  "call bank"                        -> unscheduled task, nothing else set
  "review notes next monday"
  "groceries sat #home !low"

Grammar:
  free text        -> title
  #tag             -> tags[]
  !low|!med|!high  -> priority 1|2|3
  ~30m / ~1h30     -> estimateMin
  @low|@med|@high  -> energy
  remainder parsed by chrono-node -> dayKey + startMin

Requirements:
1. src/data/parse.ts, zero React imports, chrono-node behind a dynamic import() so it stays
   out of the main bundle. Report the actual bundle numbers.
2. A live preview above the input showing chips for title, date, time, tags, priority,
   estimate. I see it before I confirm.
3. Ambiguity is never silently guessed. Unclear date -> unscheduled task with the full text
   as title, plus a hint chip.
4. Parsed tokens stripped cleanly from the title — no leftover "#money".
5. At least 12 test cases as plain assertion functions, runnable from the dev screen.

[closing block]
```

---

## Phase 6 — Full task engine

```
Complete the task model, in this order:

1. Recurrence. src/data/recurrence.ts, pure, zero React:
   nextOccurrence(rule, after) and expandSeries(rule, fromDay, toDay).
   Rules stored; occurrences materialised lazily for the visible window only — never
   generate 500 rows. Completing one occurrence must not affect the series. Editing asks:
   this one, or all future?
2. Subtasks via parentId. Parent shows "2/5". Completing all children does NOT auto-complete
   the parent — prompt me subtly instead.
3. Tags, priority and energy on the entry sheet, with a filter bar on Today.
4. The filter that matters: "what can I do right now" — filter by energy plus a
   time-available control (15/30/60 min) matched against estimateMin.

Priority is expressed by weight and a left rule, never a red badge. --signal stays reserved
for time pressure.

[closing block]
```

---

## Phase 7 — Backup. Before you trust it with real data.

```
My data exists only in this app's storage. Uninstalling deletes it. Make it recoverable.

1. src/data/backup.ts, lazy-loaded:
   - exportAll(): one JSON file { schemaVersion, exportedAt, entries[], settings }
   - Save via the Capacitor filesystem/share sheet so I can send it straight to Drive
   - importAll(file): validate schemaVersion and every entry, show a summary
     ("412 entries, 8 invalid — skip or cancel?"), require explicit confirmation
   - Two modes: Replace everything, or Merge by id keeping the newer updatedAt
   - A forward-migration stub for future schema versions
2. Settings: Export, Import, entry count, storage used, purge deleted older than 30 days,
   date of last export.
3. If the last export was over 14 days ago, show one quiet dismissible line on Today:
   "Last backup 18 days ago. Export." One line. Not a modal.

Then run the full round trip against seed data yourself and show me the result.

[closing block]
```

**GATE 7:** export → uninstall the app → reinstall → import → all data returns. Do this for
real. An untested backup is not a backup.

---

## Phase 8 — Polish, notifications, and the widget substitute

```
No new features. Make it feel like a real app.

1. Route-split every screen with React.lazy + Suspense. Report bundle before/after.
2. Virtualise any list past 100 rows.
3. Real empty, loading and error states everywhere. An ErrorBoundary that shows what broke
   and offers "Export data" — a crash must never trap my data.
4. @capacitor/local-notifications: schedule reminders for entries with a startMin, at a
   configurable lead time. Ask before adding it and report the size.
5. An ongoing (non-dismissible) notification showing today's top 3 incomplete entries,
   updating on every relevant write, tapping through to the right screen. This is the
   home-screen widget substitute — see SPEC.md non-goals.
6. Launcher shortcuts: long-press the app icon -> "Add task", "Today".
7. Haptics on complete and drop (10ms, respecting reduced motion).
8. Accessibility pass: 44px targets, visible focus, contrast against the tokens, labels on
   icon-only buttons.
9. Measure and report cold-open time on the device. Target under 600ms.

Give me the results as a table: check | pass/fail | fix applied.

[closing block]
```

---

## GATE — after 14 days of daily use. Run this before Phase 9.

```
I've used NexLife every day for two weeks. Honestly:

Used every day: [...]
Used once or never: [...]
Annoyed me: [...]
Wanted but doesn't exist: [...]
Mornings I opened it first, out of 14: [...]

Three things, in this order:
1. Tell me what to DELETE. Be specific and ruthless — unused code is a permanent tax.
2. Tell me which annoyances are real design problems and which are me not having built the
   habit yet. Do not agree with me to be agreeable.
3. Only then propose the next module and its cost in sessions.

Write no code in this response.
```

---

## Phase 9 — Habits

```
Add habits, reusing the existing entries table, recurrence engine and row components. If
you're writing more than 30% new code, the Phase 2 abstraction was wrong — stop and say so
before building.

- type: 'habit', driven by existing Recurrence including 'timesPerWeek'
- Streak computed, not stored, where possible; if stored, it must be recomputable
- Habits appear in Today alongside tasks, distinguished by a small left dot rule, not colour
- A habits screen: compact 7-day grid per habit, filled/empty cells, no heatmap gradients
- Breaking a streak shows the number and nothing else. No guilt copy, no flame icon.

[closing block]
```

---

## Phase 10 — Money and health, as one module

```
Money and health are the same thing: a timestamped number with a unit.

- type: 'log', using amount + unit. Default currency INR.
- Quick-add grammar extension: "500 groceries #food" -> amount 500, unit INR;
  "72.5kg" -> amount 72.5, unit kg. Support weight, steps, water, sleep, spend.
- A log screen grouped by unit, with this-week and this-month totals and an inline SVG
  sparkline per unit. No chart library — if you think one is needed, state its gzipped
  size and wait.
- Money view: total by tag this month, and the three tags that grew most vs last month.
- No budgets, no goals, no category UI beyond the tags that already exist.

[closing block]
```

---

## Phase 11 — Notes and search

```
- type: 'note' with a body, no dayKey required
- Minimal editor: plain text, rendering headings, bold and checkboxes. No rich text editor
  library — state the cost first if you think one is needed.
- Global search across all types: title, body, tags. Under 50ms at 10,000 entries — tell me
  your indexing approach before building it.
- A note can attach to an entry via parentId.

[closing block]
```

---

## Phase 12 — Plan and Review

```
1. Plan: 7 columns showing scheduled density and counts, drag an entry between days.
   Read-mostly — this is for seeing shape, not detailed editing.
2. Review, lazy-loaded, weekly: completed vs dropped, the tag I drop most, busiest and
   emptiest day, and the average gap between scheduling something and doing it.
   Five honest sentences. A chart only where a chart says something a sentence can't.
   No congratulation, no streaks.

[closing block]
```

---

## Reusable prompts

**Something is broken**
```
Bug: [what I see]. Expected: [what should happen]. Steps: [how to reproduce].
Error output: [paste the actual terminal or chrome://inspect console output]

Before fixing: give me the three most likely causes ranked by probability, and how you'd
confirm which one it is. Then fix only that cause. Refactor nothing else.
```

**Second opinion**
```
Review [file/feature] as a senior engineer who will inherit this codebase and has no
patience. Table: issue | severity | file:line | why it matters for a single-user offline
app | fix. Fix only the High severity items. Do not refactor for elegance.
```

**It's slow**
```
The app feels slow when [X]. Measure before you guess: tell me what you'd instrument, add
it, and report real numbers against CLAUDE.md §6. Only then propose a fix.
```

**Talk me out of it** — *run this before every optional feature*
```
I want to add [feature]. First, argue the case for NOT building it: what does it cost in
bundle size, complexity and maintenance? What existing feature does it overlap? What would
I have to do for two weeks to prove I actually need it?
Then give me your recommendation. You are allowed to tell me not to build it.
```