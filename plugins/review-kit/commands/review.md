---
description: Run a structured code-review pass over the current diff using the review workflow.
---

# /review

1. Collect the change scope: `git status`, `git diff --staged`, and recent commit messages.
2. For each changed file, check correctness, edge cases, naming, and unintended side effects.
3. Classify findings by severity: `blocker`, `should-fix`, `nit`.
4. End with a one-line verdict: `approve` or `needs-revision`.

Delegate deep review to the read-only `code-reviewer` agent when the diff exceeds roughly 400
changed lines.
