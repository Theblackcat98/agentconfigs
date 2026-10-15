#!/usr/bin/env node
// regenerate-holdings.mjs
//
// Walks the repository and produces holdings.json from the real files.
// Run with `node scripts/refresh-holdings.mjs` whenever you add or
// remove a skill, agent, command, rule, or hook.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([".git", "node_modules", "candidates", ".opencode", ".github"]);
const SKIP_FILES = new Set([".DS_Store", "Thumbs.db"]);
const toPosix = (p) => p.split(sep).join("/");

function safeList(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => !name.startsWith(".") || name === ".opencode" && false);
}

function walk(dir, baseDir, out) {
  for (const ent of readdirSync(dir)) {
    if (ent.startsWith(".") || SKIP_FILES.has(ent)) continue;
    const p = join(dir, ent);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (SKIP_DIRS.has(ent)) continue;
      walk(p, baseDir, out);
    } else {
      out.push(toPosix(relative(baseDir, p)));
    }
  }
  return out;
}

function readMeta(filePath) {
  const text = readFileSync(filePath, "utf8");
  if (!text.startsWith("---")) return { meta: {}, text };
  const end = text.indexOf("\n---", 3);
  if (end < 0) return { meta: {}, text };
  const fm = text.slice(3, end).trim();
  const meta = {};
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z_][\w-]*):\s*(.+?)\s*$/);
    if (m) meta[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return { meta, text };
}

function firstSentence(text) {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith("#")) continue;
    if (t.startsWith("---")) continue;
    if (t.startsWith("```")) continue;
    return t.replace(/[`*_]/g, "").replace(/\s+/g, " ");
  }
  return "";
}

function describe(filePath, fallback) {
  const { meta, text } = readMeta(filePath);
  if (meta.description) return meta.description;
  const s = firstSentence(text);
  return s || fallback;
}

function originFor(kind) {
  switch (kind) {
    case "Skill": return "Repo template";
    case "Plugin": return "Bundle";
    case "Command": return "Workflow prompt";
    case "Agent": return "Subagent persona";
    case "Rule": return "House rules";
    case "Hook": return "Harness guardrail";
    default: return "Personal setup";
  }
}

const out = [];

// Skills: one entry per folder under ./skills that contains SKILL.md.
const skillsDir = join(ROOT, "skills");
for (const name of safeList(skillsDir)) {
  const dir = join(skillsDir, name);
  if (!statSync(dir).isDirectory()) continue;
  const skillMd = join(dir, "SKILL.md");
  if (!existsSync(skillMd)) continue;
  const rest = walk(dir, dir, []).filter(f => f !== "SKILL.md").sort();
  const files = ["SKILL.md", ...rest];
  out.push({
    kind: "Skill",
    name,
    folder: "skills",
    path: `skills/${name}/`,
    origin: originFor("Skill"),
    description: describe(skillMd, `Skill folder: ${name}`),
    files
  });
}

// Plugins: one entry per folder under ./plugins, optionally with a plugin.json manifest.
// A plugin bundles any mix of skills/, agents/, commands/, rules/, hooks/ inside itself.
const pluginsDir = join(ROOT, "plugins");
for (const name of safeList(pluginsDir)) {
  const dir = join(pluginsDir, name);
  if (!statSync(dir).isDirectory()) continue;
  const rest = walk(dir, dir, []).filter(f => f !== "plugin.json").sort();
  const files = ["plugin.json", ...rest];
  let description = "";
  const manifestPath = join(dir, "plugin.json");
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      description = typeof manifest.description === "string" ? manifest.description : "";
    } catch (err) {
      console.warn(`plugins/${name}/plugin.json is not valid JSON: ${err.message}`);
    }
  }
  if (!description) {
    const readmePath = join(dir, "README.md");
    if (existsSync(readmePath)) description = firstSentence(readFileSync(readmePath, "utf8"));
  }
  out.push({
    kind: "Plugin",
    name,
    folder: "plugins",
    path: `plugins/${name}/`,
    origin: originFor("Plugin"),
    description: description || `Plugin bundle: ${name}`,
    files
  });
}

// Single-file holdings: commands, agents, rules, hooks.
const singleFile = [
  { kind: "Command", folder: "commands", ext: ".md" },
  { kind: "Agent", folder: "agents", ext: ".md" },
  { kind: "Rule", folder: "rules", ext: ".md" },
  { kind: "Hook", folder: "hooks", ext: ".sh" },
];
for (const { kind, folder, ext } of singleFile) {
  const dir = join(ROOT, folder);
  if (!existsSync(dir)) continue;
  for (const fname of readdirSync(dir)) {
    if (!fname.endsWith(ext)) continue;
    if (fname.startsWith(".")) continue;
    const filePath = join(dir, fname);
    if (!statSync(filePath).isFile()) continue;
    const holdingName = fname.replace(/\.[^.]+$/, "");
    out.push({
      kind,
      name: holdingName,
      folder,
      path: `${folder}/${fname}`,
      origin: originFor(kind),
      description: describe(filePath, `${kind}: ${holdingName}`),
      files: [fname]
    });
  }
}

out.sort((a, b) => {
  if (a.kind !== b.kind) {
    const order = ["Skill", "Plugin", "Command", "Agent", "Rule", "Hook"];
    return order.indexOf(a.kind) - order.indexOf(b.kind);
  }
  return a.name.localeCompare(b.name);
});

const dest = join(ROOT, "holdings.json");
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote ${out.length} holdings to ${toPosix(relative(ROOT, dest))}`);
