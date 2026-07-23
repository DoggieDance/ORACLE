# Oracle publisher (local, single-writer). Runs on a 30-min schedule.
# Owns index.html + oracle-worklog.md + feeds.json: clear stale lock -> pull ->
# refresh feeds from Reddit RSS -> copy a strictly-newer build -> ff-push.
# Logs every run (timestamped) to publish.log next to the repo.

$ErrorActionPreference = 'Stop'
$repo = "$HOME\OneDrive\Documents\GitHub\ORACLE"
$work = "$HOME\OneDrive\Documents\MTG\ORACLE INDEX"
$log  = Join-Path $repo 'publish.log'

function Log($m) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m
  try { Add-Content -Path $log -Value $line -ErrorAction SilentlyContinue } catch {}
  Write-Host $line
}
function Get-Tag($path) {
  $m = Select-String -Path $path -Pattern 'oracle-build" content="v([\d.]+)' | Select-Object -First 1
  if (-not $m) { throw "no build tag in $path" }
  return [version]$m.Matches[0].Groups[1].Value
}

# keep publish.log from growing forever: trim to last 500 lines when it gets big
try {
  if ((Test-Path $log) -and ((Get-Item $log).Length -gt 200KB)) {
    Set-Content -Path $log -Value (Get-Content $log -Tail 500)
  }
} catch {}

Log "=== run start ==="
try {
  Set-Location $repo

  # 0 - clear a STALE OneDrive-orphaned index.lock (safe: only if no git process
  #     is running AND the lock is >2 min old). Never disturbs a live git op.
  $lock = Join-Path $repo '.git\index.lock'
  if (Test-Path $lock) {
    $gitRunning = Get-Process git -ErrorAction SilentlyContinue
    $ageMin = ((Get-Date) - (Get-Item $lock).LastWriteTime).TotalMinutes
    if (-not $gitRunning -and $ageMin -gt 2) {
      Remove-Item $lock -Force -ErrorAction SilentlyContinue
      Log ("cleared stale index.lock (age {0}m, no git running)" -f [int]$ageMin)
    } elseif ($gitRunning) {
      Log "git already running (holds lock) - another run active; exiting"; exit 0
    } else {
      Log ("index.lock recent (age {0}m) - a run may be mid-flight; exiting" -f [int]$ageMin); exit 0
    }
  }

  # 1 - sync with origin (fast-forward only).
  $out = (git pull --ff-only 2>&1) -join ' | '; Log "pull: $out"
  if ($LASTEXITCODE -ne 0) { Log "PULL FAILED - origin/local diverged; nothing published"; exit 1 }

  # 2 - refresh feeds.json from Reddit RSS (best effort; stale beats broken).
  $refresh   = Join-Path $repo 'tasks\refresh-feeds.mjs'
  $feedsFile = Join-Path $repo 'feeds.json'
  if (Test-Path $refresh) {
    $out = (node $refresh $feedsFile 2>&1) -join ' | '; Log "feeds: $out"
  }

  # 3 - copy the app build only when strictly newer than what is live.
  $workIndex = Join-Path $work 'index.html'
  $workTag = Get-Tag $workIndex
  $repoTag = Get-Tag (Join-Path $repo 'index.html')
  if ($workTag -gt $repoTag) {
    Copy-Item $workIndex $repo -Force
    Copy-Item (Join-Path $work 'oracle-worklog.md') $repo -Force
    Log "app build v$workTag staged (was v$repoTag)"
  } else {
    Log "no newer build (work v$workTag <= repo v$repoTag)"
  }

  # 4 - stage exactly what we own.
  git add index.html oracle-worklog.md feeds.json

  # 5 - nothing changed? stop cleanly (no empty commits).
  git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) { Log "nothing to publish (no new build, feeds unchanged)"; exit 0 }

  git commit -m "Publish: build v$workTag + feed refresh" | Out-Null

  # 6 - fast-forward push, or roll back and bail (never force-push).
  $out = (git push origin main 2>&1) -join ' | '; Log "push: $out"
  if ($LASTEXITCODE -ne 0) {
    Log "PUSH REJECTED - origin moved mid-run; rolling back HEAD~1"
    git reset --hard HEAD~1 | Out-Null
    exit 1
  }
  Log "published v$workTag - Pages deploys in ~1 min"
}
catch {
  Log ("ERROR: " + $_.Exception.Message)
  exit 1
}
