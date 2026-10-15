#!/usr/bin/env bash
# PreToolUse guardrail hook
set -euo pipefail

CMD_INPUT="${1:-}"
if [[ "$CMD_INPUT" =~ (rm[[:space:]]+-rf[[:space:]]+/|git[[:space:]]+push[[:space:]]+--force) ]]; then
  echo "[BLOCKED] Destructive command intercepted by pre-tool-guard.sh" >&2
  exit 1
fi
exit 0