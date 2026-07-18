# Running the Oracle tasks on a Mac

## ⚠️ Rule zero: one machine at a time
Never have the improvement tasks enabled on the PC and the MacBook simultaneously — both
would edit `index.html` and push, causing conflicts. Before enabling on the Mac, disable
(pause) the three tasks on the PC in Claude's Scheduled sidebar. Before switching back, do
the reverse. Always `git pull` (or Fetch in GitHub Desktop) before enabling on a machine.

## Setup (once)
1. Install GitHub Desktop (or `git` + sign in) and Claude desktop on the Mac.
2. Clone `DoggieDance/ORACLE` — GitHub Desktop's default puts it at `~/Documents/GitHub/ORACLE`.
3. Install the Claude extension in Chrome on the Mac and keep Chrome open during runs
   (runs use it to view the site and reach Scryfall).
4. Open Claude (Cowork), connect the clone folder, and say:
   **"Set up the Oracle scheduled tasks from tasks/ORACLE-TASKS.md in this repo."**
   Claude will create the three tasks, substituting `<REPO>` with the clone's path.
   Note: on the Mac the tasks read/write the repo clone directly — no separate working
   folder, so no mirror step is needed.
5. Auto-push: in Terminal, run:
   ```
   bash ~/Documents/GitHub/ORACLE/tasks/autopush-mac.sh install
   ```
   This installs a cron job that commits + pushes every 30 minutes from 00:35 to 18:35.
   (First push may prompt for GitHub credentials — signing into GitHub Desktop once fixes that.)
   To remove it later: `bash .../autopush-mac.sh uninstall`

## Daily use
Leave the Mac awake (Amphetamine/caffeinate or Energy Saver settings), Claude open, Chrome open.
Runs execute in the Claude app; missed runs fire once on next launch.

## What lives where
- On GitHub: `index.html` (the app), `oracle-worklog.md` (run memory), `tasks/` (this machinery).
- Local only (git-ignored): `index-backup-*.html` rollback snapshots, autopush logs.
