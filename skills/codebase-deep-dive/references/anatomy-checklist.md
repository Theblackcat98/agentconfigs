# Anatomy checklist by layer type

Use this after reading a section's files. It is the specialist question set
for the kind of code in that section — the questions that separate "I read
the file" from "I understand how this kind of thing works".

Pick the block that matches the section. Ask everything in it. The
"Surprises" list per block is the highest-value part: those are the things
that waste a newcomer's first week.

---

## Entry point, CLI, main loop (ENTRY)

Determine
- The exact first line of user code that runs, and what runs before it.
- The argument parser: every flag, its type, its default, whether unknown
  flags are rejected or ignored, whether a missing value is caught.
- The order of operations at startup: config read, logging set up,
  dependencies constructed, migrations, warm-up, first render.
- The loop: what makes it iterate, what terminates it, whether it is a
  `while True`, an event loop, a thread join, or recursion.
- Shutdown: signals handled, resources released, temp files cleaned, exit
  code, what happens on Ctrl-C mid-write.
- Re-entrancy: can the loop be entered twice; can a handler fire while
  another is running.

Surprises
- A framework that swallows startup errors and prints nothing.
- A flag that is parsed but never read.
- A `while True` whose only exit is an exception, with no handler.
- Cleanup registered in a place that does not run on the error path.
- Global or module-level state that survives between loop iterations.

---

## Service, daemon, worker (SVC)

Determine
- Who starts it: systemd unit, container entrypoint, supervisor, test
  harness. Find the unit file and read it.
- The concurrency model: threads, processes, async tasks, one worker per
  core, a single-threaded event loop. How many, and who owns them.
- The queue or input source: bounded or unbounded, what blocks when full,
  backpressure behaviour.
- Health and readiness endpoints or signals, and what each actually
  checks.
- Graceful stop: drain, in-flight handling, timeout, forced kill.
- Resource limits: memory, file descriptors, connections, per-tenant
  limits.

Surprises
- A thread pool that grows per request.
- A queue with no bound and a producer that never blocks.
- Health checks that pass while the worker is wedged.
- Signals handled but the handler only sets a flag nobody reads.
- Work submitted after shutdown started.

---

## HTTP API, web backend (API)

Determine
- The router table: every route, method, path, and handler.
- The middleware chain, in the real order it executes, and what each adds
  or strips (auth, logging, CORS, body parsing, rate limiting).
- Request parsing and validation: where, what happens on malformed input,
  who owns the schema.
- Authentication and authorisation per route, including the routes that
  are deliberately public.
- The response shape for success, not-found, validation error and
  unexpected error, and whether they are distinguishable by a client.
- Pagination, filtering, sorting: defaults, maximums, what happens past
  the maximum.
- Idempotency and retry semantics for non-GET routes.
- Where the business logic sits relative to the handler.

Surprises
- A route registered twice, the second silently winning.
- Auth applied in a handler rather than middleware, so a new route is
  public by default.
- Validation that happens after the write.
- Error responses that leak internals, or 200 with an error body.
- Handlers that call the database directly, bypassing the service layer.

---

## User interface (UI)

Determine
- The rendering model: immediate, retained, virtual DOM, template,
  redraw-on-event, full redraw per frame.
- What triggers a render, and whether renders coalesce or throttle.
- The input path: raw key, parsed command, form submit, event; where it
  enters the program and how it reaches business logic.
- The state the UI holds versus the state the domain holds, and which
  wins when they disagree.
- Long lists and pagination: what is loaded, when, and what a stale view
  shows.
- Error display: where errors surface, whether they are actionable, and
  whether the UI can get out of a bad state.
- Accessibility and terminal constraints: colour, width, unicode, no-colour
  fallback.

Surprises
- A `setTimeout` or `threading.Timer` with no cancellation.
- Work started from a render function.
- UI state that outlives the data it describes.
- Strings from users or files rendered without escaping.
- A full state rebuild on every keystroke.

---

## Data, persistence (DATA)

Determine
- The schema: entities, fields, types, nullability, keys, indexes,
  constraints, and where they are declared.
- Migrations: how they are applied, tracked, ordered, and rolled back;
  whether the app refuses to start on a version mismatch.
- The transaction boundary: what is committed atomically, what is not.
- Connection lifecycle: pool size, checkout, timeouts, what happens when
  the database is unreachable at startup versus mid-request.
- Read and write paths for each entity: which queries run on the hot path,
  N+1 patterns, missing indexes that matter.
- Serialisation: schema versioning, backward compatibility, what happens
  to old files written by an older version.
- Deletion semantics: soft delete, cascading, orphaned rows.

Surprises
- A field the code writes but the schema does not have.
- Migrations applied by importing a module, so they run on every start.
- Write-then-read on different connections without a transaction.
- A query with no bound, sized by user input.
- A datetime stored in local time and compared to UTC.

---

## External services and AI/LLM integrations (EXT)

Determine
- Every outbound call: endpoint, authentication, timeouts at every stage,
  retries, backoff, and what happens when the call fails.
- The request contract: prompt or payload template, parameters, token or
  size limits, streaming or not.
- The response contract: what is parsed, what happens to unexpected or
  truncated output, whether malformed output is retried.
- Cost and rate control: caching, batching, per-user quotas, max tokens.
- Fallbacks: what the system does when the service is unavailable, and
  whether the user can tell.
- Determinism: where randomness enters, whether a seed exists, what a
  replay produces.
- Secrets: where the key comes from, whether it is logged, what happens
  when it is absent.

Surprises
- A default model name pointing at a local endpoint.
- No timeout on a network call in the main loop.
- JSON parsed out of prose without a fence or a repair path.
- A cache keyed on something that does not include the model version.
- The same prompt sent twice because a retry does not know it already ran.

---

## Plugin and extension system (PLUG)

Determine
- The registration mechanism: decorator, entry point, file scan, config
  list, runtime registration.
- The contract each extension must satisfy, and where it is enforced.
- Load order and whether it is deterministic.
- Isolation: can an extension reach global state, the database, the
  network; is there any sandbox.
- Version compatibility between host and extensions.
- What happens when an extension fails to load, or throws at runtime.
- The documented way to add one, and whether it actually works.

Surprises
- Registration by string name with no validation until runtime.
- Plugins that must not exist but load anyway.
- An extension point advertised in the README that no code implements.
- Load order determined by filesystem order.

---

## Shared library, SDK, package (LIB)

Determine
- The public API surface: what is exported, what is private by
  convention, what is deprecated.
- The stability promise: semver, changelog, migration notes.
- Dependency policy: runtime versus optional, version bounds, whether
  extras exist.
- Entry points per ecosystem (Python `__init__`, npm `exports`, Go
  package path), and whether importing has side effects.
- Error contract: exception types, error values, whether errors are
  wrapped or discarded.
- Thread safety and re-entrancy guarantees, stated or implied.
- Packaging: what ships in the wheel or tarball, what does not, and
  whether the published artifact matches this tree.

Surprises
- `__init__.py` that imports submodules, so importing is expensive.
- A private helper used by the public API.
- Mutable default arguments or shared module state.
- A documented function that does not exist.

---

## Configuration and secrets (CONF)

Determine
- Every configuration source, in precedence order, and the code that
  implements that order.
- Defaults, and which defaults are safe in production.
- Where config is validated, and what happens on an unknown or malformed
  key.
- Whether config is read once at startup or per call, and whether a change
  takes effect without a restart.
- Content files that behave like code: YAML, JSON, templates, rule
  tables, prompt files. Their schema, their load order, and their
  precedence over defaults.
- Secrets: sources, precedence, logging, and whether they appear in error
  messages or process listings.

Surprises
- An env var read in one module but defaulted in another.
- A config key present in the docs but ignored by the loader.
- Two files that must stay in sync and nothing enforces it.
- A YAML file that duplicates a constant defined in code.

---

## Tests, fixtures, CI, packaging (TOOL)

Determine
- The real test command, and what the config actually includes or
  excludes.
- What the tests assert versus what they merely execute: a test that calls
  a function and checks nothing proves only that it does not raise.
- Fixtures, factories, mocks: what is faked, and whether the fake diverges
  from the real implementation in a way that hides behaviour.
- Which source files no test touches, and which critical path has no test.
- Flakiness sources: time, randomness, ordering, network, sleep, shared
  state, parallelism.
- CI: the matrix, the version pins, the gates (lint, types, coverage),
  the caches, and what a red build actually blocks.
- Packaging: how a user installs, what the artifact contains, and whether
  the published version matches the tree.

Surprises
- A green suite where the main entry point has no test.
- A skipped test with no reason.
- A mock whose method signature has drifted from the real class.
- Coverage configured but not enforced, or enforced on a subset.
- CI running on a different Python or Node version than the docs claim.

---

## Concurrency and background work (CONC)

Determine
- Every thread, task, process and timer created, and who owns its
  lifetime.
- The lock or queue protecting each piece of shared mutable state, and
  whether the same state is touched from two places without one.
- Cancellation: how work is stopped, whether it can finish after
  cancellation, whether the result is discarded or applied.
- Ordering guarantees: what is FIFO, what is not, what is undefined.
- What happens on shutdown with work in flight.
- Blocking calls inside async code, and async calls inside blocking code.

Surprises
- A lock acquired in one path and not another.
- A timer that fires after the object it touches is destroyed.
- An unbounded task list with no backpressure.
- Shared state mutated from a callback without synchronisation.
- A `global` statement in a function called from two threads.

---

## Monorepo and multi-package (MONO)

Determine
- The packages, their manifests, and the dependency direction between
  them (which may import which).
- Version pinning across packages: fixed, ranged, or floating.
- What is released together, and what is released independently.
- Shared configuration: where lint, types and build settings live and how
  they propagate.
- The workspace tooling and its commands.
- Duplicate code across packages that exists because of the packaging
  boundary.

Surprises
- A cycle in the package dependency graph, broken by an import inside a
  function.
- Two versions of the same library in one lockfile.
- A package that cannot be built alone.

---

## Scripts, codegen, tooling (SCRIPT)

Determine
- What each script does, what invokes it, and whether it is still current.
- Whether generated output is committed, and how it is regenerated.
- Whether the script is idempotent, and what happens when it is run twice.
- Assumptions it makes about the environment.
- Secrets and destructive operations.

Surprises
- A script that is the real build, with the manifest pointing elsewhere.
- Committed generated files that no current script produces.
- A script that only works from the repository root.

---

## How to use this file

1. Read the section's files first. This checklist is a lens, not a
   substitute for reading.
2. Ask every question in the matching block. Record `unknown` where the
   answer is not in the code.
3. Copy the "Surprises" items into the section's Surprises field only if
   you actually confirmed them in this codebase.
4. Two or more blocks often apply (a CLI that talks to a database). Apply
   both; the overlap is where the interesting behaviour lives.
