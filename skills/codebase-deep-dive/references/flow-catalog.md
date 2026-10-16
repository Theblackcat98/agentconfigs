# Flow catalog

The flows to trace in Wave 2. Pick 5–9 for deep tier, 3–5 for standard,
1–2 for quick. Pick from the catalog; the point is that the important flows
of a codebase are a known finite set, and a dive that traces none of the
first four is missing the architecture.

## Contents

- [How to choose the flows](#how-to-choose-the-flows)
- [Universal flows](#universal-flows-trace-in-every-repo)
- [CLI and TUI applications](#cli-and-tui-applications)
- [Web backends and services](#web-backends-and-services)
- [Frontends and clients](#frontends-and-clients)
- [Data and persistence](#data-and-persistence)
- [Batch, workers and scheduled jobs](#batch-workers-and-scheduled-jobs)
- [AI and LLM-backed features](#ai-and-llm-backed-features)
- [Libraries and SDKs](#libraries-and-sdks)
- [Build, packaging and release](#build-packaging-and-release)
- [What not to trace](#what-not-to-trace)
- [Diagram conventions](#diagram-conventions)

## How to choose the flows

1. Start with the **universal four** below. They exist in every repo and
   are where surprises hide.
2. Add the block that matches the project's primary interface (CLI, web,
   library, pipeline).
3. Add one flow per **external system** the repo talks to. Each external
   call is a seam where the architecture is decided.
4. Add one flow for the **primary user-visible action**, the thing a user
   does most often.
5. Cap at 9. More flows than that is documentation nobody reads, and the
   marginal flow adds less than verifying the first four.

Name each flow as a question the trace answers: "what happens when the
user presses Save until the file is on disk", not "save".

## Universal flows (trace in every repo)

| Flow | Answers |
|---|---|
| **Startup** | From process launch to first useful output. What is constructed, in what order, what can fail. |
| **Shutdown** | From the quit signal to process exit. What is flushed, what is lost, what hangs. |
| **Configuration** | From defaults to the effective settings. Precedence, validation, where each value is read. |
| **Error path** | One representative failure, traced from where it is raised to what the user sees. The single most informative flow in any codebase. |
| **One full data round trip** | Create or modify one entity and read it back. Shows the whole vertical slice. |

## CLI and TUI applications

- Argument parsing and the first action taken.
- The main loop: one iteration, start to prompt and back.
- One command end to end, including its side effects.
- Interactive input: parsing, validation, the invalid-input branch.
- State persistence: save, load, resume, and what "no save exists" does.
- Rendering: a full frame, from state to screen, including cursor and
  clear-screen behaviour.
- Exit codes and what each one means to a calling script.

## Web backends and services

- One request end to end: routing, middleware, handler, service, data,
  response.
- One authenticated request with the auth middleware in place.
- One validation failure, traced to the error response.
- One unhandled exception, traced to the client's response.
- Database connection lifecycle: first query, pooling, teardown.
- Health check: what the endpoint really verifies.
- Background job enqueue and execution.

## Frontends and clients

- App boot: bundle load, providers, initial data fetch, first paint.
- One user action: event, handler, state update, re-render, server sync.
- One data fetch: request construction, cache lookup, response handling,
  error state.
- Routing: navigation, guards, lazy loading.
- Form submission: validation, submit, server response, error display.
- Logout or session expiry: what is cleared, what is refetched.

## Data and persistence

- Schema creation or migration, from a clean database.
- One write transaction, including what is inside and outside it.
- One read query on the hot path, with the indexes it uses.
- Connection loss and recovery mid-operation.
- Data export or import, with its format version.
- Deletion, and what happens to dependent rows.

## Batch, workers and scheduled jobs

- Job enqueue, pickup, execution, completion.
- Retry and backoff after a failed attempt.
- Job cancellation while running.
- Schedule trigger and the run it produces.
- Partial failure: a batch where item 3 of 100 fails.
- Idempotency: the same job delivered twice.

## AI and LLM-backed features

- Prompt construction: every input, template and variable.
- The request: parameters, model selection, streaming or not.
- Response handling: parsing, validation, retry on malformed output.
- Fallback when the service is unavailable or times out.
- Context assembly: what is included, what is truncated, in what order.
- Cost and token control: limits, caching, batching.
- Guardrails: output filtering, injection surface, refusal handling.

## Libraries and SDKs

- Import time: what a consumer pays when they import the package.
- One public API call, traced to its side effects.
- Error propagation: how a failure in the library surfaces to the caller.
- Configuration of the library by the host application.
- Thread-safety contract in practice: two concurrent calls.
- The compatibility surface: what changed between major versions.

## Build, packaging and release

- Clean checkout to runnable: install, build, first run.
- What the published artifact contains versus what is in the tree.
- Version bump: what changes in code, manifest, lockfile and docs.
- CI pipeline: trigger, steps, gates, artifacts.
- Deploy or install: how a user gets this running.

## What not to trace

- Flows that are pure re-implementations of a library's documented
  behaviour. Trace the call site and the configuration, not the library.
- Every endpoint, command or route. One representative plus the outliers.
- Anything that cannot be observed or cited. If you cannot find the code,
  it is an Unknown, not a flow.
- UI micro-interactions with no architectural consequence.

## Diagram conventions

Use plain ASCII or mermaid. Every node carries a line reference.

```
1. user presses S           src/ui/keys.py:212
2. dispatch to handler      src/ui/menu.py:88   [UI]
3. validate save state      src/core/state.py:44 [CORE]
4. serialise GameState      src/data/store.py:71 [DATA]
5. write temp + rename      src/data/store.py:93 [DATA]
   ^ atomicity boundary
6. refresh inventory        src/ui/menu.py:140 [UI]
7. redraw frame             src/ui/render.py:22 [UI]
```

Rules:

- Show section boundaries on the diagram — they are the architecture.
- Mark every branch and every side effect inline.
- One diagram per flow, on that flow's page. The index page gets a
  one-line summary of each flow and a link.
- No diagram node without a line number. An uncited node is a hypothesis.
- If a hop could not be traced statically (reflection, plugin registry,
  config-driven dispatch), draw it as `?` with a note, not as an arrow.
