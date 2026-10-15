---
description: PreToolUse shell hook that blocks destructive git or filesystem commands before execution.
---

#!/usr/bin/env bash
# pre-tool-guard.sh
#
# PreToolUse hook. Receives the proposed tool invocation and blocks
# obviously destructive patterns before they execute. Keep this list short
# and deterministic.

set -euo pipefail

CMD_INPUT="${1:-}"

# Patterns we always block. Add to this list only after a near-miss.
if [[ "$CMD_INPUT" =~ (rm[[:space:]]+-rf[[:space:]]+/|git[[:space:]]+push[[:space:]]+--force) ]]; then
  echo "[BLOCKED] Destructive command intercepted by pre-tool-guard.sh" >&2
  exit 1
fi

exit 0
