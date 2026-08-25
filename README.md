# NexLife

A personal planner. One user, one phone, offline, free forever.

Built as a web app, shipped as an Android APK you sideload. No accounts, no server, no
Play Store, no subscription. Your data is a JSON file that lives on your device.

---

## The five files

| File | Read it | Purpose |
|---|---|---|
| `README.md` | now, once | This. The map. |
| `BUILD.md` | **open every session** | Step-by-step execution, setup → installed app. Your runbook. |
| `PROMPTS.md` | one section per session | The exact prompt to paste for each phase. |
| `CLAUDE.md` | never edit until day 40 | Rules the AI must follow. Pasted into every session. |
| `SPEC.md` | reference | What the app is, the data model, what's deliberately excluded. |

**These five files supersede any earlier versions.** Delete `SETUP.md`, `RUNBOOK.md`,
`APK.md`, and any standalone `deploy.yml` — their contents are folded into `BUILD.md`.

---

## The whole plan in ten lines

1. Install Node, VS Code, Git and Claude Code on the laptop — 30 min
2. Create the repo, add these five files — 15 min
3. **Phase 0**: scaffold the app, one styled screen running in the browser
4. **Phase 1**: wrap it with Capacitor, sign it, install the APK on your phone
   — *the pipeline is now proven, before a single feature exists*
5. **Phases 2–4**: data layer → Today screen with the Now Line → daily triage
   — *the app becomes genuinely useful here*
6. **Phases 5–8**: natural-language entry, recurrence, backup, polish
7. **Use it every day for 14 days. Build nothing.**
8. Cut whatever you never touched
9. **Phases 9–12**: habits, money + health, notes, weekly review — one per fortnight
10. Keep opening it every morning. That's the actual goal.

About one week to something usable, three weeks to something finished, six weeks to
something that replaces four other apps.

---

## What it does that Google Tasks doesn't

- **Daily triage** — nothing rolls over silently. Every overdue item must be done,
  rescheduled or dropped. The list can't rot into a graveyard.
- **One-line entry** — `pay rent fri 5pm #money !high ~30m` becomes a structured task.
- **A live day grid** — you see the shape of your day and exactly where you are in it.
- **Truly offline** — no network call on any interaction, ever.

---

## Cost

₹0. Node, VS Code, Git, Capacitor, Gradle, the Android SDK and GitHub are all free.
Self-signing an APK for sideloading is free. Not publishing to the Play Store means no
developer fee.

The only optional cost is a Claude plan for Claude Code, which roughly triples build
speed. Nothing else in this project ever needs to cost money — and if you're ever tempted
to add a server, that's the moment it stops being free and starts being a liability.

---

## Start here

Open `BUILD.md`. Do Stage A. It takes 45 minutes and needs no AI.