---
description: First-time setup for a fresh checkout. Verifies tools and runs the baseline checks.
---

# /setup

1. Read the project manifest and confirm the required toolchain versions.
2. Install dependencies with the project's canonical command (prefer lockfile-driven install).
3. Run the test suite once and record the baseline result.
4. Run the linter/formatter check.
5. Report: what is installed, what passed, what is unresolved.

Do not fix failures as part of setup. Report them and stop.
