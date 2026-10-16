---
name: plane
description: Operate the Plane project-management MCP server — create, update, list, and search Plane projects, work items (issues, tasks, epics), cycles, modules, milestones, states, labels, pages, intake, releases, and customers. Use when the user mentions Plane, a work item identifier such as ENG-42, PQL or work item queries, cycle or sprint planning, triaging intake, or asks to file, assign, link, comment on, or report on Plane items.
license: MIT
compatibility: opencode
metadata:
  type: workflow
  version: "1.0"
---

# Plane MCP Server

Drive the Plane MCP server (`plane` namespace — call tools as `tools.plane.workitem({ action: "list", ... })` in Code Mode, or `workitem(action="list", ...)` where MCP tools are exposed directly). There is **one tool per Plane resource, and every tool dispatches on an `action` parameter** — 30 tools, ~200 operations. Do not look for per-operation tools; pick the resource tool and set `action`.

## When to use

Any request involving Plane projects, work items/issues, cycles/sprints, modules, milestones, states, labels, pages, intake/triage, initiatives, releases, customers, estimates, templates, or work logs. Also work item identifiers like `ENG-42` and PQL filtering.

## Tool map

- **Core**: `workitem`, `project`, `cycle`, `module`, `milestone`, `page`, `collection`, `label`, `state`, `member`, `intake`, `initiative`, `template`, `work_log`
- **Work item detail**: `workitem_activity`, `workitem_attachment`, `workitem_comment`, `workitem_link`, `workitem_property`, `workitem_relation`, `workitem_type`
- **Workspace/commercial**: `workspace`, `customer`, `customer_property`, `customer_request`, `release`, `release_label`, `release_tag`, `project_estimate`
- **Query help**: `get_pql_reference`

Per-tool actions, required params, and enum values: [references/tool-catalog.md](references/tool-catalog.md). Read it before unfamiliar calls instead of probing the API by trial.

## Instructions

### 1. Resolve IDs before writing

Writes need UUIDs — names and short identifiers are rejected. Resolve first:

| You have | Resolve via | Then |
|---|---|---|
| Project name or prefix `ENG` | `project list` → match `identifier`/`name` | use `id` as `project_id` |
| Work item `ENG-42` | `workitem retrieve_by_identifier` (`workitem_identifier: "ENG-42"`) | response carries `id` + `project` |
| Person | `member list_workspace` (filter by `email`/`display_name`); `member me` for self | member id |
| State, label, cycle, module, milestone | `<resource> list` with `project_id` | resource UUID |
| Type name (e.g. "Epic") | `workitem_type resolve` (`project_id`, `name`) | type UUID |

Free-text search across the workspace: `workitem search` (`query`). `workitem list`/`count` without `project_id` also span the whole workspace.

### 2. Query with PQL

`workitem list` / `list_archived` / `count` and the `list_workitems` variants accept a `pql` filter. **Call `get_pql_reference` before composing anything beyond a single simple clause** (`detail: "brief"` for the quick reference, `"full"` for operators, functions, mistakes, and worked examples). Documented examples: `priority = "urgent" AND assignee = currentUser()`, `stateGroup IN openStates() AND isOverdue()`, `state__group = "started" AND priority = "urgent"`.

PQL UUID fields (project, assignee, state, label, cycle, module, type, milestone, createdBy) need UUIDs — resolve names first (step 1). `count` takes `group_by`/`sub_group_by` (e.g. `state_id`, `priority`, `assignees__id`); these are grouping keys only, not PQL fields.

### 3. Epics

There are no epic tools — an epic is a work item whose type is named "Epic":

1. `workitem_type resolve` (`project_id`, `name: "Epic"`) → type id.
2. `workitem create` with that `type_id`.
3. Nest children: `workitem create`/`update` with `parent` = the epic's work item UUID.
4. List an epic's children: `workitem list` with `pql: 'parent = "<epic uuid>"'`.

### 4. Update and clear semantics

- Updates change **only the fields you pass**. Omitted fields are untouched.
- To clear: `assignees: []`, `labels: []`, `start_date: null`, `target_date: null` — never pass empty strings.
- `page update` `description_html` **replaces the whole body** — `page retrieve` first when editing part of it.
- `workitem manage_assignee` / `manage_label` **merge** (`add_user_id`/`remove_user_id`, `add_label_id`/`remove_label_id`; removals apply first) — they never replace the list.

### 5. Link-management pattern

`cycle` / `module` / `milestone` / `release` / `initiative` / `customer` `manage_workitems` take `add_ids`/`remove_ids` (or `link_ids`/`unlink_ids`) and **return nothing** — always read back with the same resource's `list_workitems`.

### 6. Ordering rules and gotchas

- A **page must be archived before it can be deleted** (`page archive`, then `page delete`); `page update` refuses locked or archived pages; a page's `parent_id` is fixed at creation.
- Only **completed or cancelled** work items can be archived (`workitem archive`).
- `cycle transfer_workitems` requires the source cycle to have ended — call `cycle complete` first or it is rejected.
- `state` / `workitem_type` / `workitem_property` calls **omit `project_id` for workspace scope**; a workspace-owned type must be linked to a project via `workitem_type import_to_project` (or `resolve`), not created per-project.
- Enums: priority `urgent|high|medium|low|none`; state group `backlog|unstarted|started|completed|cancelled`; module status `backlog|planned|in-progress|paused|completed|cancelled`; intake status `-2` pending, `-1` declined, `0` snoozed (needs `snoozed_till`), `1` accepted, `2` duplicate (needs `duplicate_to`).
- `work_log` duration is in **minutes**. Comments and page bodies are **HTML** (`comment_html`, `description_html`); mentions are `@[<member uuid>]`. Dates are ISO `YYYY-MM-DD`.
- Pagination: list actions take `cursor` + `per_page`; follow the returned cursor for more pages.
- ID-vs-membership: `page detach_from_workitem` and `collection remove_page`/`remove_member` take the **membership id** from the corresponding list action, not the page/user id. `intake` actions take the record's `issue` field as `workitem_id`.

### 7. Report to the user with human identifiers

Results are UUID-heavy. Convert back when reporting: `project list` maps project UUID → prefix, `workitem retrieve_by_identifier` responses carry `ENG-N` style identifiers, `member list_workspace` maps member ids. Present `ENG-42 — Fix login (started, high)` rather than raw UUIDs.

## Examples

Create and route an issue end to end:

```js
// 1. Resolve the project and target state
const projects = await tools.plane.project({ action: "list" });
const proj = projects.find(p => p.identifier === "ENG");          // → id
const states = await tools.plane.state({ action: "list", project_id: proj.id });
const inProgress = states.find(s => s.group === "started");        // → id

// 2. Create and place it in the current cycle
const item = await tools.plane.workitem({
  action: "create", project_id: proj.id, name: "Fix login redirect",
  priority: "high", state: inProgress.id, description_html: "<p>Steps…</p>",
});
const cycles = await tools.plane.cycle({ action: "list", project_id: proj.id, status: "current" });
await tools.plane.cycle({
  action: "manage_workitems", project_id: proj.id,
  cycle_id: cycles[0].id, add_ids: item.id,
});
await tools.plane.cycle({ action: "list_workitems", project_id: proj.id, cycle_id: cycles[0].id }); // read back
```

Standup-style counts:

```js
await tools.plane.get_pql_reference({ detail: "brief" });          // before composing PQL
await tools.plane.workitem({
  action: "count", project_id: proj.id,
  pql: 'stateGroup IN openStates() AND assignee = currentUser()', group_by: "state_id",
});
```

Bulk move unfinished work to the next cycle (order matters — complete first, then transfer):

```js
await tools.plane.cycle({ action: "complete", project_id: proj.id, cycle_id: old.id });
await tools.plane.cycle({ action: "transfer_workitems", project_id: proj.id, cycle_id: old.id, new_cycle_id: next.id });
```
