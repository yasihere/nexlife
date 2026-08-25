# BUILD.md — from nothing to an app on your phone

This is the only execution document. Follow it top to bottom. Tick every box. Do not skip
a gate.

**Session protocol** — identical every time, for every phase:

1. `cd nexlife` in VS Code, `npm run dev`, open `localhost:5173` in a browser window sized
   to ~390px wide
2. Open Claude Code and paste the phase prompt from `PROMPTS.md`
3. It restates the goal, lists files, names the risk — **check that against `SPEC.md`
   before you say "go"**. This is your cheapest chance to catch a misunderstanding.
4. Let it build. Review the diff — don't rubber-stamp it.
5. Test in the browser first (fast), then on the phone if the phase touches native
6. `git add -A && git commit -m "<its suggested message>"`
7. Tick the gate below. **If a gate fails, fix it now.** Never carry a broken phase forward.

---

# STAGE A — Setup. ~45 minutes. No AI.

- [ ] **A1** Install **Node.js 20 LTS** — nodejs.org
- [ ] **A2** Install **Git** — git-scm.com
- [ ] **A3** Install **VS Code** — code.visualstudio.com
- [ ] **A4** Install **Claude Code**, and its VS Code extension
      (needs a paid Claude plan; at ₹0 use Claude chat and paste files instead — the
      prompts are written to work either way)
- [ ] **A5** Create a GitHub account and an empty repo named `nexlife`
- [ ] **A6** In a terminal:
      ```
      git clone https://github.com/<you>/nexlife.git
      cd nexlife
      ```
- [ ] **A7** Copy `README.md`, `CLAUDE.md`, `SPEC.md`, `PROMPTS.md`, `BUILD.md` into the
      repo root. Commit and push.
- [ ] **A8** On your phone: Settings → About → tap **Build number** seven times to enable
      Developer options → enable **USB debugging**. You'll need this in Stage B.

**Skip for now:** JDK and the Android SDK. You don't need them until Phase 1, and Phase 1's
prompt walks you through it. Don't install Android Studio "just in case" — it's ~8GB.

**GATE A:** `npm --version` and `git --version` both respond, and the repo has five
markdown files in it.

---

# STAGE B — Phases 0 and 1. Prove the pipeline before building features.

These two phases produce an app that does almost nothing. That's the point: you prove that
code on your laptop becomes an installed app on your phone, while there's nothing to debug
but the pipeline itself.

### Phase 0 — Scaffold and design — 1 session, ~1 hour

- [ ] Run **Phase 0** from `PROMPTS.md`
- [ ] `npm run dev`, open in a narrow browser window

**GATE 0:** it looks like the design direction in `CLAUDE.md` §5 — dark ink ground, amber
Now Line, quiet everything else — and not like unstyled HTML. If it looks generic, say so
and have it redo the tokens before moving on. Restyling later costs 10× more.

### Phase 1 — APK on your phone — 1 session, ~2 hours

This is the hardest session in the whole project. Everything after it is easier.

- [ ] Install **JDK 17** (Temurin) and the **Android SDK**. Easiest route is Android Studio
      → it installs the SDK, then you can ignore the IDE forever. Tight on disk? Install
      `cmdline-tools` + `platform-tools` only (~1.5GB vs ~8GB).
- [ ] Run **Phase 1** from `PROMPTS.md`
- [ ] Generate your keystore when it tells you to — **see the warning below**
- [ ] Connect the phone by USB, accept the debugging prompt, then `adb install -r <apk>`
      (or copy the APK to the phone and tap it)

> ### ⚠️ The keystore. Read this twice.
> Android only allows an **update**-install if the new APK is signed with the **same key**.
> Different key → install fails → you must uninstall → **all your data is deleted.**
>
> - Generate **one** keystore, once. Back it up somewhere that is not your laptop.
> - Add `*.keystore` and `*.jks` to `.gitignore`. Never commit it.
> - If you lose it, every future install wipes your history. There is no recovery.

**GATE 1 — the airplane mode test.** Install the APK, turn on airplane mode, open the app
from the launcher. If it loads, your entire pipeline is proven. **Do not proceed until it
passes.** Debugging this later, through 4,000 lines of features, is a lost weekend.

---

# STAGE C — Build. One phase per session. ~2 weeks.

| | Phase | Sessions | Gate — you may not proceed until this is true |
|---|---|---|---|
| [ ] | 2 — Data layer | 1–2 | Seed 500 entries. The list renders. Force-close and reopen — data is still there. |
| [ ] | 3 — Today + Now Line | 2–3 | The Now Line sits at the real current time and moves. The grid scrolls to it on open. You can add and complete an entry. |
| [ ] | 4 — **Triage** | 1–2 | Test all three cases: 0 overdue (screen never appears), 1 overdue, 60 overdue (bulk-drop offered). Quit mid-triage and reopen — it resumes. |
| [ ] | 5 — Natural language | 1–2 | All 12 parse cases pass. Confirm `chrono-node` is **not** in the main bundle — check the build output. |
| [ ] | 6 — Task engine | 2 | Create a weekly recurring task. Complete one occurrence. Next week's still exists. "Edit all future" doesn't corrupt past ones. |
| [ ] | 7 — Backup | 1 | **Do it for real:** export → uninstall the app → reinstall → import. All data returns. Do not skip this. |
| [ ] | 8 — Polish + notifications | 2 | Bundle under 120KB gzipped. Cold open under 600ms. Ongoing notification shows today's top 3 and taps through correctly. |

**Rebuild the APK after Phases 4, 6 and 8** — not every phase. The browser is a faster dev
surface; the phone is for verification. Only native-touching phases require a rebuild.

**At Phase 4, start using it for real.** Yes, before 5–8 exist. Real use is the only thing
that tells you what to build next, and everything you build before real use is a guess.

---

# STAGE D — 14 days of use. Build nothing.

This is the real gate. It measures your habits, not your code, and no amount of laptop
speed shortens it by a single day.

- [ ] **D1** Move your existing task app off the home screen. If NexLife has an escape
      hatch, you'll use it and learn nothing.
- [ ] **D2** Export your data every Sunday. Two exports minimum.
- [ ] **D3** Capture every friction *in the app*, as tasks tagged `#nexlife`. If capturing
      a note in your own app is too annoying, that's finding number one.
- [ ] **D4** On day 14, run the **GATE prompt** in `PROMPTS.md`. Answer honestly —
      including about the features you were proud of and never opened.
- [ ] **D5** Delete what it tells you to delete. Then update `CLAUDE.md` and `SPEC.md` to
      describe what NexLife actually is, not what you guessed it would be.

**If you didn't open it on most of those 14 days, stop building.** That's not failure,
it's the cheapest product lesson available. Fix the daily loop, or shelve it — do not paper
over it by adding four more modules.

---

# STAGE E — Modules. One per fortnight, after Stage D only.

| | Phase | Sessions | Gate |
|---|---|---|---|
| [ ] | 9 — Habits | 2 | Under 30% new code. If more, the Phase 2 abstraction was wrong — stop and say so. |
| [ ] | 10 — Money + health | 2 | `"500 groceries #food"` and `"72.5kg"` both parse. Bundle still under budget. |
| [ ] | 11 — Notes + search | 2 | Search returns in under 50ms at 10,000 entries. |
| [ ] | 12 — Plan + Review | 2 | Review says five true sentences. If a chart doesn't beat a sentence, no chart. |

Run the **"talk me out of it"** prompt from `PROMPTS.md` before each one. Roughly half the
time it should talk you out of it — that's the prompt working, not failing.

---

# Failure protocol

1. **Revert first, debug second.** `git revert HEAD`. A clean base beats a clever fix.
2. **Paste the real error**, from the terminal or `chrome://inspect`. Never paraphrase it.
3. Use the **bug prompt** in `PROMPTS.md`: three ranked causes → confirm which → fix only
   that. Do not accept a refactor as a bug fix.
4. Two failed attempts means the *prompt* is wrong, not the AI. Re-run the phase with the
   failing constraint stated explicitly at the top.
5. Three burned sessions on one phase means **cut its scope in half** and ship the smaller
   thing.

**Debugging the app on the phone:** connect by USB, open `chrome://inspect` on your laptop,
and you get full DevTools on the WebView — console, network, IndexedDB inspector. This is
the single most useful thing to know about Capacitor development.

---

# Troubleshooting, in order of how often you'll hit it

| Symptom | Cause | Fix |
|---|---|---|
| APK install fails: "app not installed" | Signed with a different key than the installed version | Uninstall first — **export your data before you do** |
| White screen in the APK, works in browser | Asset paths, or a JS error in the WebView | `chrome://inspect` → console. Usually a wrong `webDir` or an absolute path |
| Gradle build fails on first run | JDK version mismatch | Must be **JDK 17**. Check `java -version`; 21 and 11 both cause obscure failures |
| `adb` doesn't see the phone | USB debugging off, or cable is charge-only | Re-check A8; try a different cable |
| Data gone after reinstall | Uninstall wipes app storage. It always will. | Export weekly. This is why Phase 7 exists |
| Bundle over budget | A dependency snuck in | `npx vite-bundle-visualizer`. Almost always a full-library import |

---

# Realistic timeline

| Stage | Days | At ~1–2 hours a day |
|---|---|---|
| A — Setup | 1 | One evening |
| B — Phases 0–1 | 2–3 | The hardest days. Push through. |
| C — Phases 2–4 | 4–8 | **Usable app around day 8** |
| C — Phases 5–8 | 9–16 | Finished v1 |
| D — Daily use | 17–31 | Zero building |
| E — Modules | 32+ | Optional, forever |

**~1 week to something you use. ~2.5 weeks to v1. ~6 weeks to something replacing four
other apps.** Anyone promising faster is describing a demo, not a tool you'll still be
opening in March.

---

# The three ways this actually dies

| Cause | Early warning | What to do |
|---|---|---|
| Phase 1 defeats you | Three days lost to Gradle and signing errors | Ship the web app to any free static host and install it as a PWA instead. You lose notifications, keep everything else, and can come back to the APK later. |
| You build ahead of Stage D | You're on Phase 10 and haven't used Phase 4 in a week | Stop. Go back to D. |
| You quietly stop opening it | Two mornings missed in a row | Ask why, honestly. It's almost always that the daily loop takes too many taps. Fix that one thing before anything else. |

The finished app is not the goal. **You opening it every morning for a year is the goal.**
Every decision in these files serves that one outcome.