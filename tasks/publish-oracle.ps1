# Oracle publisher (local, single-writer). Replaces auto-push.bat.
#
# One actor (this PC) owns every push. It publishes two SEPARATE files that can
# never collide with each other:
#   - index.html        (the app build, copied from the working folder)
#   - feeds.json         (the Reddit Bazaar/Wire feeds, refreshed here)
# Because feeds live in feeds.json now (not inside index.html), a feed refresh
# and an app build touch different files, so the old two-writer divergence is
# structurally impossible.
#
# Feeds use anonymous Reddit, which works from a home IP with NO API key. If you
# ever want feeds to refresh while this PC is off, set REDDIT_CLIENT_ID /
# REDDIT_CLIENT_SECRET and move the refresh into the GitHub Action instead.

$ErrorActionPreference = 'Stop'
$repo = "$HOME\OneDrive\Documents\GitHub\ORACLE"
$work = "$HOME\OneDrive\Documents\MTG\ORACLE INDEX"

function Get-Tag($path) {
  $m = Select-String -Path $path -Pattern 'oracle-build" content="v([\d.]+)' | Select-Object -First 1
  if (-not $m) { throw "no build tag in $path" }
  return [version]$m.Matches[0].Groups[1].Value
}

Set-Location $repo

# 1 - sync with origin. Fast-forward only; a divergence is a human problem.
git pull --ff-only
if ($LASTEXITCODE -ne 0) {
  Write-Host "PULL FAILED - origin and local have diverged. Nothing published."
  exit 1
}

# 2 - refresh feeds.json (anonymous Reddit; best effort - stale beats broken).
$refresh   = Join-Path $repo 'tasks\refresh-feeds.mjs'
$feedsFile = Join-Path $repo 'feeds.json'
if (Test-Path $refresh) {
  node $refresh $feedsFile
  if ($LASTEXITCODE -ne 0) { Write-Host "feed refresh failed - keeping existing feeds" }
}

# 3 - copy the app build only when it is strictly newer than what is live.
$workIndex = Join-Path $work 'index.html'
$workTag = Get-Tag $workIndex
$repoTag = Get-Tag (Join-Path $repo 'index.html')
if ($workTag -gt $repoTag) {
  Copy-Item $workIndex $repo -Force
  Copy-Item (Join-Path $work 'oracle-worklog.md') $repo -Force
  Write-Host "app build v$workTag staged (was v$repoTag)"
} else {
  Write-Host "no newer build (work v$workTag <= repo v$repoTag) - feeds-only run"
}

# 4 - stage exactly what we own (index.html + worklog if copied, feeds.json if changed).
git add index.html oracle-worklog.md feeds.json

# 5 - if nothing actually changed, stop cleanly (no empty commits).
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "nothing to publish (no new build, feeds unchanged)"
  exit 0
}

git commit -m "Publish: build v$workTag + feed refresh"

# 6 - fast-forward push, or undo the local commit and bail (never force-push).
git push origin main
if ($LASTEXITCODE -ne 0) {
  Write-Host "PUSH REJECTED - origin moved mid-run. Rolling back; rerun this script."
  git reset --hard HEAD~1
  exit 1
}
Write-Host "published - Pages deploys in about a minute"
