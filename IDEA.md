# IDEA.md — what this project is for

## The intention

agentconfigs is a personal, growing collection of configurations for coding agents. It keeps one
developer's working setup in one place, kept as plain files and meant to be shared: the skills an
agent loads, the subagents it can call, the prompts it reads. The project exists because a coding
agent is only as good as what you configure it with, and those configurations are small,
plain-text files — worth keeping, comparing and sharing, not worth packaging.

## What it stores

Three kinds of cargo, all plain text (skills are folders with support files):

- **Skills** — a folder with a `SKILL.md` and its support files, loaded on demand when a task
  matches the description. This is the primary thing the project stores and showcases.
- **Agent configs** — small markdown files that give a subagent a job and a mode.
- **Agent prompts** — the house rules and command prompts read at the start of a session.

The project is mostly storage. A website sits on top of it to share skills I have personally
used and vetted. It is not a marketplace, and listing a skill here is not a claim that I wrote
it.

## How it is stored

The skills live in this project's own folders, not inside any agent's config directory, because
this repository is for storage and showcase rather than for use. Nothing here is installed into an
agent harness, and nothing runs in the background. Storage itself has no build step: every skill
is a folder of plain files meant to be read before they are taken. (Any "no install" preference
is a personal rule and is not part of this project.)

## Who it is for

Developers who run coding agents — in any harness — and prefer reading a file over installing a
package.

## Current state

- One resident: `design-taste-frontend` (tasteskill v2, MIT), stored by copy — the same way
  everything in this collection is meant to be taken.
- A landing page to present the collection: what it holds, how to take one, and a working copy
  of the copy ritual itself. (Not yet built.)