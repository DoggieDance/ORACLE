#!/bin/bash
# Oracle auto-push for macOS. Usage:
#   bash autopush-mac.sh install    -> adds a cron job (every 30 min, 00:35-18:35)
#   bash autopush-mac.sh uninstall  -> removes it
#   bash autopush-mac.sh push       -> one manual commit+push now
REPO="$(cd "$(dirname "$0")/.." && pwd)"
TAG="# oracle-autopush"

do_push() {
  cd "$REPO" || exit 1
  git add -A
  git commit -m "Auto: Oracle update" >> "$REPO/autopush.log" 2>&1
  git push origin main >> "$REPO/autopush.log" 2>&1
  echo "[$(date)] push cycle complete" >> "$REPO/autopush.log"
}

case "$1" in
  install)
    LINE="5,35 0-18 * * * /bin/bash \"$REPO/tasks/autopush-mac.sh\" push $TAG"
    ( crontab -l 2>/dev/null | grep -v "$TAG"; echo "$LINE" ) | crontab -
    echo "Installed. Auto-push runs at :05 and :35, 00:05-18:35 daily."
    echo "Repo: $REPO"
    ;;
  uninstall)
    crontab -l 2>/dev/null | grep -v "$TAG" | crontab -
    echo "Removed the Oracle auto-push cron job."
    ;;
  push)
    do_push
    ;;
  *)
    echo "Usage: bash autopush-mac.sh {install|uninstall|push}"
    ;;
esac
