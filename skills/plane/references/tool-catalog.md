# Plane MCP Tool Catalog

Per-tool reference for the Plane MCP server (30 tools). Every tool dispatches on `action`. Required parameters are in parentheses after each action; everything else is optional. Updates change only the fields you pass.

**Table of contents**

- [Work items](#work-items) — workitem, workitem_activity, workitem_attachment, workitem_comment, workitem_link, workitem_property, workitem_relation, workitem_type
- [Project structure](#project-structure) — project, project_estimate, cycle, module, milestone, state, label, intake
- [Pages and templates](#pages-and-templates) — page, collection, template
- [People and workspace](#people-and-workspace) — member, workspace, initiative
- [Customers and releases](#customers-and-releases) — customer, customer_property, customer_request, release, release_label, release_tag
- [Time and query](#time-and-query) — work_log, get_pql_reference

## Work items

### workitem

Work items — issues, tasks, epics.

- `list` (—; project_id, pql, order_by, per_page, cursor, expand, fields, external_id/source) — omit project_id to search the whole workspace
- `list_archived` (project_id; same options)
- `retrieve` (project_id, workitem_id)
- `retrieve_by_identifier` (workitem_identifier) — `PROJECT-N`, e.g. ENG-42
- `search` (query)
- `count` (—; project_id, pql, group_by, sub_group_by) — group keys: state_id, state__group, priority, project_id, type_id, labels__id, assignees__id, issue_module__module_id, release_work_items__release_id, cycle_id, milestone_id, created_by, target_date, start_date (grouping keys only, not PQL fields)
- `create` (project_id, name; assignees, labels, type_id, point, description_html, description_stripped, priority, start_date, target_date, sort_order, is_draft, parent, state, estimate_point, external_*)
- `update` (project_id, workitem_id; same fields)
- `delete` (project_id, workitem_id)
- `archive` (project_id, workitem_id; archive) — defaults true; only completed or cancelled items can be archived; `archive: false` unarchives
- `manage_assignee` (project_id, workitem_id; add_user_id, remove_user_id) — merges, removals first
- `manage_label` (project_id, workitem_id; add_label_id, remove_label_id) — merges, removals first

Notes: priority `urgent|high|medium|low|none`. UUID fields (assignees, labels, state, parent, type_id) need UUIDs. `description_stripped` is plain text wrapped into HTML on save; `description_html` wins if both given. Clear with `assignees: []`, `labels: []`, `start_date: null`, `target_date: null`. `fields` is a sparse fieldset — use `project` not project_id, `description_html` not description.

### workitem_activity

- `list` (project_id, workitem_id), `retrieve` (project_id, workitem_id, activity_id)

### workitem_attachment

- `list` (project_id, workitem_id)
- `read` (project_id, workitem_id, attachment_id) — images/text inline; PNG/JPEG/GIF/WEBP ≤5 MB, TXT/MD/CSV/HTML/XML/YAML/JSON ≤1 MB
- `download_url` (project_id, workitem_id, attachment_id)
- `upload_from_url` (project_id, workitem_id, url; name) — server-side fetch; URL must be public, no private addresses
- `delete` (project_id, workitem_id, attachment_id)

### workitem_comment

- `list` / `retrieve` / `create` / `update` / `delete` (project_id, workitem_id[, comment_id])
- create takes `comment_html` (HTML); update also `comment_html`. `access` is `INTERNAL|EXTERNAL`. Mentions are `@[<member uuid>]` — bare @name notifies nobody.

### workitem_link

- `list` / `retrieve` / `create` / `update` / `delete` (project_id, workitem_id[, link_id])
- create/update: `url` must be http(s); `title` is display text.

### workitem_property

Custom properties and options. `list` with no ids lists every workspace property in one call — fast path for PQL.

- `list` (—; project_id, workitem_type_id), `retrieve` (workitem_property_id)
- `create` (display_name, property_type; project_id, workitem_type_id, relation_type, is_required, is_multi, is_active, default_value, options, display_format, external_*)
- `update` (workitem_property_id; same fields)
- `delete` (workitem_property_id)
- `manage_type_properties` (workitem_type_id; project_id, attach_ids, detach_ids) — detach removes association only
- `list_options` (property_id), `retrieve_option` (property_id, option_id), `create_option` (property_id, name; color, is_default, …), `update_option`, `delete_option`
- `get_value` (project_id, workitem_id, property_id)
- `set_value` (project_id, workitem_id, property_id; value or description_html) — upsert; replaces every value for multi-value properties
- `delete_value` (project_id, workitem_id, property_id)

property_type: `TEXT|DATETIME|DECIMAL|BOOLEAN|OPTION|RELATION|URL|EMAIL|FILE|FORMULA|CASCADING`.

### workitem_relation

- `list` (project_id, workitem_id)
- `create` (project_id, workitem_id, workitem_ids; relation_type OR relation_definition_id + relation_definition_label) — built-in relation_type: blocking, blocked_by, start_before, start_after, finish_before, finish_after; custom relations need definition id + matched outward/inward label (sets direction)
- `delete` (project_id, workitem_id, related_workitem_id; is_dependency) — must match the kind created
- `list_definitions` (—; is_default, is_active), `create_definition` (name; outward, inward, is_active, color), `update_definition`, `delete_definition`

### workitem_type

- `list` (—; project_id) — workspace scope when omitted; `retrieve` (workitem_type_id)
- `resolve` (project_id, name) — find-or-create, never duplicates; preferred way to get a type id (e.g. "Epic")
- `create` (name; project_id, description, project_ids, is_active, …), `update`, `delete`
- `import_to_project` (project_id, workitem_type_ids) — the only valid path where the workspace owns the vocabulary

## Project structure

### project

- `list` (—; order_by) — trimmed fields; `retrieve` (project_id) for full detail
- `create` (name, identifier; description, project_lead, default_assignee, emoji, timezone, network 0=secret/2=public, archive_in, close_in, external_*)
- `update` (project_id; name, identifier, project_lead, default_assignee, network, default_state, estimate, is_time_tracking_enabled, …)
- `delete` / `archive` / `unarchive` (project_id)
- `worklog_summary` (project_id)
- `get_features` (project_id) / `update_features` (project_id; modules, cycles, views, pages, intakes, workitem_types, epics, parallel_cycles, project_updates, workflows) — booleans, omitted ones unchanged

`identifier` is the work item prefix (e.g. ENG). project_lead/default_assignee are member ids from `member list_workspace`.

### project_estimate

- `retrieve` (project_id) — at most one estimate per project
- `create` (project_id, name; type `categories|points|time`) — creates estimate only; add values with create_points
- `update` (project_id; name, …), `delete` (project_id), `link` (project_id, estimate_id) — makes it active
- `list_points` (project_id, estimate_id), `create_points` (project_id, estimate_id, points) — points is a JSON array like `[{"value": "1", "key": 0}]`
- `update_point` (…, estimate_point_id; value, key), `delete_point`

To set a work item's estimate: retrieve → list_points → pass point id to `workitem update` as `estimate_point`.

### cycle

- `list` (project_id; archived, status `current|upcoming|completed|draft|incomplete`, order_by)
- `retrieve` (project_id, cycle_id)
- `create` (project_id, name, owned_by; description, start_date, end_date, timezone, external_*)
- `update` (project_id, cycle_id; name, owned_by, …)
- `delete` (project_id, cycle_id)
- `list_workitems` (project_id, cycle_id; pql, order_by, expand, fields)
- `manage_workitems` (project_id, cycle_id; add_ids, remove_ids) — returns nothing
- `transfer_workitems` (project_id, cycle_id, new_cycle_id) — source cycle must have ended; moves only unfinished items; `complete` first
- `complete` (project_id, cycle_id) — sets end_date to today
- `archive` (project_id, cycle_id) — ends the cycle first if running; `unarchive`

### module

- `list` (project_id; archived, order_by), `retrieve`, `create` (project_id, name; description, start_date, target_date, status, lead, members), `update`, `delete`
- `list_workitems` (project_id, module_id; pql, order_by), `manage_workitems` (add_ids, remove_ids — returns nothing)
- `archive` / `unarchive` (project_id, module_id)

status: `backlog|planned|in-progress|paused|completed|cancelled`. lead/members are member ids.

### milestone

- `list` (project_id), `retrieve` (project_id, milestone_id)
- `create` (project_id, title; target_date), `update` (project_id, milestone_id; title, target_date), `delete`
- `list_workitems` (project_id, milestone_id), `manage_workitems` (add_ids, remove_ids — returns nothing)

### state

Workflow states. `group`: `backlog|unstarted|started|completed|cancelled`.

- `list` (—; project_id) — workspace catalogue when omitted; `retrieve` (state_id; project_id)
- `create` (name, color; project_id, description, sequence, group, default) — group required at workspace scope
- `update` (state_id; project_id, name, color, group, sequence, default), `delete` (state_id; project_id)

A project's triage state is Plane-owned: not creatable, not listed; "Triage" is a reserved name. sequence/default apply per project.

### label

- `list` (project_id), `retrieve` (project_id, label_id)
- `create` (project_id, name; color `#EF4444`, description, parent UUID for nesting, sort_order), `update`, `delete`

### intake

Triage queue. `workitem_id` is the record's `issue` field, not the record id.

- `list` (project_id), `retrieve` (project_id, workitem_id)
- `create` (project_id, name; description_html, priority)
- `update` (project_id, workitem_id; status, snoozed_till, duplicate_to, source, source_email) — status: -2 pending, -1 declined, 0 snoozed (needs snoozed_till), 1 accepted, 2 duplicate (needs duplicate_to)
- `delete` (project_id, workitem_id)

## Pages and templates

### page

- `list` (—; project_id) — workspace pages unless project_id given; `retrieve` (page_id; project_id)
- `create` (name, description_html; project_id, parent_id OR collection_id — never both, access, color, is_locked)
- `update` (page_id; name, description_html) — description_html replaces the whole body; retrieve first; locked/archived pages refused
- `archive` (page_id; archive) — archive defaults true, `false` restores
- `delete` (page_id) — requires archived first
- `set_collection` (page_id, collection_id) — files or moves a workspace page
- `list_workitem_pages` (project_id, workitem_id), `attach_to_workitem` (project_id, workitem_id, page_id), `detach_from_workitem` (project_id, workitem_id, workitem_page_id — link id, not page id)

parent_id is fixed at creation; nothing can reparent.

### collection

Groups workspace pages only (not project pages).

- `list`, `retrieve` (collection_id)
- `create` (name; access `public|private`) — access is fixed at creation
- `update` (collection_id; name, sort_order), `delete` (collection_id; archive_pages, default true)
- `list_pages` (collection_id; search), `search_pages` (collection_id; search) — pages not yet in the collection
- `add_pages` (collection_id, page_ids), `remove_page` (collection_id, page_collection_id — membership id, not page id)
- `list_members` (collection_id), `add_member` (collection_id, user_id, member_access), `update_member` (collection_id, collection_member_id, member_access), `remove_member` (collection_member_id)

member_access: `view|comment|edit` (separate scale from access).

### template

- `list` (kind; project_id) — kind `workitem|page|project`
- `create` (kind, name, template_data; project_id, description) — template_data is a JSON object of starting fields
- `update` (kind, template_id; name, description, template_data) — merges template_data
- `delete` (kind, template_id; project_id)

Workitem/page kinds list the wider view without project_id (project + workspace templates, told apart by non-null project).

## People and workspace

### member

- `me` (—) — authenticated user
- `list_workspace` (—; first_name, last_name, email, display_name, role_slug, is_active, is_bot, order_by) — filters combine with AND
- `list_project` (project_id)
- `list_roles` (—; namespace `workspace|project`), `retrieve_role` (role_id)

Role slugs are stable but not globally unique — key on (namespace, slug).

### workspace

- `retrieve` (—) — the connected workspace; id/name known only on OAuth
- `get_features` (—) / `update_features` (—; project_grouping, initiatives, teams, customers, wiki, pi)

Project feature flags live on `project get_features`/`update_features`.

### initiative

- `list` (—) — no pagination; `retrieve` (initiative_id)
- `create` (name; description_html, start_date, end_date, state, lead), `update` (initiative_id; …), `delete`
- `list_projects` (initiative_id), `add_projects` / `remove_projects` (initiative_id, project_ids) — return nothing
- `list_workitems` (initiative_id), `manage_workitems` (add_ids, remove_ids; removals first) — returns nothing

state: `DRAFT|PLANNED|ACTIVE|COMPLETED|CLOSED`. Any work item type can link to an initiative.

## Customers and releases

### customer

- `list` (—; query), `retrieve` (customer_id)
- `create` (name; …) — upsert: matches on external_source + external_id, else on name; never duplicates
- `update` (customer_id; …) — only passed fields change
- `delete` (—; customer_id OR external_source + external_id)
- `list_workitems` (customer_id; customer_request_id, search), `manage_workitems` (customer_id; link_ids, unlink_ids, customer_request_id) — returns nothing

`domain` is industry; website goes in website_url. stage: lead…closed_won/closed_lost; contract_status: active/pre_contract/signed/inactive (free-form stored, others not displayed). revenue is annual, as string.

### customer_property

- `list`, `retrieve` (property_id)
- `create` (display_name, property_type; relation_type, options, display_format, is_multi, …) — display_name unique in workspace
- `update` (property_id; …), `delete` (property_id)
- `get_values` (customer_id; property_id) — omit property_id for all
- `set_values` (customer_id, values) — JSON object of property id → list of strings, e.g. `{"<id>": ["Enterprise"]}`; replaces named properties' values only

property_type: `TEXT|DATETIME|DECIMAL|BOOLEAN|OPTION|RELATION|URL|EMAIL|FILE`. relation_type (RELATION): `ISSUE|USER`. display_format required by TEXT and DATETIME.

### customer_request

- `list` (customer_id; query), `retrieve` (customer_id, request_id)
- `create` (customer_id, name; description_html, link, workitem_ids) — workitem_ids settable only here
- `update` (customer_id, request_id; name, description_html, link), `delete`

workitem_ids is never echoed back — read links via `customer list_workitems`.

### release

- `list`, `retrieve` (release_id)
- `create` (name; description_html, status `unreleased|released|cancelled`, release_date, target_date, tag_id, lead_id, is_prerelease)
- `update` (release_id; …), `delete` (release_id)
- `get_changelog` (release_id) — always exists (created empty with the release); `update_changelog` (release_id; description_html or description_stripped)
- `list_workitems` (release_id), `manage_workitems` (add_ids, remove_ids) — returns nothing

release_date is what the UI calls "Target date"; target_date is a separate hidden date.

### release_label

- `list` (—; release_id) — workspace palette unless release_id; `create` (name; color, sort_order); `update` (label_id; …); `delete` (label_id) — removes from palette for everyone
- `attach` / `detach` (release_id, label_ids) — return nothing; detach leaves the palette intact

### release_tag

- `list`, `retrieve` (tag_id)
- `create` (version; description, commit_hash, git_tag) — version like "v1.2.0"; `update` (tag_id; …), `delete`

Tag id is what `release create` takes as tag_id.

## Time and query

### work_log

- `list` (project_id, workitem_id)
- `create` (project_id, workitem_id, duration; description) — duration in minutes
- `update` (project_id, workitem_id, work_log_id; duration, description)
- `delete` (project_id, workitem_id, work_log_id)

### get_pql_reference

- `read` (—; detail `brief|full`, default full) — call before composing pql filters for workitem list/list_archived/count and list_workitems variants. Brief = field/operator quick reference; full = operators, functions, common mistakes, worked examples.
