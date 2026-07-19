# Herald Refresh — scheduled task

Keep the ORACLE front page current without human hands. Run every 2–3 hours
while this machine is awake; daily at minimum.

## Ground rules
1. `git pull` before touching anything. `git push` when done. Never work on a stale copy.
2. Commit ONLY if a feed actually changed. No empty refresh commits.
3. Feed refreshes do not bump the build version and do not add CHANGELOG entries. Real features do.
4. Voice: terse and confident. No filler, no AI slop. A blurb is one line.

## The three feeds (arrays in index.html, under the "FRONT PAGE" comment block)

### DEALS — r/sealedmtgdeals
- Fetch https://www.reddit.com/r/sealedmtgdeals/new.json?limit=25&raw_json=1
- Drop stickied posts and anything whose flair or title matches /sold out|expired|dead|ended/i (in-stock only — the policy is also commented in the code).
- Keep the 5–6 newest. Fields: t (title), u (full reddit permalink), s (score), c (created_utc), f (flair or empty string).

### WIRE — r/magicTCG
- Fetch https://www.reddit.com/r/magicTCG/hot.json?limit=15&raw_json=1
- Drop stickied and over_18. Prefer Official Spoiler flair and posts with score >= 300. Keep 4–6.
- Spoiler season means spoilers lead.

### NEWS (Dispatches) — editorial judgment
- Update only for genuinely major items: set announcements, ban list changes, big product reveals, release dates. Not every article.
- Each item: date, tag, one-line blurb, url, and img — a Scryfall art_crop that fits the story (https://api.scryfall.com/cards/named?exact=NAME).
- NEWS[0] renders as the lead story with full-width art. Put the biggest story first.

## Sanity before push
- File still ends with </html>; every script block parses (node --check).
- oracle-build meta still matches CHANGELOG[0].build.
