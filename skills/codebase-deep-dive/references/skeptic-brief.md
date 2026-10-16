# Wave 3 — skeptic brief

Skeptics do not write architecture. They attack it. A generated
architecture document is only as good as its least-checked claim, so deep
tier spends a full wave trying to break what Waves 1 and 2 produced.

Dispatch 2–4 skeptics in parallel, each with a different angle (below).
They are cheap relative to the document they protect.

## Contents

- [Dispatch plan](#dispatch-plan)
- [Brief template](#brief-template)
- [Verification probes](#verification-probes)
- [How to resolve a contradiction](#how-to-resolve-a-contradiction)
- [What the orchestrator does with the results](#what-the-orchestrator-does-with-the-results)

## Dispatch plan

| Skeptic | Angle | Checks |
|---|---|---|
| **S1 Citation** | the evidence itself | 15–25 random claims, `file:line` opened and compared |
| **S2 Consistency** | the reports against each other | contradictory accounts of one mechanism, naming drift, contradictory counts |
| **S3 Coverage** | the ledger against reality | files never opened, sections that produced no traceable claims, empty fields |
| **S4 Docs** | the project's own promises | every README/doc claim checked against the code |

Give each skeptic the full set of working files, the ledger, and the
repo path. They must not read each other's output before finishing —
independent passes catch more.

## Brief template

```text
You are verifying an architecture survey of {PROJECT_NAME} at {REPO_PATH}.

The survey produced section reports and flow traces in {FINDINGS_DIR}/.
The file-to-section coverage ledger is at {LEDGER_PATH}. The project's own
docs are listed in the ledger and under {DOC_DIR}/.

You are the {SKEPTIC_ANGLE} skeptic. Your job is to find what is WRONG,
INCOMPLETE or UNSUPPORTED in the survey. Do not repair it. Do not write
architecture documentation.

DO NOT modify any project files.

DO THIS:
1. {ANGLE_SPECIFIC_TASKS}
2. For every claim you check, open the cited lines. A citation that does
   not exist, or exists but says something else, is a finding.
3. Do not accept a claim because it sounds right. Accept it only when the
   cited lines support it, or when you reproduced it.
4. Sample randomly. Do not check only the claims you suspect.

Report per the Wave 3 format in
{SKILL_DIR}/references/working-file-format.md, writing to
{FINDINGS_DIR}/{SKEPTIC_KEY}.md. Writing that file is the task. Then reply
with five lines max: how many claims you re-checked, how many failed, and
the single worst problem you found.
```

Angle-specific tasks:

- **S1 Citation** — draw 15–25 claims at random from every section and
  flow file. Open each cited location. Record verdict `supported`,
  `partly supported`, `unsupported`, or `citation wrong`. Prefer claims
  tagged `verified (run)` — if a claim says a command was run, check
  whether running it actually gives that result.
- **S2 Consistency** — pick the 5 most important mechanisms (the main
  loop, the main data store, the error strategy, state ownership, the
  extension mechanism). Read every account of each across the section
  files. Report disagreements verbatim with their sources. Also flag
  naming drift: the same component called three different things.
- **S3 Coverage** — walk the ledger. For every file, find which working
  file actually opens it. List files no report covers, sections whose
  fields are mostly `unknown`, and fields that were filled with restated
  README text instead of evidence. Report the coverage percentage.
- **S4 Docs** — take every behavioural claim in the README, CONTRIBUTING,
  DEVELOPER_GUIDE and any architecture or design docs. Check each against
  the code. Produce the false/obsolete claims table. Also report doc
  sections that no code implements (promises with no implementation).

## Verification probes

Cheap, high-yield checks. Use them instead of re-reading whole modules.

```bash
# Does the cited line exist and contain what is claimed?
sed -n '120,134p' src/x.py

# Who actually calls this symbol? (callers-in claims)
grep -rn "load_events" --include='*.py' . | grep -v node_modules

# Is this function ever called from outside its own file?
grep -rn "def save_state" --include='*.py' .
grep -rn "save_state(" --include='*.py' . | grep -v "def save_state"

# Does the doc claim about the count of X hold?
grep -rn "elif trigger ==" src/event_manager.py | wc -l
grep -rn "^  - trigger:" events/*.yaml | sort -u | wc -l

# Is this config key / flag / route actually read anywhere?
grep -rn "TURN_LIMIT" --include='*.py' .

# Is this file reachable at all?
grep -rn "short_story_events" --include='*.py' --include='*.yaml' .

# Do the tests exercise the production path or a mock?
grep -rn "mock\|MagicMock\|patch(" tests/ | head

# What does the project's own test runner actually do?
grep -rn "addopts\|testpaths\|python_files" pyproject.toml pytest.ini setup.cfg
```

Each probe is one grep. A skeptic that runs 20 of these covers more ground
than an auditor that re-reads a module.

## How to resolve a contradiction

When two reports disagree about the same mechanism, you resolve it against
the code, in this order:

1. **Run it.** If the flow is runnable, the runtime answer wins over both
   readings.
2. **Open both cited locations.** One of them may be citing a dead path, a
   comment, or a line that moved since the repo was written.
3. **Find the caller.** Disagreements about what a function does are often
   disagreements about which caller you are looking at. Check every call
   site; the function may behave differently per caller.
4. **Check the version.** If the claims were written at different commits,
   both may be true at different times. Note the commit.
5. **If still unresolved**, the document says the mechanism is **contested**
   and states both readings with their evidence. Never average two
   accounts into a middle sentence nobody wrote.

## What the orchestrator does with the results

- **Failed citations** — fix the claim or drop it. A claim with no working
  citation never reaches the document.
- **Contradictions** — resolve per the order above; record the resolution
  and both sources.
- **Coverage gaps** — assign the missing files to a new surveyor
  (quick tier) or note them in Unknowns (deep tier with no time left).
  Never leave a gap silent.
- **False doc claims** — they go in the document's Docs-vs-code table,
  even when the docs are the project's most-read files.
- **Empty fields** — a section whose fields are mostly `unknown` is
  reported honestly as "not understood", not padded with inference.
