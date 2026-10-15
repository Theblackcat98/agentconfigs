# IDEA.md — what this project is for

## The intention

agentconfigs is a personal, growing collection of configurations for coding agents. It keeps one
developer's working setup in one place, kept as plain files and meant to be shared: the skills an
agent loads, the subagents it can call, the prompts it reads. The project exists because a coding
agent is only as good as what you configure it with, and those configurations are small,
plain-text files — worth keeping, comparing and sharing, not worth packaging.

## What it stores

Three kinds of cargo, all plain text:

- **Skills** — a folder with a `SKILL.md` and its support files, loaded on demand when a task
  matches the description. This is the primary thing the project stores and showcases.
- **Plugins** — folders that bundle any mix of the other cargo (e.g. a skill plus a hook and a
  command) into one takeable unit, described by a `plugin.json` manifest.
- **Agent configs** — small markdown files that give a subagent a job and a mode (read/write,
  toolset, scope).
- **Agent prompts** — the house rules (`./rules/AGENTS.md`) read at the start of a session, the
  reusable slash-command prompts (`./commands/*.md`), and the lifecycle hooks (`./hooks/*.sh`)
  that act as deterministic guardrails.

The project is mostly storage. A website sits on top of it to share cargo I have personally
used and vetted. It is not a marketplace, and listing a skill here is not a claim that I wrote
it.

## How it is stored

The cargo lives in this project's own folders, not inside any agent's config directory, because
this repository is for storage and showcase rather than for use. Nothing here is installed into an
agent harness, and nothing runs in the background. Storage itself has no build step for the
content: every skill is a folder of plain files meant to be read before they are taken. The
landing page does ship one checked-in file, `holdings.json`, which a small generator script
(`scripts/refresh-holdings.mjs`) rebuilds from the folder tree at any time. (Any "no install"
preference is a personal rule and is not part of this project.)

## Who it is for

Developers who run coding agents — in any harness — and prefer reading a file over installing a
package.

## Current state

- A working landing page (`./index.html`) that fetches `holdings.json` and renders every skill,
  command, agent, rule, and hook with a live preview, a copy/curl extraction recipe, and a
  filterable catalogue.
- Five placeholder residents — one per cargo kind — to show the wiring end-to-end. They can be
  replaced by real residents at any time by deleting the placeholder, dropping in the new folder
  or file, and re-running the generator.