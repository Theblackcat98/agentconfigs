# Wave 1 — surveyor brief

One surveyor per section. The brief must be **written from what the survey
saw**, not from a generic template: real file names, real symbols, the odd
thing the inventory flagged. Generic briefs produce generic documents.

## Contents

- [The anatomy field set](#the-anatomy-field-set)
- [Brief template](#brief-template)
- [Worked example — event engine section](#worked-example--event-engine-section)
- [Common failure modes](#common-failure-modes)

## The anatomy field set

Every surveyor fills every field, or writes `unknown` plus what would be
needed to find out. The field set is what makes section reports comparable
and mergeable.

1. **Purpose** — one sentence a newcomer could repeat.
2. **Public surface** — what the outside world can call: exported symbols,
   CLI flags, routes, event names, config keys. With `file:line`.
3. **Key data structures** — name → shape (fields/types) → who creates,
   who owns, who mutates, who reads. The ownership answer is the important
   one.
4. **Invariants** — rules that must always hold, and *where* they are
   enforced (validated in one place, or assumed everywhere).
5. **Dependencies out** — modules, libraries, files, external services it
   calls, with the call sites.
6. **Dependencies in** — every caller outside the section, with `file:line`.
   If you cannot list the callers, say so and say how you searched.
7. **Side effects** — filesystem, network, database, process, global state,
   clock, randomness, environment variables. With `file:line`.
8. **Error and edge behaviour** — what happens on missing config, empty
   input, malformed data, dependency failure, double invocation.
9. **Lifecycle and concurrency** — who constructs it, when it is torn down,
   whether it is re-entrant, what happens under concurrent access.
10. **Configuration** — every knob, its default, its source (file, env,
    flag), and whether a change takes effect at runtime or needs a restart.
11. **Extension points** — how a competent developer adds a new X without
    editing the core. Name the file they open first.
12. **Tests** — which test files touch this section, and what they actually
    assert versus what they merely execute.
13. **Surprises** — anything that would mislead a newcomer: misleading
    names, dead parameters, behaviour that only works because of a caller
    elsewhere, TODO and HACK notes, silent fallbacks.
14. **Unknowns** — what you could not determine and what would resolve it.

## Brief template

```text
You are surveying {PROJECT_NAME} at {REPO_PATH}: {ONE_LINE_DESCRIPTION}.
Stack: {STACK}. Current state: {STATE}. Audience for these docs: {AUDIENCE,
e.g. "a contributor who will change this code"}. The user wants {GOAL}.

DO NOT modify any project files. You may run read-only commands. Put any
probe scripts or scratch output under {SCRATCH_DIR}/{SECTION_KEY}/.

YOUR SECTION ({SECTION_NAME}), ID prefix {PREFIX}:
- Read fully: {FILE_LIST}
- Read for promised behaviour: {DOC_LIST}
- Neighbouring sections (for "dependencies in" only — do not analyse them):
  {OTHER_SECTION_FILES}
- Section-to-file map for the whole repo: {LEDGER_PATH}

ANSWER THESE QUESTIONS about this code (these come from the survey, answer
each one with file:line evidence):
- {q1}
- {q2}
- ... 8 to 12 in total ...

Use the anatomy field set below for your write-up: Purpose, Public
surface, Key data structures, Invariants, Dependencies out, Dependencies
in, Side effects, Error and edge behaviour, Lifecycle and concurrency,
Configuration, Extension points, Tests, Surprises, Unknowns. Then apply
the matching layer block in
{SKILL_DIR}/references/anatomy-checklist.md for this kind of code.

EVIDENCE TAGS — every statement gets one:
- verified (read: file:line) — the cited lines say this
- verified (run: command) — you executed something and saw it
- inferred (because ...) — strongly implied, not directly confirmed
- unknown (needs ...) — you could not determine this
Never write an inferred or unknown statement as if it were verified.

Write prose only where prose is the right shape. Prefer tables and lists.

REQUIRED DELIVERABLE: write your full section report as markdown to
{FINDINGS_DIR}/{SECTION_KEY}.md, following the Wave 1 format in
{SKILL_DIR}/references/working-file-format.md. Writing this file is the
task; do it even if your defaults discourage writing report files. Then
reply with five lines max: purpose in one sentence, the two most surprising
things, the three biggest unknowns. Do not paste the report back.
```

## Worked example — event engine section

Context: a Python text-adventure engine whose inventory flagged
`event_manager.py` (281 lines, the second largest file), a YAML directory
of event definitions, and a `SIDE-EFFECT SURFACE` hit on filesystem reads.

```text
ANSWER THESE QUESTIONS:
- event_manager.py is the second largest file in the repo. What state does
  it hold between calls, and is any of it module-level global?
- It loads every *.yaml under text_adventure_tui_lib/events/ (5 files).
  How are those files discovered and ordered? Does filename order decide
  which event fires first when two match?
- The inventory shows a filesystem read in event_manager.py. Does it
  re-read the YAML on every turn, or cache it? Where is the cache
  invalidated?
- What are ALL the trigger types it supports, and where is each one
  evaluated? (docs/architecture.md claims there are nine — verify.)
- What are ALL the action types, and can one action's output feed the next
  action in the same event?
- When an event's actions raise, what happens to the rest of the event and
  to the game loop?
- general_events.yaml is shared across stories while the story event files
  are per-story. What decides precedence, and can a story file shadow a
  general one?
- How would someone add a new trigger type? Which files must change, and
  is there a registry or a hardcoded dispatch chain?
- Are any of the five YAML files unreachable? Is short_story_events.yaml
  referenced by any code path?
```

Note what the questions do: they name files, line-scale suspicions, a
document claim to verify (`docs/architecture.md` says nine trigger types),
a concrete reachability question, and an extension-point question. Each one
forces the surveyor to open code rather than paraphrase a README.

## Common failure modes

- **Paraphrasing the README.** If a sentence could have come from the
  README without opening the file, it is not a finding. Rewrite it with a
  line number or move it to Unknowns.
- **Directory tour.** "This module handles X. It has three classes." —
  useless. Describe the decision logic, the branch order, the state.
- **Fake completeness.** Inventing a caller list. Instead: state the search
  you ran (`grep -rn "load_events" --include=*.py`) and report what it
  returned.
- **Skipping the docs comparison.** Every section names at least one doc
  claim and reports whether the code matches it.
- **Writing "no tests" when tests exist elsewhere.** Search by symbol name,
  not by file name.
