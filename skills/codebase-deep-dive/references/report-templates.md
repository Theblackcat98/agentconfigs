# Report templates

Templates for the documents written in Step 6. These go into
`docs/architecture/`. Repo-relative paths only, so links work in a
checkout.

## Contents

- [Choosing the layout](#choosing-the-layout)
- [Index page — ARCHITECTURE.md](#index-page--architecturemd)
- [Module page](#module-page)
- [Flow page](#flow-page)
- [Change map](#change-map)
- [Docs-vs-code table](#docs-vs-code-table)
- [Quality bar](#quality-bar)

## Choosing the layout

- Under ~1,500 lines of source: **one file**, `docs/architecture/ARCHITECTURE.md`,
  with a section per module and a section per flow.
- Larger: `docs/architecture/ARCHITECTURE.md` (index and overview) plus
  `docs/architecture/modules/*.md` and `docs/architecture/flows/*.md`.

Write the index first. If it cannot be written cleanly, the documents are
not yet organised — go back to the working files.

Every page starts with provenance:

```markdown
> Verified against commit `7f349d1` on 2026-10-12 by a deep-tier dive.
> Sections read: 5 of 5 · Flows traced: 7 · Claims: 96 verified, 11 inferred, 8 unknown.
> Not verifiable here: production config, other platforms.
```

That header is what makes the document age honestly. It also tells the
next reader whether to trust a stale page.

## Index page — ARCHITECTURE.md

```markdown
# {Project} architecture

> provenance header (above)

## What this is
Two to four sentences: what the system does, for whom, and the single most
important architectural fact about it.

## How to run it
| Task | Command | Needs |
|---|---|---|
| install | `pip install -e .` | Python 3.10+ |
| run | `text-adventure` | Ollama running locally |
| test | `pytest` | — |
| lint | `flake8 .` | dev extras |

Verified by running them on <date>, or marked not run.

## The map
One diagram of the whole system at section granularity. Node labels are
links to module pages. Mark the external systems on the edge.

```text
story_tool.py (ENTRY)
   │
   ├── game.py (CORE) ──── event_manager.py (CORE) ──── events/*.yaml (CONF)
   │        │                       │
   │        └── game_state_manager.py (CORE) ──── data_structures.py (DATA)
   │
   └── story_manager.py (IO) ──── story_parts/*.yaml (CONF)
```

## Modules
| Section | One line | Files | Page |
|---|---|---|---|
| ENTRY | CLI parsing and the main loop | `story_tool.py` | [modules/entry.md](modules/entry.md) |
| CORE | turn processing and event dispatch | `game.py`, `event_manager.py` | [modules/core.md](modules/core.md) |

## Flows
| Flow | Answers | Sections crossed | Page |
|---|---|---|---|
| Startup | What happens before the first prompt | ENTRY, CORE | [flows/startup.md](flows/startup.md) |
| Turn | What one player action does end to end | UI, CORE, IO, CONF | [flows/turn.md](flows/turn.md) |

## Core concepts
The domain vocabulary a newcomer needs before the module pages make
sense: six to twelve terms, one line each, with where the term is defined
in code.

## Where to change what
The three-to-five most common changes and the files involved. Link to the
full change map if present.

## What is surprising
The five things that will waste a newcomer's time if undocumented, each
with a file:line.

## Docs vs code
The false and obsolete claims table (see below).

## Unknowns
The open questions, what would resolve each, and who could answer.
This is the handoff list for a human. Do not hide it.

## Page index
Links to every module and flow page, with its commit and date.
```

## Module page

```markdown
# {Section name} ({PREFIX})

> provenance header · Verified against commit `7f349d1`

Files: `a.py:1-120`, `b.py:1-80` · Read in full by: surveyor {SECTION_KEY}

## Purpose
One sentence.

## Public surface
| Symbol | Kind | Location | Notes |
|---|---|---|---|

## How it works
The internals, in the order they execute. Short paragraphs plus the
important tables — this is where the detail lives, and where the flow pages
link into.

### Data structures
| Name | Shape | Owner | Mutated by |
|---|---|---|---|

### Rules and invariants
| Rule | Enforced at | Or assumed by |
|---|---|---|

## Dependencies
- **Out:** table of what it calls and where.
- **In:** table of every external caller with `file:line`.

## Side effects
| Effect | Location | Trigger | Reversible |
|---|---|---|---|

## Error behaviour
| Situation | Result | Location |
|---|---|---|

## Configuration
| Knob | Default | Source | Runtime or restart |
|---|---|---|---|

## Extension points
How to add a new X without touching the core. Name the first file to open.

## Tests
| Test file | Asserts | Notes |
|---|---|---|

## Surprises
- {finding} — `file:line` — {evidence tag}

## Unknowns
- {question} — needs {what}
```

## Flow page

```markdown
# Flow: {name}

> provenance header · Traced across sections: {PREFIXES}
Question: {the question this flow answers}

## In one paragraph
What happens, start to finish, in plain language. One paragraph, no
forward references to tables below.

## Trace
| # | Hop | Location | Reads | Writes | External |
|---|---|---|---|---|---|

```text
{diagram with line numbers and section boundaries}
```

## Branches
| Condition | Location | Normal path | Other path |
|---|---|---|---|

## Failure paths
| Failure | Where caught | What the user sees | State left behind |
|---|---|---|---|

## State mutations
| Field | Stored where | Observable by |
|---|---|---|

## To change this
- Change {behaviour}: edit `file:line`
- Change {behaviour}: edit `file:line`
- Add {extension}: `file`

## Unknowns
```

## Change map

Deep tier. The most useful page for a contributor and the one that gets
reused most.

```markdown
# Change map

Where to start for each kind of change. Verify each row still matches the
code before trusting it.

## I want to add a new story
1. `text_adventure_tui_lib/story_parts/<story>_story_arc.yaml` — the arc
   definition; schema in [flows/story-loading.md](flows/story-loading.md)
2. `text_adventure_tui_lib/events/<story>_story_events.yaml` — the events
3. `story_manager.py:STORY_REGISTRY` — register it
4. Nothing else. Tests: `tests/test_game_engine.py` has the pattern to copy.

## I want to add a new event trigger type
1. `event_manager.py:CHECK_TRIGGERS` — the dispatch chain
2. `events/*.yaml` — author events using it
3. `docs/architecture/flows/event-dispatch.md` — update this doc
4. No registry; the chain is hardcoded.

## I want to add a new LLM-backed feature
...

## I want to change the terminal rendering
...

## I want to add persistence
...
```

## Docs-vs-code table

Every project doc that makes a behavioural claim, checked. This table is
how the dive protects the project's own documentation.

```markdown
| Claim | Doc | Code reality | Verdict |
|---|---|---|---|
| "Save is available from any menu" | README.md:88 | Pause menu has no save handler (`src/ui/menu.py:52`) | False |
| "Supports nine trigger types" | docs/architecture.md:31 | Six implemented (`src/event_manager.py:120-190`) | Stale |
| "Requires Python 3.8+" | setup.py:27 | Uses `match` (3.10+) at `src/core/x.py:44` | False |
```

## Quality bar

Before delivering, check every page:

- [ ] Provenance header with commit, date, counts, and limits
- [ ] Every factual statement has an evidence tag; `inferred` is written
      as inference in the prose
- [ ] Every `file:line` exists and says what is claimed
- [ ] Every diagram node has a line number
- [ ] Every table row is filled or explicitly `unknown`
- [ ] Module pages link to the flow pages that pass through them
- [ ] The index summarises; it does not duplicate module detail
- [ ] Unknowns are on the index, not buried on module pages
- [ ] Docs-vs-code table is present
- [ ] No absolute paths, no scratch paths, no machine-specific commands
- [ ] Counts in the summary match the body
- [ ] Nothing in the docs says "simply", "just", or "obviously"
