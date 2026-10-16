# Wave 2 — tracer brief

A tracer answers one question: **what actually happens, in order, when X
occurs?** The trace must cross section boundaries. A trace that stays
inside one module has described a local detail, not a flow.

## Contents

- [Why Wave 2 is separate from Wave 1](#why-wave-2-is-separate-from-wave-1)
- [Brief template](#brief-template)
- [Trace method](#trace-method)
- [Worked example — the save flow](#worked-example--the-save-flow)
- [Rules that keep traces honest](#rules-that-keep-traces-honest)

## Why Wave 2 is separate from Wave 1

Wave 1 surveyors each see one slice and are structurally unable to see
ordering across slices: the surveyor of the UI does not know that the
persistence layer swallows an exception and returns a default that the UI
then treats as success. Only a tracer with the whole section-to-file map
can find that.

So Wave 2 is not a bigger Wave 1. Tracers do not produce anatomy. They
produce ordered sequences with citations.

## Brief template

```text
You are tracing one flow in {PROJECT_NAME} at {REPO_PATH}: {ONE_LINE_DESCRIPTION}.

FLOW: {FLOW_NAME} — {the question it answers, e.g. "what happens from the
user pressing Enter in the main menu until the next prompt appears"}

DO NOT modify any project files. You may run read-only commands and probes.
Scratch output goes under {SCRATCH_DIR}/flows/{FLOW_KEY}/.

The repo was divided into sections. Here is the section-to-file map:
{SECTION_MAP}

You MUST read across section boundaries. Your trace is only useful if it
enters at least two sections. The sections involved are: {PREFIXES}.

Trace it like this:
1. Find the true entry point: the command, route, event or call that
   starts this flow. Not the module that "handles" it — the first line of
   code that runs.
2. Follow it hop by hop until the user-visible outcome. At every hop
   record file:line, what state it reads, what state it writes, and any
   external effect (file, network, process, clock).
3. Record every branch: condition, location, which branch runs in the
   normal case, and what the other branch does.
4. Record every error path: what fails, where it is caught, what the user
   sees, whether the system recovers or is left inconsistent.
5. Record every state mutation: field, storage location, and who else can
   observe it.
6. Answer "to change this flow": name the three files or functions a
   developer would edit for three different behavioural changes.

Evidence tags on everything: verified (read: file:line), verified (run:
command), inferred (because ...), unknown (needs ...).

Follow the Wave 2 format in {SKILL_DIR}/references/working-file-format.md.
Write to {FINDINGS_DIR}/{FLOW_KEY}.md. Writing that file is the task. Then
reply with five lines max: the flow in one sentence, its three most
important hops, its biggest surprise, and its two biggest unknowns.
```

## Trace method

1. **Anchor first.** Find the entry point before reading anything else.
   Grep for user-visible strings, command names, route strings; check the
   CLI argument parser or the router table. Write down the first
   executable line.
2. **Follow the call, not the name.** `load()` may call `refresh()`.
   Grep the callee and read it. A trace based on names alone invents
   steps that do not exist and misses the ones that do.
3. **Watch for the inverted control flow.** Event loops, callbacks,
   middleware, decorators, signal handlers, generators, `await` points and
   exception handlers mean the "next" step is not the next line. Say so
   explicitly: "control returns to the loop at src/x.py:210".
4. **Record the data at each hop.** What is in the payload, what is in
   the state object, what is in the environment. This is what makes the
   trace useful for a change.
5. **Check the boundary hops.** The first hop out of the entry section
   and the last hop back are where architecture actually shows. Spend
   your reading budget there.
6. **Verify one hop by running it.** If the flow is runnable, run it once
   and tag that hop `verified (run)`. One executed hop makes the whole
   trace more credible than twenty read hops.
7. **Note what you could not reach.** Dynamic dispatch, reflection, plugin
   registration, config-driven wiring: if you cannot follow it statically,
   say so in Unknowns rather than guessing.

## Worked example — the save flow

Brief excerpt for a Python game engine:

```text
FLOW: Persisting player progress — "what happens from the player choosing
Save in the menu until the next menu renders, and what is on disk after"

Trace it like this:
- The menu is built in src/ui/menu.py. `save` is the third choice
  (src/ui/menu.py:88-104). Confirm from the code, not from the README,
  which claims save is available from any menu — check the pause menu
  too.
- src/game.py:212 calls story_manager.save_state(...). That call crosses
  into the DATA section. Follow it there.
- story_manager.save_state serialises the GameState dataclass from
  data_structures.py. Determine whether it serialises the whole object or
  an allow-list of fields — the inventory flagged two dataclasses, and
  only one is passed to save.
- Where does it write? The inventory's filesystem-writes probe hit
  story_manager.py. Establish the exact path, whether the directory is
  created if missing, and whether the write is atomic.
- What happens on failure — read-only home directory, disk full, a
  corrupted existing save? Find the except block and record what the user
  is told and whether the in-memory state was already mutated.
- Record every field that changes during this flow, and whether the game
  loop keeps running after it.
```

Note the structure: the brief names the suspected entry line, flags a
documentation claim to check, asks a data-modelling question (whole object
vs allow-list), asks for failure behaviour, and ends with the state-mutation
requirement. Five precise questions produce a page that a new contributor
can act on; "trace the save flow" produces a diagram of three obvious hops.

## Rules that keep traces honest

- **Every hop has a line number.** A hop you cannot cite is either an
  inference (tag it) or something you did not actually read (go read it).
- **Order is the deliverable.** The value of a trace is the sequence and
  the interleaving, not the list of files touched.
- **Do not summarise the code into English too early.** Keep the table
  form; prose loses the interleaving.
- **Include the boring hops.** Config loading, logging, retry, validation
  and cleanup are where behaviour surprises live.
- **No fixes.** If the flow loses data or reports success falsely, record
  it under Surprises with a line number and move on. Remediation belongs to
  a bug hunt.
