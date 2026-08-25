# CLAUDE.md — NexLife

Read this at the start of every session. It overrides your defaults. Do not edit it until
the 14-day gate.

---

## 1. The project

NexLife is a **single-user, offline-first personal planner**. One person uses it, on one
Android phone. There are no other users, ever.

It is written as a web app and shipped as a **sideloaded Android APK** via Capacitor.
Development happens on a laptop in VS Code. Nothing is published to the Play Store.

---

## 2. Hard rules — breaking these is a failed response

1. **No backend, no server, no database service, no auth, no login, no account concept.**
   One user, one device. Data lives in IndexedDB inside the app.
2. **No new npm dependency without asking first.** State the package, its gzipped size,
   and what it replaces. Wait for approval.
3. **Never exceed the performance budget** in §6. If a change would, say so before writing.
4. **UI components never touch Dexie.** All reads and writes go through `src/data/`.
5. **`src/data/` and `src/lib/` contain zero React imports.** They are pure TypeScript and
   must stay portable.
6. **One phase per session.** Do not build ahead. Do not add the next feature helpfully.
7. **Never rewrite the stack.** If you think Flutter, Expo, Next.js or React Native would
   be better, you are wrong for this project — say why in one sentence, then proceed with
   the stack below.
8. **Ask when genuinely ambiguous.** Do not guess at product behaviour.

---

## 3. Stack — locked

| Layer | Choice | Notes |
|---|---|---|
| Build | Vite + TypeScript | |
| UI | React 18, function components only | |
| Styling | Tailwind CSS over CSS variables | Tokens in §5 |
| Data | **Dexie.js** (IndexedDB) + `dexie-react-hooks` | `useLiveQuery` **is** the state layer |
| State | React `useState` for ephemeral UI only | No Redux, Zustand, Jotai, MobX |
| Navigation | **Hand-rolled screen stack** in `src/lib/nav.ts` (~40 lines) | No router library. A stack makes the Android back button trivial and saves ~10KB |
| Dates | `date-fns`, imported per-function | Never `import * from 'date-fns'` |
| NL parsing | `chrono-node`, **dynamic `import()` only** | Must not appear in the main bundle |
| Native shell | **Capacitor** | Added in Phase 1, not before |
| Icons | Hand-written inline SVG components | No icon library for a dozen icons |

**Forbidden without explicit approval:** any component library (MUI, Chakra, shadcn), any
animation library, any chart library, any date-picker library, any rich text editor,
moment.js, lodash, axios, an ORM, a state machine library, a service worker.

No service worker: the APK bundles its assets locally, so one adds failure modes and
nothing else.

---

## 4. Folder structure

```
src/
  data/                        zero React imports
    db.ts            Dexie schema + version migrations
    types.ts         Entry, EntryType, Recurrence, Settings
    entries.ts       ALL CRUD and queries — the only file touching Dexie
    recurrence.ts    pure: nextOccurrence, expandSeries
    parse.ts         natural-language quick-add (lazy-loads chrono)
    backup.ts        export / import JSON
    seed.ts          dev-only fake data
  lib/                         zero React imports
    time.ts          dayKey, todayKey, day-start-hour handling
    nav.ts           screen stack + Android back button
    native.ts        Capacitor bridges (haptics, notifications, status bar)
  screens/
    Today.tsx  Triage.tsx  Plan.tsx  Review.tsx  Settings.tsx
  components/
    QuickAdd.tsx  EntryRow.tsx  NowLine.tsx  BottomNav.tsx  Sheet.tsx
    EmptyState.tsx  ErrorBoundary.tsx
  styles/tokens.css
  App.tsx  main.tsx
```

No file over ~250 lines — split it. No `utils.ts` junk drawer.

---

## 5. Design system — apply exactly, do not reinterpret

**Direction: "ink at night."** A ruled paper day-planner rendered in ink. Opened at 6am and
11pm, one-handed, in the dark. Quiet everywhere except one place.

### Tokens — `src/styles/tokens.css`

```css
:root {
  --void:   #10141C;  /* app ground — deep blue-black, never pure black */
  --panel:  #171D28;  /* raised surfaces, sheets */
  --rule:   #263041;  /* hairlines, hour rules, dividers */
  --paper:  #E8E6E1;  /* primary text — warm off-white */
  --muted:  #7C879B;  /* secondary text, metadata, placeholders */
  --signal: #E9A13B;  /* THE accent — amber, time pressure only */
  --sp: 4px;          /* all spacing is a multiple of this */
  --r: 10px;          /* one radius, everywhere */
}
```

**`--signal` is the only accent in the app**, used for exactly three things: the Now Line,
overdue items, and the primary action in a sheet. Not for links, icons, nav, or "success".

**Completion is shown by removal, not colour:** opacity 0.35, strikethrough, reduced
vertical padding. No green ticks, no confetti, no badges.

Light mode: `--void` → `#F7F5F0`, `--panel` → `#FFFFFF`, `--paper` → `#10141C`,
`--rule` → `#DDD9D0`, `--muted` → `#6B7280`. `--signal` unchanged. Follow the OS
preference; default to dark.

### Type

**Inter Variable only**, self-hosted, latin subset, woff2, `font-display: swap`, fallback
`system-ui`. No second webfont — the performance budget is worth more than a display face.
Personality comes from how it is set:

- Times and numbers: `font-variant-numeric: tabular-nums`, letter-spacing `-0.02em`
- Time labels: weight 600, uppercase, 11px, tracking `+0.08em`, colour `--muted`
- Entry titles: weight 450, 16px / 1.35
- Screen headings: weight 700, 22px, always left-aligned, never centred

### The signature element — the Now Line

The Today screen is a vertical time grid with 1px `--rule` hairlines on the hour, like a
Filofax page. A **1px `--signal` rule marks the current time**, with a filled dot on the
left edge and the time in tabular numerals. It updates once per minute from **one shared
interval**, not one per component. Incomplete items scheduled above it get a 2px `--signal`
left border.

That line is the one memorable thing in the app. Everything else stays quiet: no gradients,
no shadows except a single subtle one on sheets, no decorative illustration, no icon that
isn't load-bearing.

### Mobile-only, non-negotiable

- Design at 390px wide. Desktop is not a target; the browser is only a dev surface.
- Primary actions live in the **bottom third**. Nothing critical in a top corner.
- Touch targets ≥ 44×44px, ≥ 8px apart.
- `env(safe-area-inset-*)` respected on every fixed element.
- Visible focus rings. `prefers-reduced-motion` honoured — the Now Line jumps rather than
  transitions, sheets appear without sliding.
- Every list has an empty state naming one action. Every async path has loading and error
  states. Zero blank screens.

### Copy

Sentence case, active voice. A button names what happens: "Reschedule", not "Submit". The
same word survives the flow — "Drop" produces "Dropped". Errors state what broke and what
to do, and never apologise. Empty states invite: *"Nothing scheduled. Add the first thing
you'll do today."* No motivational copy, no streak shaming, no emoji.

---

## 6. Performance budget — verify every phase

| Metric | Ceiling |
|---|---|
| Initial JS, gzipped | **120 KB** |
| Cold app open on the phone | < 600 ms |
| Any Dexie query at 10,000 entries | < 30 ms |
| List scrolling | 60fps — virtualise past 100 rows |
| APK size | < 12 MB |

Enforcement: route-split every screen with `React.lazy`. `chrono-node`, backup and Review
are dynamic imports. If a phase adds more than 15KB gzipped, flag it in your summary.

---

## 7. Data rules

- IDs are `crypto.randomUUID()`. Never auto-increment integers.
- Every write sets `updatedAt`. Never mutate an object in place.
- Deletes are **soft** (`deletedAt`), purged after 30 days.
- Day boundaries use a local-timezone `YYYY-MM-DD` **day-key string**, with a configurable
  day-start hour so a 1am entry belongs to the previous day. Never compare raw timestamps
  to decide "is this today".
- Schema changes **always** ship with a Dexie version bump and an upgrade function.

---

## 8. Working agreement

**Start of a phase:** restate the goal in one line, list the files you'll touch, name the
single biggest risk. Then wait for "go".

**End of a phase:** (1) files created or changed, (2) manual test steps to run on the phone,
(3) gzipped bundle impact against §6, (4) a one-line commit message.

If you catch yourself writing a workaround longer than ~10 lines to satisfy a constraint
here, stop and say so — it usually means the approach is wrong, not the constraint.