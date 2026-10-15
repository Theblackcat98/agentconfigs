---
description: PreToolUse hook that blocks force-pushes to shared branches before execution.
---

#!/usr/bin/env bash
# pre-push-guard.sh
#
# Blocks `git push --force` against shared branches. Explicitly allowed
# branches can be listed in ALLOWED_FORCE_BRANCHES.

set -euo pipefail

CMD_INPUT="${1:-}"
ALLOWED_FORCE_BRANCHES="${ALLOWED_FORCE_BRANCHES:-}"

if [[ "$CMD_INPUT" =~ git[[:space:]]+push[[:space:]]+(--force|-f) ]]; then
  BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  if [[ " $ALLOWED_FORCE_BRANCHES " == *" $BRANCH "* ]]; then
    exit 0
  fi
  echo "[BLOCKED] Force-push to '$BRANCH' blocked by pre-push-guard.sh." >&2
  echo "          Export ALLOWED_FORCE_BRANCHES=\"$BRANCH\" to override." >&2
  exit 1
fi

exit 0
