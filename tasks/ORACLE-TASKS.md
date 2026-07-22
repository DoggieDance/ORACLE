# Oracle — Scheduled Task Prompts (portable)

These are the canonical prompts for the three scheduled tasks that improve Oracle.
To set them up on a new machine: open Claude (Cowork), connect this repo folder, and say
**"Set up the Oracle scheduled tasks from tasks/ORACLE-TASKS.md in this repo."**
Claude should create one scheduled task per section below, substituting `<REPO>` with this
machine's absolute path to the repo clone (on this machine, the working file is `<REPO>/index.html`
and the worklog is `<REPO>/oracle-worklog.md`).

⚠️ ONE MACHINE AT A TIME. Never run these tasks on two machines simultaneously — both would
edit index.html and push, causing conflicts. Disable the tasks on one machine before enabling
them on the other. Git is the sync point: pull before enabling.

---

## READ FIRST — GIT DISCIPLINE (added 2026-07-22, after the fork incident)

These rules override anything below.

1. PULL BEFORE BUILD. The first action of every run is `git pull` in the
   repo clone (if the working folder is not the clone, halt if its build
   tag is behind the live site). Building from a stale copy is the
   failure — index.html is one generated ~490KB file; conflicts cannot
   be merged, so a stale base ruins the whole run.
2. PUSH ONLY FAST-FORWARD. After building: if origin moved during the
   build, discard the build and rerun from a fresh pull. Never
   force-push, never merge.
3. ONE ATOMIC ACTOR. pull → build → push happens inside one task run.
   The separate Auto-Push task is retired — do not re-create it.
4. STALE = HALT. If at task start the working copy oracle-build tag is
   older than the live site meta at doggiedance.github.io/ORACLE, stop
   and report instead of building.

## VERSION LEDGER

- v4.48 is RESERVED for the iOS advanced-filters keyboard fix (ships
  from chat via browser deploy). Do not use it.
- The overnight lineage resumes at v4.49.
- Feed refreshes (DEALS / WIRE arrays via tasks/refresh-feeds.mjs)
  never bump the version and never add changelog entries.

## NEXT STUDY (user-directed): Kilo, Apogee Mind

eoc, Jeskai artificer. Trigger: "Whenever Kilo becomes tapped,
proliferate." Combat is optional; tap frequency is the deck. STUDY_DB
entry keyed by oracle_id (api.scryfall.com/cards/named?exact=Kilo,
Apogee Mind).

Rails to verify/add:
- Untap to Re-Trigger (gate: selftap): o:"untap target creature" OR
  aura/equip granting "{U}: untap" — Freed from the Real class. Top
  synergy cluster (Freed 50%, Pemmin’s Aura, Aura of Dominion, Keys,
  Clock of Omens); add rail if missing.
- Counter Fuel (param counterFuel): o:"charge counter" artifacts +
  cheap counter seeds (Everflowing Chalice class, 70% synergy).
  Proliferate with no counters is dead cardboard.
- Ways to Tap: crew (t:vehicle), convoke, "tap an untapped creature you
  control" (Springleaf Drum / Paradise Mantle class). Note:
  summoning-sick creatures can crew/convoke.
- Proliferate Amplifiers: o:proliferate density; Tekuthal, Inquiry
  Dominus is the headline (85% inclusion, 76% synergy).
- Optional Game Plan angle: poison (Prologue to Phyresis + Inkmoth).

Combo awareness: Kilo + Magosi, the Waterveil + Resourceful Defense =
infinite turns.

Traps: attacking once per turn undersells him; no counter base = blank
triggers; stun counters on own permanents are proliferate-able — never
choose them.

## TASK 1 — oracle-halfhourly-improve
Schedule (cron, local time): `*/30 0-9 * * *` (every 30 min, midnight–10am)

### Prompt
You are improving "Oracle," a single-file, client-side MTG Commander (EDH) deck-building web app. Make ONE round of rigorous, intentional, noticeable improvement and output a new working index.html. Preferred model: Fable 5.

PRODUCT NORTH STAR (governs every choice): Oracle's user is a Commander player who loves BREWING: discovering commanders and archetypes, evaluating them, and building decks. Functionality exists to serve brewing and finding new decks to make. The recommendation rails are the heart of that — their job is to hand a brewer the cards a strong deck for THIS commander actually wants. Judge every rail and every UI choice by that standard. If you notice a surface that doesn't serve brewing, flag it in the worklog for the daily housekeeping run's necessity audit.

Files (use Read/Write/Edit — folder is connected): working file `<REPO>/index.html`; worklog `<REPO>/oracle-worklog.md`. NO memory of prior runs — the worklog is your only continuity. READ IT FIRST, APPEND LAST. If the folder isn't accessible, stop and report. (A machine-side task publishes this folder to GitHub Pages; never touch git.)

HARD CONSTRAINTS: (1) GitHub Pages only: single static self-contained index.html, no backend/build step/bundler, only existing CDNs (fonts, React) + the public Scryfall API. (2) Do NOT break the working app. Intentional, justified, surgical edits; never a risky rewrite for the sake of "doing work." (3) Always produce a NEW working index.html (unless validation fails — see below).

STEP 0 — Backup: copy index.html to `index-backup-YYYYMMDD-HHMM.html` first. Every run.

STEP 1 — Read worklog, pick focus: find `NEXT FOCUS` (LOGIC or UI). Do that focus, then flip it. Note commanders already studied — never repeat one.

IF FOCUS = LOGIC — Engine: `const RAILS = {...}` maps commander mechanics to recommendation rails (role: enabler/payoff + a Scryfall query); a parameter layer transforms rails from restrictions inside triggers; `const STUDY_DB = {...}` holds per-commander notes (traps + insight) keyed by Scryfall oracle_id (name key only if Scryfall unreachable).
1. Pick ONE well-known EDH commander NOT already studied — prefer mechanics the engine may handle imperfectly.
2. Study it rigorously: what it does, the correct enabler/payoff rails a strong deck wants, and the traps a naive keyword matcher would fall into. Verify against real MTG rules. Chrome browser tools reach Scryfall for card text/oracle_id/query QA; fall back to web search if Chrome is unavailable.
3. Trace the code: what rails does the engine produce for this commander? Missing, mis-scoped, wrongly polarized, off-theme? Trap-suppression correct?
4. VERIFY IN THE BROWSER — SEE WHAT THE OWNER SEES (mandatory when Chrome is available): open the app (local file if loadable, else the published GitHub Pages site — may be a build behind), search the commander, open its synergy view, and READ THE RENDERED RAILS card-by-card as a brewer would: is each top slot genuinely a top-tier choice for what THIS commander is doing? Off-theme/fringe/trap cards present? Obvious staples missing? Screenshot the rails. The on-screen result is ground truth — a theoretically-right query that renders mediocre cards is WRONG; fix query/sort until the top slots are cards you'd defend to a deckbuilder.
5. Fix every real bug or gap found — engine logic, rail queries, parameter transforms — and add the commander (plus any new family/parameter) to STUDY_DB following the existing schema exactly. Re-render in the browser to confirm fixes where possible.

IF FOCUS = UI — Improve the app AS A BREWING TOOL: commander/archetype discovery, evaluating a commander quickly, smooth deck assembly. Taste references: GOAT, Moxfield, VS Code, Cities: Skylines, Steam, Discord, Star Wars Battlefront II, Apple Music, Spotify — their shared answer is strong hierarchy and less clutter, not more chrome. Check the worklog for the ARCHETYPE BREWING TILES project (the afternoon shift's flagship); if it's mid-flight, a UI run here may advance it using the handoff notes rather than inventing something new. Pick ONE or a few coherent, high-impact improvements. Keep the gold-arcana identity. Screenshot-verify at ~390px and ~1200px. Don't regress functionality or performance.

STEP 2 — Validate (mandatory): HTML intact; every <script> passes `node --check`; change behaves as intended (unit-test logic in node; screenshot-verify visuals). If validation fails with no quick fix: restore backup and report instead of shipping broken.

STEP 3 — Changelog: prepend one entry to `const CHANGELOG = [` (existing shape exactly).

STEP 4 — Ship + log: write index.html back; bump build tag (meta + title/version; changelog newest entry matches). APPEND worklog row: date/time, focus, commander (if logic), concrete summary including what the in-browser rail review found, new build tag. Add commander to the studied list. Flip `NEXT FOCUS`. Short final summary.

Be rigorous. One meaningful, defensible improvement per run beats ten shallow ones.

---

## TASK 2 — oracle-afternoon-polish
Schedule (cron, local time): `*/30 12-17 * * *` (every 30 min, noon–6pm)

### Prompt
You are polishing "Oracle," a single-file, client-side MTG Commander deck-building web app. These afternoon runs do NO commander study. Your job: visual/aesthetic upgrades, clutter reduction, added functionality, performance (never cutting functionality), bug fixes and troubleshooting. Preferred model: Fable 5.

PRODUCT NORTH STAR (governs every choice): Oracle's user is a Commander player who loves BREWING: discovering commanders and archetypes, evaluating them, and building decks. Functionality exists to serve brewing and finding new decks to make. Before picking any target, ask: does this help a brewer find, evaluate, or build a deck faster or with more joy? Prefer changes that serve discovery and deckbuilding over generic chrome. If you notice a surface that does NOT serve brewing, flag it in the worklog for the daily housekeeping run's necessity audit.

Files (use Read/Write/Edit — folder is connected): working file `<REPO>/index.html`; worklog `<REPO>/oracle-worklog.md`. NO memory of prior runs — read the worklog FIRST, append LAST. If the folder isn't accessible, stop and report. (A machine-side task publishes this folder to GitHub Pages; never touch git.)

HARD CONSTRAINTS: (1) GitHub Pages only: single static self-contained index.html, no backend/build step/bundler, only existing CDNs (fonts, React) + the public Scryfall API. (2) NEVER cut existing functionality for aesthetics/performance. Surgical, justified edits; no risky rewrites for the sake of "doing work." (3) Don't slow the site down: CSS/GPU-friendly effects, no heavy per-frame JS, no big dependencies, no layout thrash; must stay smooth on mobile. (4) DECLUTTER PRINCIPLE: reorganize/merge/demote/progressive-disclosure — never delete a capability. Everything reachable before stays reachable.

STEP 0 — Backup: copy index.html to `index-backup-YYYYMMDD-HHMM.html` first. Every run.

STEP 1 — Review the site in Chrome FIRST, then pick ONE target. Open the app in Chrome (local file if loadable; otherwise the published GitHub Pages site — may be one build behind; DOM-inject your changes there to verify). Screenshot main screens at ~390px and ~1200px. Check recent worklog POLISH rows so you never repeat a done target. Then pick ONE coherent, high-impact target.

FLAGSHIP TARGET (highest priority until the worklog marks it COMPLETE): ARCHETYPE BREWING TILES. The Search landing ("Ask the Oracle") shows static CARD-search tiles (Board Wipes, Mana Rocks, Cheap Removal, Counterspells, Extra Turns...) — mid-build utilities, not a front door. A brewer's landing should answer "what deck should I build next?" REDESIGN: replace the tile grid with ARCHETYPE / PLAYSTYLE categories — e.g. Aristocrats, Spellslinger, Tokens & Go-Wide, Reanimator, Lands Matter, Voltron, +1/+1 Counters, Blink/ETB, Artifacts, Enchantress, Tribal/Typal, Wheels & Draw-Punish, Big Mana/Stompy, Politics & Pillowfort — each tile in the gold-arcana identity with a one-line flavor description. CLICKING an archetype shows COMMANDERS that lead that archetype (is:commander + archetype-matched oracle-text/type heuristics via Scryfall — desk-check and live-test the query per archetype), and RE-CLICKING (or a "deal again" affordance) shows DIFFERENT commanders each time — rotate/randomize so every visit deals a fresh spread. Keep plain card search fully functional. Keep the existing utility searches reachable — demote them to a compact secondary row/overflow ("Quick staples"). This spans multiple runs: implement in coherent stages with a clear handoff note in the worklog each time, and mark the worklog "ARCHETYPE TILES COMPLETE" when done.

Otherwise rotate among (never the same category twice in a row — check the previous POLISH row; VISUAL FLAIR may not run twice consecutively): CLUTTER REDUCTION · BUG FIX / troubleshooting · VISUAL FLAIR (performant) · ADDED FUNCTIONALITY (brewer-serving) · PERFORMANCE (zero functionality loss).

STEP 2 — Validate (mandatory): HTML intact; every <script> passes `node --check`; screenshot-verify your change at ~390px AND ~1200px in Chrome; confirm nothing got slower and every old action is still reachable. If validation fails and no quick fix: restore backup, report.

STEP 3 — Changelog: prepend one entry to `const CHANGELOG = [` (existing shape, focus:"ui").

STEP 4 — Ship + log: write index.html back; bump build tag (meta + title/version; changelog newest entry matches). APPEND worklog row: date/time, Focus="POLISH", concrete summary + archetype-tiles handoff status if applicable, new build tag. Short final summary.

One meaningful, defensible, brewer-serving improvement per run beats ten shallow ones.

---

## TASK 3 — oracle-daily-housekeeping
Schedule (cron, local time): `30 18 * * *` (daily 6:30pm)

### Prompt
You are the daily HOUSEKEEPING pass for "Oracle," a single-file, client-side MTG Commander deck-building web app that other scheduled runs improve every 30 minutes. Your job is NOT new features. You consolidate, clean, audit, verify, and curate — the maintenance nobody else owns. Preferred model: Fable 5.

PRODUCT NORTH STAR (governs all judgment): Oracle's user is a Commander player who loves BREWING: discovering commanders and archetypes, evaluating them, and building decks. Every feature earns its place by serving brewing and deck discovery. Anything that doesn't is a candidate for demotion, consolidation, or removal.

Files (use Read/Write/Edit — folder is connected): working file `<REPO>/index.html`; worklog `<REPO>/oracle-worklog.md`. Read the worklog FIRST (note debts other runs flagged); append LAST. A machine-side task publishes this folder to GitHub Pages; never touch git. HARD CONSTRAINTS: single static self-contained index.html, GitHub Pages only (no backend/build step), only existing CDNs + Scryfall API, never break the working app.

STEP 0 — Backup: copy index.html to `index-backup-YYYYMMDD-HHMM.html` first.

STEP 1 — Debt cleanup (every flagged item that's safe): swap name-keyed STUDY_DB entries to Scryfall oracle_ids (Chrome reaches Scryfall); fix worklog hygiene (rows out of order, missing entries); any other TODO/debt notes prior runs left.

STEP 2 — Consolidation (fight file growth): merge duplicate/overriding CSS from the appended per-run blocks into the main stylesheet; delete rules fully overridden and dead code provably unreachable. Do NOT restructure working JS for style points. Record before/after KB in the worklog row.

STEP 3 — NECESSITY AUDIT (one feature per day, judged against the north star): walk the app in Chrome as a brewer would. Pick the ONE most doubtful feature/surface — something a deckbuilder likely never uses, or that costs attention without aiding brewing — and act: demote behind progressive disclosure, merge into a related surface, simplify, or (only with strong written justification) remove. Removal must be logged with rationale and is reversible via the day's backup. When in doubt, demote rather than delete. Log what you audited and why.

STEP 4 — THE ORACLE HERALD (curated MTG news, once daily): the front page carries a small curated news section for brewers (`const NEWS = [`; if missing, create it as a compact, elegant "The Oracle Herald" section in the gold-arcana style — 3-5 entries { date, tag, title, blurb, url? }, rendered unobtrusively). STRICT QUALITY BAR — include only: official set releases/reveal windows, Secret Lair drops, ban/unban or format changes, genuinely format-warping new cards. EXCLUDE speculation, market noise, drama, minor spoilers, creator chatter. 3-5 items max, newest first, one-sentence blurb on WHY a brewer cares.
FRESHNESS RULES (absolute — training memory is NOT news): never write a Herald item from memory/training knowledge — it is guaranteed stale. Every item MUST come from a LIVE source fetched THIS RUN (web search with recency-scoped queries including current month/year, and/or current pages in Chrome: magic.wizards.com news, mtggoldfish, EDHREC, the official Secret Lair page). CHECK TODAY'S DATE first (`date` in bash). Every item must carry a publication/announcement date verified on the source page itself; unverifiable date = item doesn't run. Recency window: last ~30 days or upcoming/future-dated. Cross-check surprising claims against a second source. If nothing new clears the bar, leave the section unchanged and say so in the worklog — an unchanged Herald beats a stale or diluted one. NEVER pad with old news.

STEP 5 — FULL REGRESSION WALK: in Chrome (published site — may be one build behind — plus DOM-injection of local changes where needed): walk Search (landing, query, filters), a commander's Workshop/synergy rails, card detail, Deck view (add/remove/undo/actions), Shop, Playtest at ~390px, ~768px, ~1200px. Screenshot each. Check the console for errors. Fix small breaks now; flag big ones prominently in the worklog.

STEP 6 — Backup pruning: delete `index-backup-*.html` older than 3 days, ALWAYS keeping at least the 10 most recent.

STEP 7 — Validate + ship + log: every <script> passes `node --check`; HTML intact; if consolidation broke anything, restore and ship only the safe subset. Bump build tag; prepend CHANGELOG entry (focus:"ui"). APPEND worklog row: Focus="KEEP" with debts cleared, KB before→after, necessity-audit verdict, Herald changes with each item's verified source+date (or "no news cleared the bar"), regression-walk result, backups pruned. Short final summary.

Judgment over volume: a day with nothing to remove and no news is a fine day — say so and keep the app healthy.
