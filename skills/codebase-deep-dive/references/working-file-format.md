# Working-file format

Every Wave 1, Wave 2 and Wave 3 agent writes one markdown file to
`<SCRATCH>/…`. These files are working material: they carry the full
evidence, the probes, the dead ends and the unknowns. The documents in
`docs/architecture/` are written from them, never copied from them.

They stay in scratch after the run, and the delivery message says where
they are, because they hold evidence the final docs only summarise.

## Evidence tags

Every factual statement carries exactly one tag. This is the mechanism
that keeps a generated architecture document trustworthy as it ages.

| Tag | Means | Requires |
|---|---|---|
| `verified (read: src/x.py:120-134)` | you opened those lines and they say this | the line range |
| `verified (run: pytest -k event -x → 12 passed)` | you executed it and observed the result | the command and the outcome |
| `inferred (because the only caller passes no value)` | strongly implied, not directly confirmed | the reasoning |
| `unknown (needs production DB access)` | not determined | what would resolve it |

Rules:

- An `inferred` claim in a published document is rendered with the word
  "appears to" or "likely", never as fact.
- An `unknown` is never dropped. It moves to the document's Unknowns
  section.
- Never mix: `verified (read: src/x.py)` without a line number is not
  verification, it is an assertion.

## Wave 1 — section working file

Path: `<SCRATCH>/sections/<section_key>.md`

```markdown
# {Project}: {section name}

Prefix: {PREFIX} · Commit: {sha} · Depth: {tier}
Scope: {files read fully, with line counts}
Method: {read / grep / probes run, and what they returned}
Limits: {what could not be determined in this section}

## Purpose
One sentence.

## Public surface
| Symbol / flag / route / event | Kind | Location | Notes |
|---|---|---|---|

## Key data structures
### {Name}
Shape: {fields and types}. Created by {file:line}. Owned by {…}.
Mutated by {…}. Read by {…}. Lifetime {…}.

## Invariants
| Rule | Enforced where | Or merely assumed by |
|---|---|---|

## Dependencies out
| Target | Called at | Why |
|---|---|---|

## Dependencies in
| Caller | Location | What it expects |
|---|---|---|

## Side effects
| Effect | Location | Trigger condition | Reversible? |
|---|---|---|---|

## Error and edge behaviour
| Situation | What happens | Location |
|---|---|---|

## Lifecycle and concurrency
{Construction, teardown, re-entrancy, concurrent access, locking.}

## Configuration
| Knob | Default | Source | Runtime or restart |
|---|---|---|---|

## Extension points
{To add X: open this file, implement this interface, register here.
Include the first file a developer would edit.}

## Tests
| Test file | What it actually asserts | Coverage notes |
|---|---|---|

## Surprises
- {thing that would mislead a newcomer} — {file:line} — {evidence tag}

## Docs vs code
| Doc claim | Doc location | Code reality | Verdict |
|---|---|---|---|

## Unknowns
- {question} — needs {what} to resolve
```

## Wave 2 — flow working file

Path: `<SCRATCH>/flows/<flow_key>.md`

```markdown
# {Project}: flow — {flow name}

Prefix: FLOW-{N} · Sections touched: {LIST of prefixes}
Question it answers: {the user-facing question}

## Trigger
{What starts this flow: a CLI command, an HTTP route, a timer, a user
action. file:line}

## Hop-by-hop trace
| # | Hop | Location | State read | State written | External effect |
|---|---|---|---|---|---|
| 1 | {what happens} | src/x.py:42-60 | {…} | {…} | {…} |

## Diagram
```text
{ASCII or mermaid; every node carries a file:line}
```

## Decision branches
| Condition | Location | Branch taken | Consequence |
|---|---|---|---|

## Error branches
| Failure | Location | Surfaced as | Recovery |
|---|---|---|---|

## State mutations
{Every field that changed, where it is stored, and whether it is
observable elsewhere.}

## To change this flow
- To change {behaviour A}: edit {file:line}
- To change {behaviour B}: edit {file:line}
- To add {extension point}: {file}
{Three concrete entries, not general advice.}

## Unknowns
```

## Wave 3 — verification working file

Path: `<SCRATCH>/verify/<skeptic_key>.md`

```markdown
# Verification: {scope}

## Claims re-checked
| Claim | Source file:line | Verdict | Note |
|---|---|---|---|

## Contradictions
| Topic | Account A (source) | Account B (source) | Which the code supports |
|---|---|---|---|

## Coverage gaps
| File in ledger | Covered by | Action needed |
|---|---|---|

## Doc claims that are false
| Claim | Doc location | Code reality |
|---|---|---|

## Bad citations
| Citation | Problem |
|---|---|
```

## Conventions

- Section and flow files use the section/flow ID prefixes, so a claim in
  the final document can be traced back to the exact working file.
- Keep dead ends. "Tried X, it did not apply because Y" saves the next
  person an hour.
- One file per agent. Never have two agents write the same file.
- No absolute paths in the prose of published documents — use repo-relative
  paths so links work in a checkout.
