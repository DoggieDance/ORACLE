# Oracle — Hourly Improvement Worklog

This file is the shared memory for the hourly scheduled task. Each run is a fresh
session with NO memory of prior runs, so this log is the ONLY continuity between them.
Every run MUST read this file first and append to it last.

## Current state (seed)
- File under work: `index.html` (single-file, static, GitHub Pages compatible)
- Build tag at seed: `v4.14 · 2026-07-16`
- Commanders in STUDY_DB at seed: ~55
- Seeded: 2026-07-17 01:23 EDT

## Focus rotation
Runs alternate between two focus modes. Read `NEXT FOCUS` below to decide this run's mode.
- **LOGIC** run: study one new commander, verify the RAILS engine + parameter transforms
  handle it correctly, audit per-rail Scryfall result quality, fix real bugs.
- **UI** run: improve visual design, responsiveness, usability, organization, polish —
  inspired by GOAT, Moxfield, VS Code, Cities: Skylines, Steam, Discord,
  Star Wars Battlefront II, Apple Music, Spotify.

**NEXT FOCUS: UI**

## Commanders studied (record NAME each logic run so we don't repeat)
(Seed STUDY_DB already covers ~55 including: Loki, Orthion, Gev, Renata, Yenna, Urza,
Saheeli, Tayam, Arwen, Tivit, Magus, Dogmeat, Grishnakh, Toph, Obuun, Mangara, Krydle,
Lilah, Locke, Korlash, Rakdos, Myojin, Faldorn, Naomi, Hinata, Fain, Parnesse, Ygra,
Serpent Society, Vihaan, Teval, Go-Shintai, Storm, Thalia+Gitrog, Sakashima, Brudiclad,
Hapatra, Ezuri, Estrid, Osgir, Riku, Atraxa, Marath, Queen Marchesa, Uril, Rafiq, Zedruu,
Omnath Locus of Rage, Titania, Nekusar, Niv-Mizzet Parun, Alrund, Muldrotha, and others.)
- 2026-07-17: **Kaalia of the Vast** (oracle_id cb8d80c9-ed58-4f2d-aa8c-c383370c7f1a)
- 2026-07-17: **Yuriko, the Tiger's Shadow** (oracle_id a7043fbd-1dfd-42cf-be4b-cc343d0949e5)

## Run history
| Run | Date | Focus | Commander studied | Summary of changes | New build tag |
|-----|------|-------|-------------------|--------------------|---------------|
| — | 2026-07-17 | (seed) | — | Worklog + hourly schedule created | v4.14 |
| 1 | 2026-07-17 01:38 EDT | LOGIC | Kaalia of the Vast | Backup: index-backup-20260717-0138.html. Found 3 real defects in the massdeploy/attack handling: (1) Haymakers rail recommended any pow/mv>=7 creature, but Kaalia's cheat pool is TYPE-LOCKED to Angel/Demon/Dragon — added `P.deployTypes` (parses subtype list from "put an X, Y, or Z creature card from your hand onto the battlefield", filtered against TRIBES) which rewrites Haymakers to the exact typed pool at any MV; (2) Evasion Enablers was mis-aimed — Kaalia's trigger fires on attack DECLARATION, not combat damage, so added `P.deployOnAttack` which swaps Evasion→Attack Safety (Dolmen Gate/Reconnaissance/Iroas/Bastion Protector-class query) and (3) added Haste Enablers + Extra Combats rails for attack-gated deployers (each extra combat = another free deploy). Added Kaalia to STUDY_DB with 4 traps incl. the official ruling that a creature put onto the battlefield attacking was never DECLARED an attacker (its own attack triggers don't fire) and that attacking a planeswalker doesn't trigger her. Regression-tested in node: Ilharg (untyped attack-deploy) keeps Haymakers + gains attack suite; Edric (damage-trigger) unchanged, keeps Evasion. All 5 script blocks pass `node --check`. NOTE: api.scryfall.com is blocked from this sandbox (proxy allowlist) and web_fetch returns empty for it — Kaalia's text/oracle_id verified via web search (Gatherer/Scryfall results); new Scryfall queries use only syntax already proven in the file and were desk-checked against known staple oracle texts, not live-fetched. | v4.15 |
| 2 | 2026-07-17 01:52 EDT | UI | — | Backup: index-backup-20260717-0152.html. "Card text reads like a card" pass on the detail overlay (the app's most-read surface). (1) New `OracleText` component: oracle rules text now renders inline mana-symbol PIPS instead of raw `{T}: Add {G}` braces — supports WUBRG, generic, C, X/Y/Z, tap ↷ / untap ↶, snow, energy, Phyrexian Φ, hybrid, and {2/C} monocolor-hybrid; paragraphs get real rhythm (p margins) instead of pre-wrap. (2) Correctness fix: rules text is now UPRIGHT with only parenthesized reminder text italic+dimmed (`.rem`) — real MTG frames italicize only reminder/flavor; previously ALL rules text was italic. (3) Real bug fixed: the hybrid pip in the mana-cost row was hardcoded to a gold/blue gradient for every pairing — new shared `pipFor()` (also now backing `ManaPips`) builds color-correct split gradients from PIP_HEX, so {B/R} finally shows black/red. Pips carry `title="{sym}"` tooltips. Validation: 5/5 script blocks pass `node --check`; behavior unit-tested in node with a React stub (hybrid colors, Phyrexian, reminder wrapping, multi-line, empty-string null). Surgical: only ManaPips block, one render line in DetailOverlay, one appended CSS block, build meta. | v4.16 |
| 3 | 2026-07-17 02:20 EDT | LOGIC | Yuriko, the Tiger's Shadow | Backup: index-backup-20260717-0203.html. Studied the #1-popularity ninjutsu commander. Trace showed the engine caught tribe (More Ninjas), ninjutsu, attack, and drain rails but was BLIND to Yuriko's defining engine: her trigger converts the REVEALED TOP CARD'S mana value into table-wide drain, and the topdeck atom's regex (needs play/cast after "top card of your library") doesn't fire on her wording. Added parameter `P.revealMV` (reveal-top + "equal to that card's/its mana value") producing two new rails: (1) **Topdeck Control** — query live-tested via browser->Scryfall (order=edhrec): top results are exactly the real package (Brainstorm, Vampiric/Mystical/Imperial Seal, Ponder, Sensei's Top, Scroll Rack, Scheming Symmetry, Lim-Dûl's Vault, Insidious Dreams, Doomsday; 106 cards); needed 4 clauses because Vampiric-class tutors now read "put that card on top" (not "...of your library"), and `-t:land` to cut recursion-land noise; (2) **Sky-High Mana Values** — `mv>=7 (delve OR is:mdfc OR "rather than pay" OR "extra turn" OR affinity OR miracle)`, 58 cards, top = Dig/Cruise/Sea Gate Restoration/Emrakul/Commandeer/Nexus/Expropriate/Temporal Trespass — castable haymakers, not stranded fatties. Added Yuriko to STUDY_DB (4 traps: pump is wasted — damage scales with revealed MV not power; ninjutsu'd ninjas were never declared attackers (attack triggers silent, damage triggers fire); {X}=0 in library; player-only trigger + drain-is-output-not-theme). Control test: Galea ("look at top card any time", no MV clause) correctly does NOT fire revealMV. Regressions: Kaalia + Nekusar rails unchanged. NOTE: api.scryfall.com unreachable via sandbox/web_fetch but IS reachable through the Chrome browser tools — used that for oracle text, oracle_id, and live query QA; future runs should do the same. All 5 script blocks pass node --check. | v4.17 |
